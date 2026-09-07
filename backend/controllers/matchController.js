const Match = require('../models/Match');
const User = require('../models/User');
const { AppError } = require('../middlewares/authMiddleware');
const { CreateMatchSchema, CheckInSchema } = require('../validators/schemas');
const { sendMatchNotification } = require('../services/mailerService');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { sendNotification } = require('../utils/webPush');
async function recalculateUserStats() {
  const users = await User.find({ isActive: true }).select('_id name').lean();
  const matches = await Match.find({ status: 'completed' }).select('checkInList motm scorers concededGoals').lean();

  const statsByUserId = new Map();
  for (const user of users) {
    statsByUserId.set(String(user._id), { goals: 0, assists: 0, motm: 0, appearances: 0, mistakes: 0 });
  }
  const userIdByName = new Map();
  for (const user of users) {
    userIdByName.set(user.name, String(user._id));
  }

  for (const match of matches) {
    // Appearances (one pass over checkInList per match, not per user)
    for (const c of match.checkInList || []) {
      if (c.status === 'joined') {
        const stats = statsByUserId.get(String(c.userId));
        if (stats) stats.appearances++;
      }
    }

    // MOTM
    if (match.motm) {
      const motmUserId = userIdByName.get(match.motm);
      if (motmUserId && statsByUserId.has(motmUserId)) {
        statsByUserId.get(motmUserId).motm++;
      }
    }

    // Goals & Assists
    for (const s of match.scorers || []) {
      const scorerId = userIdByName.get(s.playerName);
      if (scorerId && statsByUserId.has(scorerId)) statsByUserId.get(scorerId).goals += (s.count || 1);
      const assisterId = userIdByName.get(s.assisterName);
      if (assisterId && statsByUserId.has(assisterId)) statsByUserId.get(assisterId).assists += (s.count || 1);
    }

    // Mistakes leading to conceded goals
    for (const cg of match.concededGoals || []) {
      if (cg.errorType === 'khong_loi') continue;
      let mUserId = cg.userId ? String(cg.userId) : null;
      if (!mUserId && cg.playerName) {
        mUserId = userIdByName.get(cg.playerName);
      }
      if (mUserId && statsByUserId.has(mUserId)) {
        statsByUserId.get(mUserId).mistakes++;
      }
    }
  }

  const bulkOps = users.map(user => ({
    updateOne: {
      filter: { _id: user._id },
      update: { $set: { stats: statsByUserId.get(String(user._id)) } }
    }
  }));

  if (bulkOps.length > 0) {
    await User.bulkWrite(bulkOps);
  }
}

async function createMatch(req, res, next) {
  try {
    const validation = CreateMatchSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError('VALIDATION_ERROR', 'Dữ liệu trận đấu không hợp lệ', 400, validation.error.issues);
    }

    const activeUsers = await User.find({ isActive: true });
    const checkInList = activeUsers.map(user => ({
      userId: user._id,
      status: 'pending',
      reason: ''
    }));

    const newMatch = await Match.create({
      ...validation.data,
      checkInList,
      createdBy: req.user._id
    });

    // Removed automatic email notification, will be sent manually

    res.status(201).json({
      success: true,
      data: newMatch
    });
  } catch (err) {
    next(err);
  }
}

async function getMatches(req, res, next) {
  try {
    const { status } = req.query;
    const filter = { status: { $ne: 'deleted' } };
    if (status) filter.status = status;

    const sortOrder = (status === 'completed' || status === 'cancelled')
      ? { date: -1, time: -1 }
      : { date: 1, time: 1 };

    const matches = await Match.find(filter)
      .sort(sortOrder)
      .populate('checkInList.userId', 'name email avatar position number phone')
      .populate('lineup.starters.userId', 'name avatar number position')
      .populate('lineup.substitutes', 'name avatar number position')
      .populate('internalTeams.teamA.players', 'name avatar number position phone stats')
      .populate('internalTeams.teamB.players', 'name avatar number position phone stats')
      .populate('internalTeams.teamA.starters.userId', 'name avatar number position')
      .populate('internalTeams.teamB.starters.userId', 'name avatar number position')
      .lean();

    const formatted = matches.map(match => {
      const summary = { joined: 0, uncertain: 0, absent: 0, pending: 0 };
      (match.checkInList || []).forEach(item => {
        if (summary[item.status] !== undefined) {
          summary[item.status]++;
        }
      });

      // Find current user's checkin status
      const userCheckIn = (match.checkInList || []).find(
        item => item.userId?._id?.toString() === req.user._id.toString() ||
                item.userId?.toString() === req.user._id.toString()
      );

      return {
        ...match,
        checkInSummary: summary,
        userCheckInStatus: userCheckIn ? userCheckIn.status : 'pending',
        userCheckInReason: userCheckIn ? userCheckIn.reason : ''
      };
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
}

async function getForceCheckInMatch(req, res, next) {
  try {
    const upcomingMatches = await Match.find({ status: 'upcoming' })
      .sort({ date: 1, time: 1 })
      .populate('checkInList.userId', 'name email avatar')
      .lean();

    const pendingMatch = upcomingMatches.find(match => {
      const userEntry = (match.checkInList || []).find(
        item => (item.userId?._id?.toString() || item.userId?.toString()) === req.user._id.toString()
      );
      return userEntry && userEntry.status === 'pending';
    });

    if (!pendingMatch) {
      return res.json({
        success: true,
        data: null
      });
    }

    const summary = { joined: 0, uncertain: 0, absent: 0, pending: 0 };
    (pendingMatch.checkInList || []).forEach(item => {
      if (summary[item.status] !== undefined) summary[item.status]++;
    });

    res.json({
      success: true,
      data: {
        ...pendingMatch,
        checkInSummary: summary
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateCheckIn(req, res, next) {
  try {
    const { id } = req.params;
    const validation = CheckInSchema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError('VALIDATION_ERROR', 'Dữ liệu check-in không hợp lệ', 400, validation.error.issues);
    }

    const { status, reason } = validation.data;

    // Enforce required reason for 'uncertain' and 'absent'
    if ((status === 'uncertain' || status === 'absent') && (!reason || !reason.trim())) {
      throw new AppError('VALIDATION_ERROR', `Trạng thái ${status === 'uncertain' ? 'chưa chắc chắn' : 'báo vắng mặt'} bắt buộc phải nhập lý do`, 400);
    }

    const match = await Match.findById(id);

    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    if (match.status === 'completed' || match.status === 'cancelled') {
      throw new AppError('CONFLICT', 'Trận đấu này đã kết thúc hoặc bị hủy, không thể check-in', 409);
    }

    const checkInItem = match.checkInList.find(
      item => item.userId.toString() === req.user._id.toString()
    );

    if (checkInItem) {
      checkInItem.status = status;
      checkInItem.reason = reason ? reason.trim() : '';
      checkInItem.updatedAt = new Date();
    } else {
      match.checkInList.push({
        userId: req.user._id,
        status,
        reason: reason ? reason.trim() : '',
        updatedAt: new Date()
      });
    }

    await match.save();

    res.json({
      success: true,
      data: match
    });
  } catch (err) {
    next(err);
  }
}

// ✏️ UPDATE MATCH DETAILS (Admin)
async function updateMatch(req, res, next) {
  try {
    const { id } = req.params;
    const { date, time, stadium, stadiumLink, pitchCost, deal, kitColor, opponent, status, notes, matchType, internalTeams } = req.body;

    const match = await Match.findById(id);
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu cần sửa', 404);
    }

    if (matchType) match.matchType = matchType;
    if (internalTeams) match.internalTeams = { ...match.internalTeams, ...internalTeams };
    if (date) match.date = date;
    if (time) match.time = time;
    if (stadium) match.stadium = stadium;
    if (stadiumLink !== undefined) match.stadiumLink = stadiumLink;
    if (pitchCost !== undefined) match.pitchCost = Number(pitchCost);
    if (deal) match.deal = deal;
    if (kitColor !== undefined) match.kitColor = kitColor;
    if (opponent) match.opponent = { ...match.opponent, ...opponent };
    if (status) match.status = status;
    if (notes !== undefined) match.notes = notes;

    await match.save();

    res.json({
      success: true,
      data: match
    });
  } catch (err) {
    next(err);
  }
}

// 🏆 HELPER: CALCULATE MVP WINNER & TIE-BREAKER
async function calculateMatchMvp(match, options = {}) {
  const { sendAnnouncement = false } = options;

  if (!match.populated('checkInList.userId')) {
    await match.populate('checkInList.userId', 'name email avatar position');
  }

  const joinedItems = (match.checkInList || []).filter(c => c.status === 'joined' && c.userId);
  if (joinedItems.length === 0) {
    match.isMvpFinalized = true;
    match.isMvpVotingOpen = false;
    await match.save();
    return null;
  }

  // 1. Tally votes per candidate
  const voteCounts = {};
  joinedItems.forEach(item => {
    const uid = (item.userId._id || item.userId).toString();
    voteCounts[uid] = 0;
  });

  (match.mvpVotes || []).forEach(vote => {
    const cid = vote.candidateId?.toString();
    if (voteCounts[cid] !== undefined) {
      voteCounts[cid]++;
    }
  });

  // Find max vote count
  let maxVotes = -1;
  Object.values(voteCounts).forEach(v => {
    if (v > maxVotes) maxVotes = v;
  });

  const topCandidates = joinedItems.filter(item => {
    const uid = (item.userId._id || item.userId).toString();
    return voteCounts[uid] === maxVotes;
  });

  let winnerItem = null;
  let motmReason = '';

  if (topCandidates.length === 1) {
    winnerItem = topCandidates[0];
    motmReason = `Đa số phiếu bầu (${maxVotes} phiếu)`;
  } else if (topCandidates.length > 1) {
    // Tie-breaker 1: Goals + Assists from match.scorers
    const contribMap = {};
    topCandidates.forEach(item => {
      const uName = item.userId.name?.trim().toLowerCase();
      let goals = 0;
      let assists = 0;
      (match.scorers || []).forEach(s => {
        if (s.playerName?.trim().toLowerCase() === uName) {
          goals += Number(s.count) || 1;
        }
        if (s.assisterName?.trim().toLowerCase() === uName) {
          assists += Number(s.count) || 1;
        }
      });
      const uid = (item.userId._id || item.userId).toString();
      contribMap[uid] = goals + assists;
    });

    let maxContrib = -1;
    topCandidates.forEach(item => {
      const uid = (item.userId._id || item.userId).toString();
      const c = contribMap[uid];
      if (c > maxContrib) maxContrib = c;
    });

    const topByContrib = topCandidates.filter(item => {
      const uid = (item.userId._id || item.userId).toString();
      return contribMap[uid] === maxContrib;
    });

    if (topByContrib.length === 1 && maxContrib > 0) {
      winnerItem = topByContrib[0];
      motmReason = `Hòa phiếu (${maxVotes} phiếu), ưu tiên G+A (${maxContrib} bàn + kiến tạo)`;
    } else {
      // Tie-breaker 2: Random among top tied candidates!
      const randomIndex = Math.floor(Math.random() * topByContrib.length);
      winnerItem = topByContrib[randomIndex];
      motmReason = `Hòa phiếu (${maxVotes} phiếu)${maxContrib > 0 ? ` & G+A (${maxContrib})` : ''}, phân định bằng Random May Mắn 🎲`;
    }
  }

  if (winnerItem && winnerItem.userId) {
    match.motm = winnerItem.userId.name;
    match.motmReason = motmReason;
    match.isMvpFinalized = true;
    match.isMvpVotingOpen = false;
    await match.save();

    // Recalculate stats for all users
    await recalculateUserStats();

    // Send MVP Announcement Notification (in-app & web push) ONLY when admin triggers finalization
    if (sendAnnouncement) {
      try {
        const title = '🎉 Vinh danh MVP Trận Đấu!';
        const message = `Chúc mừng ${winnerItem.userId.name} đã trở thành Cầu thủ xuất sắc nhất (MVP) trận ngày ${match.date}! (${motmReason})`;
        const link = '/matches';

        await Notification.create({
          recipient: null,
          title,
          message,
          type: 'match',
          link
        });

        const subscriptions = await PushSubscription.find();
        const pushPayload = { title, body: message, url: link, type: 'match' };
        subscriptions.forEach(async (sub) => {
          try {
            await sendNotification(sub.subscription, pushPayload);
          } catch (err) {
            if (err.message === 'SubscriptionExpired') {
              await PushSubscription.findByIdAndDelete(sub._id);
            }
          }
        });
      } catch (pushErr) {
        console.error('Failed to send MVP push notification:', pushErr);
      }
    }
  }

  return winnerItem;
}

// ⚽ UPDATE MATCH RESULT & GOAL SCORERS (Admin)
async function updateMatchResult(req, res, next) {
  try {
    const { id } = req.params;
    const { homeScore, awayScore, scorers, concededGoals, status } = req.body;

    const match = await Match.findById(id);
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu để cập nhật kết quả', 404);
    }

    match.score = {
      homeScore: Number(homeScore) || 0,
      awayScore: Number(awayScore) || 0
    };

    if (Array.isArray(scorers)) {
      match.scorers = scorers.map(s => ({
        playerName: s.playerName,
        assisterName: s.assisterName || '',
        minute: s.minute || '',
        count: Number(s.count) || 1
      }));
    }

    if (Array.isArray(concededGoals)) {
      match.concededGoals = concededGoals.map(cg => ({
        playerName: cg.playerName || '',
        userId: cg.userId || null,
        errorType: cg.errorType || 'mat_bong',
        minute: cg.minute || '',
        note: cg.note || ''
      }));
    }

    if (req.body.motm !== undefined) {
      match.motm = req.body.motm;
    }

    const newStatus = status || 'completed';
    match.status = newStatus;

    if (newStatus === 'completed') {
      if (!match.isMvpFinalized && !match.motm) {
        match.isMvpVotingOpen = true;
      }

      // Dispatch Result & MVP Vote Notification if not notified yet
      if (!match.resultNotified) {
        try {
          const title = '⚽ Kết quả trận đấu & Bình chọn MVP!';
          const message = `Trận đấu ngày ${match.date} đã kết thúc (${match.score.homeScore} - ${match.score.awayScore}). Hãy vào App để bình chọn MVP trận đấu ngay nhé!`;
          const link = '/matches';

          await Notification.create({
            recipient: null,
            title,
            message,
            type: 'match',
            link
          });

          const subscriptions = await PushSubscription.find();
          const pushPayload = { title, body: message, url: link, type: 'match' };
          subscriptions.forEach(async (sub) => {
            try {
              await sendNotification(sub.subscription, pushPayload);
            } catch (err) {
              if (err.message === 'SubscriptionExpired') {
                await PushSubscription.findByIdAndDelete(sub._id);
              }
            }
          });

          match.resultNotified = true;
        } catch (notifErr) {
          console.error('Error dispatching result notification:', notifErr);
        }
      }
    }

    await match.save();

    // Recalculate stats for all users
    await recalculateUserStats();

    res.json({
      success: true,
      data: match
    });
  } catch (err) {
    next(err);
  }
}

// 🗑️ DELETE MATCH (Admin)
async function deleteMatch(req, res, next) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu để xóa', 404);
    }

    match.status = 'deleted';
    await match.save();

    // Recalculate stats since a match was removed
    await recalculateUserStats();

    res.json({
      success: true,
      data: { id }
    });
  } catch (err) {
    next(err);
  }
}

async function cloneMatch(req, res, next) {
  try {
    const { id } = req.params;
    const original = await Match.findById(id);

    if (!original) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu gốc để sao chép', 404);
    }

    const activeUsers = await User.find({ isActive: true });
    const checkInList = activeUsers.map(user => ({
      userId: user._id,
      status: 'pending',
      reason: ''
    }));

    const cloned = await Match.create({
      date: req.body.date || original.date,
      time: req.body.time || original.time,
      stadium: original.stadium,
      stadiumLink: original.stadiumLink,
      pitchCost: original.pitchCost,
      deal: original.deal,
      kitColor: original.kitColor,
      opponent: original.opponent,
      status: 'upcoming',
      notes: `[Tạo từ trận ${original.date}] ${original.notes}`,
      checkInList,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: cloned
    });
  } catch (err) {
    next(err);
  }
}

async function notifyMatch(req, res, next) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);

    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    if (match.isNotified) {
      throw new AppError('CONFLICT', 'Trận đấu này đã được gửi thông báo trước đó rồi!', 409);
    }

    const activeUsers = await User.find({ isActive: true });
    
    // Fire and forget email
    sendMatchNotification(activeUsers, match).catch(err => {
      console.error('Non-blocking mail error:', err.message);
    });

    const isInternal = match.matchType === 'internal';
    const teamAName = match.internalTeams?.teamA?.name || 'Đội A';
    const teamBName = match.internalTeams?.teamB?.name || 'Đội B';
    const oppOrTeams = isInternal ? `${teamAName} vs ${teamBName}` : (match.opponent?.teamName || match.opponent?.name || 'Đối thủ');

    // Create in-app notification
    const title = isInternal ? '⚔️ Trận giao lưu nội bộ mới!' : 'Trận bóng mới sắp diễn ra!';
    const message = `Trận đấu ${oppOrTeams} vào lúc ${match.time} ngày ${match.date} tại ${match.stadium}. Hãy vào điểm danh nhé!`;
    const link = `/matches`;
    
    await Notification.create({
      recipient: null, // all users
      title,
      message,
      type: 'match',
      link
    });

    // Send Push Notification
    const subscriptions = await PushSubscription.find();
    const pushPayload = { title, body: message, url: link, type: 'match' };
    
    subscriptions.forEach(async (sub) => {
      try {
        await sendNotification(sub.subscription, pushPayload);
      } catch (error) {
        if (error.message === 'SubscriptionExpired') {
          await PushSubscription.findByIdAndDelete(sub._id);
        }
      }
    });

    match.isNotified = true;
    await match.save();

    res.json({
      success: true,
      data: match
    });
  } catch (err) {
    next(err);
  }
}

async function notifyMatchPush(req, res, next) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);

    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    const isInternal = match.matchType === 'internal';
    const teamAName = match.internalTeams?.teamA?.name || 'Đội A';
    const teamBName = match.internalTeams?.teamB?.name || 'Đội B';
    const oppOrTeams = isInternal ? `${teamAName} vs ${teamBName}` : (match.opponent?.teamName || 'Đối thủ');

    // Create in-app notification
    const title = isInternal ? '⚔️ Nhắc nhở: Trận giao lưu nội bộ sắp tới!' : 'Nhắc nhở: Trận bóng sắp diễn ra!';
    const message = `Trận đấu ${oppOrTeams} vào lúc ${match.time} ngày ${match.date} tại ${match.stadium}. Hãy nhanh tay vào điểm danh nhé!`;
    const link = `/matches`;
    
    await Notification.create({
      recipient: null, // all users
      title,
      message,
      type: 'match',
      link
    });

    // Send Push Notification
    const subscriptions = await PushSubscription.find();
    const pushPayload = { title, body: message, url: link, type: 'match' };
    
    subscriptions.forEach(async (sub) => {
      try {
        await sendNotification(sub.subscription, pushPayload);
      } catch (error) {
        if (error.message === 'SubscriptionExpired') {
          await PushSubscription.findByIdAndDelete(sub._id);
        }
      }
    });

    res.json({
      success: true,
      message: 'Đã gửi push notification thành công.'
    });
  } catch (err) {
    next(err);
  }
}

// 🗳️ GET PENDING FORCE MVP VOTE MATCH
async function getForceMvpVoteMatch(req, res, next) {
  try {
    const userId = req.user._id.toString();

    // Find completed matches where voting is open and NOT finalized
    const matches = await Match.find({
      status: 'completed',
      isMvpVotingOpen: true,
      isMvpFinalized: { $ne: true },
      motm: { $in: [null, ''] },
      'checkInList': {
        $elemMatch: {
          userId: req.user._id,
          status: 'joined'
        }
      }
    })
      .sort({ date: -1 })
      .populate('checkInList.userId', 'name email avatar position')
      .populate('mvpVotes.voterId', 'name avatar')
      .populate('mvpVotes.candidateId', 'name avatar')
      .lean();

    // Find the latest completed match where user hasn't voted yet
    const pendingMatch = matches.find(match => {
      const hasVoted = (match.mvpVotes || []).some(
        v => (v.voterId?._id?.toString() || v.voterId?.toString()) === userId
      );
      return !hasVoted;
    });

    if (!pendingMatch) {
      return res.json({
        success: true,
        data: null
      });
    }

    // Filter joined members (eligible candidates)
    const joinedCandidates = (pendingMatch.checkInList || [])
      .filter(item => item.status === 'joined' && item.userId)
      .map(item => ({
        _id: item.userId._id,
        name: item.userId.name,
        avatar: item.userId.avatar,
        position: item.userId.position
      }));

    // Calculate current live votes tally
    const voteCounts = {};
    joinedCandidates.forEach(c => {
      voteCounts[c._id.toString()] = 0;
    });

    (pendingMatch.mvpVotes || []).forEach(v => {
      const cid = (v.candidateId?._id || v.candidateId)?.toString();
      if (voteCounts[cid] !== undefined) {
        voteCounts[cid]++;
      }
    });

    const totalVotes = pendingMatch.mvpVotes?.length || 0;
    const totalJoined = joinedCandidates.length;

    const candidatesWithStats = joinedCandidates.map(c => {
      const votes = voteCounts[c._id.toString()] || 0;
      const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
      
      return {
        ...c,
        voteCount: votes,
        votePercentage: pct
      };
    });

    res.json({
      success: true,
      data: {
        _id: pendingMatch._id,
        date: pendingMatch.date,
        time: pendingMatch.time,
        stadium: pendingMatch.stadium,
        score: pendingMatch.score,
        totalVotes,
        totalJoined,
        candidates: candidatesWithStats
      }
    });
  } catch (err) {
    next(err);
  }
}

// 🗳️ SUBMIT MVP VOTE
async function voteMvp(req, res, next) {
  try {
    const { id } = req.params;
    const { candidateId } = req.body;

    if (!candidateId) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn cầu thủ bạn muốn bình chọn MVP', 400);
    }

    const match = await Match.findById(id);
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    if (match.status !== 'completed') {
      throw new AppError('CONFLICT', 'Trận đấu chưa kết thúc, không thể bình chọn MVP', 409);
    }

    // Do not allow voting if admin has finalized MVP or voting is closed
    if (match.isMvpFinalized || !match.isMvpVotingOpen || match.motm) {
      throw new AppError('CONFLICT', 'Admin đã chốt kết quả MVP cho trận đấu này, không thể bình chọn thêm nữa', 409);
    }

    const userIdStr = req.user._id.toString();

    // Check if voter joined this match
    const voterCheckIn = match.checkInList.find(
      c => c.userId.toString() === userIdStr && c.status === 'joined'
    );
    if (!voterCheckIn) {
      throw new AppError('FORBIDDEN', 'Chỉ những thành viên tham gia trận đấu này mới được quyền bình chọn MVP', 403);
    }

    // Check if candidate joined this match
    const candidateCheckIn = match.checkInList.find(
      c => c.userId.toString() === candidateId.toString() && c.status === 'joined'
    );
    if (!candidateCheckIn) {
      throw new AppError('VALIDATION_ERROR', 'Cầu thủ được chọn không nằm trong danh sách tham gia trận đấu', 400);
    }

    // Check if already voted
    const existingVote = match.mvpVotes.find(
      v => v.voterId.toString() === userIdStr
    );
    if (existingVote) {
      throw new AppError('CONFLICT', 'Bạn đã bình chọn MVP cho trận đấu này rồi', 409);
    }

    match.mvpVotes.push({
      voterId: req.user._id,
      candidateId: candidateId,
      votedAt: new Date()
    });

    // Voting only records the vote; ONLY Admin chốt MVP can finalize and trigger the announcement notification
    await match.save();

    const joinedCount = match.checkInList.filter(c => c.status === 'joined').length;

    res.json({
      success: true,
      message: 'Bình chọn MVP thành công! Đang chờ Admin chốt kết quả.',
      data: {
        isFinalized: false,
        motm: match.motm || null,
        motmReason: match.motmReason || '',
        totalVotes: match.mvpVotes.length,
        totalJoined: joinedCount
      }
    });
  } catch (err) {
    next(err);
  }
}

// 👑 ADMIN: FINALIZE MVP MANUALLY
async function finalizeMvp(req, res, next) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    if (match.isMvpFinalized) {
      throw new AppError('CONFLICT', 'Trận đấu này đã được chốt kết quả MVP rồi', 409);
    }

    // Only sending notification when admin clicks Chốt MVP!
    const winner = await calculateMatchMvp(match, { sendAnnouncement: true });

    match.isMvpFinalized = true;
    match.isMvpVotingOpen = false;
    await match.save();

    res.json({
      success: true,
      message: 'Đã chốt kết quả MVP trận đấu thành công!',
      data: {
        motm: match.motm,
        motmReason: match.motmReason,
        isMvpFinalized: match.isMvpFinalized,
        winner
      }
    });
  } catch (err) {
    next(err);
  }
}

// 📊 GET DETAILED MVP STATS FOR A MATCH
async function getMatchMvpStats(req, res, next) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id)
      .populate('checkInList.userId', 'name email avatar position')
      .populate('mvpVotes.voterId', 'name avatar')
      .populate('mvpVotes.candidateId', 'name avatar')
      .lean();

    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    const joinedCandidates = (match.checkInList || [])
      .filter(item => item.status === 'joined' && item.userId)
      .map(item => ({
        _id: item.userId._id,
        name: item.userId.name,
        avatar: item.userId.avatar,
        position: item.userId.position
      }));

    const voteCounts = {};
    const voterMap = {};
    joinedCandidates.forEach(c => {
      voteCounts[c._id.toString()] = 0;
      voterMap[c._id.toString()] = [];
    });

    (match.mvpVotes || []).forEach(v => {
      const cid = (v.candidateId?._id || v.candidateId)?.toString();
      if (voteCounts[cid] !== undefined) {
        voteCounts[cid]++;
        if (v.voterId) {
          voterMap[cid].push({
            _id: v.voterId._id || v.voterId,
            name: v.voterId.name,
            avatar: v.voterId.avatar
          });
        }
      }
    });

    const totalVotes = match.mvpVotes?.length || 0;
    const totalJoined = joinedCandidates.length;

    const candidatesWithStats = joinedCandidates.map(c => {
      const votes = voteCounts[c._id.toString()] || 0;
      const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
      
      let goals = 0;
      let assists = 0;
      (match.scorers || []).forEach(s => {
        if (s.playerName?.trim().toLowerCase() === c.name?.trim().toLowerCase()) {
          goals += Number(s.count) || 1;
        }
        if (s.assisterName?.trim().toLowerCase() === c.name?.trim().toLowerCase()) {
          assists += Number(s.count) || 1;
        }
      });

      return {
        ...c,
        voteCount: votes,
        votePercentage: pct,
        voters: voterMap[c._id.toString()] || [],
        goals,
        assists,
        isWinner: match.motm && match.motm.trim().toLowerCase() === c.name?.trim().toLowerCase()
      };
    });

    const userVote = (match.mvpVotes || []).find(
      v => (v.voterId?._id || v.voterId)?.toString() === req.user._id.toString()
    );

    const isFinalized = Boolean(match.isMvpFinalized || match.motm);

    res.json({
      success: true,
      data: {
        matchId: match._id,
        date: match.date,
        time: match.time,
        stadium: match.stadium,
        score: match.score,
        motm: match.motm,
        motmReason: match.motmReason,
        isMvpVotingOpen: match.isMvpVotingOpen && !isFinalized,
        isMvpFinalized: isFinalized,
        isFinalized: isFinalized,
        totalVotes,
        totalJoined,
        hasUserVoted: !!userVote,
        userVotedCandidateId: userVote?.candidateId?._id || userVote?.candidateId || null,
        candidates: candidatesWithStats
      }
    });
  } catch (err) {
    next(err);
  }
}

// 📋 GET MATCH LINEUP & AVAILABLE PLAYERS
async function getMatchLineup(req, res, next) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id)
      .populate('checkInList.userId', 'name avatar number position phone')
      .populate('lineup.starters.userId', 'name avatar number position')
      .populate('lineup.substitutes', 'name avatar number position')
      .lean();

    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    const allUsers = await User.find({ isActive: true })
      .select('name avatar number position phone')
      .lean();

    res.json({
      success: true,
      data: {
        matchId: match._id,
        date: match.date,
        time: match.time,
        stadium: match.stadium,
        opponent: match.opponent,
        kitColor: match.kitColor,
        status: match.status,
        checkInList: match.checkInList || [],
        lineup: match.lineup || {
          formation: '3-2-1',
          starters: [],
          substitutes: [],
          tacticsNote: '',
          isPublished: false
        },
        allUsers
      }
    });
  } catch (err) {
    next(err);
  }
}

// 📋 UPDATE MATCH LINEUP
async function updateMatchLineup(req, res, next) {
  try {
    const { id } = req.params;
    const { formation, starters, substitutes, tacticsNote, isPublished, sendPush } = req.body;

    const match = await Match.findById(id);
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    const shouldPublish = isPublished !== undefined ? isPublished : true;
    const currentPublishedAt = match.lineup?.publishedAt;

    match.lineup = {
      formation: formation || '3-2-1',
      starters: (starters || []).map(s => ({
        positionKey: s.positionKey,
        positionName: s.positionName || '',
        x: Number(s.x) || 50,
        y: Number(s.y) || 50,
        userId: s.userId ? (s.userId._id || s.userId) : null,
        isCaptain: !!s.isCaptain
      })),
      substitutes: (substitutes || []).map(sub => sub?._id || sub).filter(Boolean),
      tacticsNote: tacticsNote || '',
      isPublished: shouldPublish,
      publishedAt: shouldPublish ? (currentPublishedAt || new Date()) : currentPublishedAt
    };

    await match.save();

    // Populate for response
    await match.populate('lineup.starters.userId', 'name avatar number position');
    await match.populate('lineup.substitutes', 'name avatar number position');

    // If sendPush is true, notify members with status 'joined' or 'uncertain'
    if (sendPush) {
      const targetCheckIns = (match.checkInList || []).filter(
        item => item.status === 'joined' || item.status === 'uncertain'
      );
      const targetUserIds = targetCheckIns.map(item => (item.userId?._id || item.userId)?.toString()).filter(Boolean);

      const title = '📋 Đội hình ra sân đã được công bố!';
      const opponentName = match.opponent?.teamName || 'Đối thủ';
      const message = `Đội hình trận gặp ${opponentName} (${match.time} ngày ${match.date}) đã có. Xem ngay sơ đồ chiến thuật!`;
      const link = `/matches`;

      if (targetUserIds.length > 0) {
        // In-app notifications
        const notiDocs = targetUserIds.map(uid => ({
          recipient: uid,
          title,
          message,
          type: 'match',
          link
        }));
        await Notification.insertMany(notiDocs);

        // Web push notifications
        const subscriptions = await PushSubscription.find({ userId: { $in: targetUserIds } });
        const pushPayload = { title, body: message, url: link, type: 'match' };

        subscriptions.forEach(async (sub) => {
          try {
            await sendNotification(sub.subscription, pushPayload);
          } catch (error) {
            if (error.message === 'SubscriptionExpired') {
              await PushSubscription.findByIdAndDelete(sub._id);
            }
          }
        });
      }
    }

    res.json({
      success: true,
      data: match.lineup,
      message: sendPush ? 'Đã lưu đội hình và gửi thông báo thành công!' : 'Đã lưu đội hình thành công!'
    });
  } catch (err) {
    next(err);
  }
}

// 📋 SEND PUSH NOTIFICATION FOR LINEUP
async function notifyLineupPush(req, res, next) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    const targetCheckIns = (match.checkInList || []).filter(
      item => item.status === 'joined' || item.status === 'uncertain'
    );
    const targetUserIds = targetCheckIns.map(item => (item.userId?._id || item.userId)?.toString()).filter(Boolean);

    if (targetUserIds.length === 0) {
      return res.json({
        success: true,
        message: 'Chưa có thành viên nào vote Tham gia hoặc 50-50 để gửi thông báo.'
      });
    }

    const title = '📋 Đội hình ra sân đã được công bố!';
    const opponentName = match.opponent?.teamName || 'Đối thủ';
    const message = `Đội hình trận gặp ${opponentName} (${match.time} ngày ${match.date}) đã có. Xem ngay sơ đồ chiến thuật!`;
    const link = `/matches`;

    const notiDocs = targetUserIds.map(uid => ({
      recipient: uid,
      title,
      message,
      type: 'match',
      link
    }));
    await Notification.insertMany(notiDocs);

    const subscriptions = await PushSubscription.find({ userId: { $in: targetUserIds } });
    const pushPayload = { title, body: message, url: link, type: 'match' };

    subscriptions.forEach(async (sub) => {
      try {
        await sendNotification(sub.subscription, pushPayload);
      } catch (error) {
        if (error.message === 'SubscriptionExpired') {
          await PushSubscription.findByIdAndDelete(sub._id);
        }
      }
    });

    res.json({
      success: true,
      message: `Đã gửi thông báo đội hình đến ${targetUserIds.length} thành viên.`
    });
  } catch (err) {
    next(err);
  }
}

// ⚔️ BALANCE / SPLIT TEAMS LOGIC FOR INTERNAL MATCH
async function splitInternalTeams(req, res, next) {
  try {
    const { id } = req.params;
    const { mode = 'balanced' } = req.body; // 'balanced' | 'random'

    const match = await Match.findById(id).populate('checkInList.userId', 'name avatar number position phone stats');
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    // Lấy các thành viên đã tham gia ('joined')
    const joinedPlayers = (match.checkInList || [])
      .filter(item => item.status === 'joined' && item.userId)
      .map(item => item.userId);

    if (joinedPlayers.length < 2) {
      throw new AppError('BAD_REQUEST', 'Cần ít nhất 2 thành viên điểm danh Tham gia để chia đội', 400);
    }

    let teamAPlayers = [];
    let teamBPlayers = [];

    if (mode === 'random') {
      // Xáo trộn ngẫu nhiên Fisher-Yates
      const shuffled = [...joinedPlayers].sort(() => Math.random() - 0.5);
      shuffled.forEach((player, idx) => {
        if (idx % 2 === 0) teamAPlayers.push(player._id);
        else teamBPlayers.push(player._id);
      });
    } else {
      // Phân nhóm theo vị trí thi đấu: GK, DF, MF, FW, Tự do
      const groups = {
        'Thủ môn': [],
        'Hậu vệ': [],
        'Tiền vệ': [],
        'Tiền đạo': [],
        'Tự do': []
      };

      joinedPlayers.forEach(p => {
        const pos = p.position || 'Tự do';
        if (groups[pos]) groups[pos].push(p);
        else groups['Tự do'].push(p);
      });

      // Hàm tính điểm kinh nghiệm / chỉ số của cầu thủ để xếp hạng
      const getPlayerRating = (p) => {
        const stats = p.stats || {};
        return (stats.goals || 0) * 3 + (stats.assists || 0) * 2 + (stats.appearances || 0) * 1 + (stats.motm || 0) * 5;
      };

      let flip = false; // Snake draft switcher

      // Duyệt qua từng vị trí ưu tiên: GK -> DF -> MF -> FW -> Tự do
      ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo', 'Tự do'].forEach(posGroup => {
        // Sắp xếp các cầu thủ trong vị trí theo rating giảm dần
        const sortedInGroup = groups[posGroup].sort((a, b) => getPlayerRating(b) - getPlayerRating(a));

        sortedInGroup.forEach(player => {
          if (!flip) {
            teamAPlayers.push(player._id);
          } else {
            teamBPlayers.push(player._id);
          }
          flip = !flip; // Đảo lượt chọn để cân bằng đều 2 bên
        });
      });
    }

    match.internalTeams = {
      teamA: {
        name: match.internalTeams?.teamA?.name || 'Đội Xanh',
        kitColor: match.internalTeams?.teamA?.kitColor || 'xanh dương',
        players: teamAPlayers,
        formation: match.internalTeams?.teamA?.formation || '3-2-1',
        starters: []
      },
      teamB: {
        name: match.internalTeams?.teamB?.name || 'Đội Cam',
        kitColor: match.internalTeams?.teamB?.kitColor || 'cam',
        players: teamBPlayers,
        formation: match.internalTeams?.teamB?.formation || '3-2-1',
        starters: []
      }
    };

    await match.save();
    await match.populate('internalTeams.teamA.players', 'name avatar number position phone stats');
    await match.populate('internalTeams.teamB.players', 'name avatar number position phone stats');

    res.json({
      success: true,
      data: match.internalTeams,
      message: mode === 'balanced' ? 'Đã tự động chia đội cân bằng theo vị trí!' : 'Đã chia đội ngẫu nhiên thành công!'
    });
  } catch (err) {
    next(err);
  }
}

// ⚔️ UPDATE INTERNAL TEAMS ROSTER MANUALLY
async function updateInternalTeams(req, res, next) {
  try {
    const { id } = req.params;
    const { teamA, teamB, sendPush } = req.body;

    const match = await Match.findById(id);
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu', 404);
    }

    if (teamA) {
      match.internalTeams.teamA = {
        name: teamA.name || match.internalTeams.teamA.name,
        kitColor: teamA.kitColor || match.internalTeams.teamA.kitColor,
        players: teamA.players || match.internalTeams.teamA.players,
        formation: teamA.formation || match.internalTeams.teamA.formation,
        starters: teamA.starters || match.internalTeams.teamA.starters
      };
    }

    if (teamB) {
      match.internalTeams.teamB = {
        name: teamB.name || match.internalTeams.teamB.name,
        kitColor: teamB.kitColor || match.internalTeams.teamB.kitColor,
        players: teamB.players || match.internalTeams.teamB.players,
        formation: teamB.formation || match.internalTeams.teamB.formation,
        starters: teamB.starters || match.internalTeams.teamB.starters
      };
    }

    await match.save();
    await match.populate('internalTeams.teamA.players', 'name avatar number position phone stats');
    await match.populate('internalTeams.teamB.players', 'name avatar number position phone stats');

    if (sendPush) {
      const targetCheckIns = (match.checkInList || []).filter(
        item => item.status === 'joined' || item.status === 'uncertain'
      );
      const targetUserIds = targetCheckIns.map(item => (item.userId?._id || item.userId)?.toString()).filter(Boolean);

      const title = '⚔️ Đội hình chia 2 bên trận giao lưu nội bộ đã có!';
      const message = `${match.internalTeams.teamA.name} (${match.internalTeams.teamA.kitColor}) vs ${match.internalTeams.teamB.name} (${match.internalTeams.teamB.kitColor}). Xem bạn thuộc đội nào ngay!`;
      const link = `/matches`;

      if (targetUserIds.length > 0) {
        const notiDocs = targetUserIds.map(uid => ({
          recipient: uid,
          title,
          message,
          type: 'match',
          link
        }));
        await Notification.insertMany(notiDocs);

        const subscriptions = await PushSubscription.find({ userId: { $in: targetUserIds } });
        const pushPayload = { title, body: message, url: link, type: 'match' };

        subscriptions.forEach(async (sub) => {
          try {
            await sendNotification(sub.subscription, pushPayload);
          } catch (error) {
            if (error.message === 'SubscriptionExpired') {
              await PushSubscription.findByIdAndDelete(sub._id);
            }
          }
        });
      }
    }

    res.json({
      success: true,
      data: match.internalTeams,
      message: 'Cập nhật danh sách 2 đội thành công!'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createMatch,
  getMatches,
  getForceCheckInMatch,
  getForceMvpVoteMatch,
  voteMvp,
  finalizeMvp,
  getMatchMvpStats,
  updateCheckIn,
  updateMatch,
  updateMatchResult,
  deleteMatch,
  cloneMatch,
  notifyMatch,
  notifyMatchPush,
  getMatchLineup,
  updateMatchLineup,
  notifyLineupPush,
  splitInternalTeams,
  updateInternalTeams
};

