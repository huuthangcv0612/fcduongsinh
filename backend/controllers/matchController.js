const Match = require('../models/Match');
const User = require('../models/User');
const { AppError } = require('../middlewares/authMiddleware');
const { CreateMatchSchema, CheckInSchema } = require('../validators/schemas');
const { sendMatchNotification } = require('../services/mailerService');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { sendNotification } = require('../utils/webPush');
async function recalculateUserStats() {
  const users = await User.find({ isActive: true });
  const matches = await Match.find({ status: 'completed' });
  
  for (const user of users) {
    let goals = 0;
    let assists = 0;
    let motm = 0;
    let appearances = 0;

    for (const match of matches) {
      // Appearances
      const checkIn = match.checkInList.find(c => c.userId.toString() === user._id.toString());
      if (checkIn && checkIn.status === 'joined') {
        appearances++;
      }
      
      // MOTM
      if (match.motm === user.name) motm++;
      
      // Goals & Assists
      if (match.scorers && match.scorers.length > 0) {
        for (const s of match.scorers) {
          if (s.playerName === user.name) goals += s.count;
          if (s.assisterName === user.name) assists += s.count;
        }
      }
    }

    user.stats = { goals, assists, motm, appearances };
    await user.save();
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

    const matches = await Match.find(filter)
      .sort({ date: 1, time: 1 })
      .populate('checkInList.userId', 'name email avatar position')
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
    const { date, time, stadium, stadiumLink, pitchCost, deal, kitColor, opponent, status, notes } = req.body;

    const match = await Match.findById(id);
    if (!match) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy trận đấu cần sửa', 404);
    }

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

// ⚽ UPDATE MATCH RESULT & GOAL SCORERS (Admin)
async function updateMatchResult(req, res, next) {
  try {
    const { id } = req.params;
    const { homeScore, awayScore, scorers, status } = req.body;

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

    if (req.body.motm !== undefined) {
      match.motm = req.body.motm;
    }

    match.status = status || 'completed';
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

    // Create in-app notification
    const title = 'Trận bóng mới sắp diễn ra!';
    const message = `Trận đấu với ${match.opponent?.name || 'Đối thủ'} vào lúc ${match.time} ngày ${match.date} tại ${match.stadium}. Hãy vào điểm danh nhé!`;
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

    // Create in-app notification
    const title = 'Nhắc nhở: Trận bóng sắp diễn ra!';
    const message = `Trận đấu với ${match.opponent?.teamName || 'Đối thủ'} vào lúc ${match.time} ngày ${match.date} tại ${match.stadium}. Hãy nhanh tay vào điểm danh nhé!`;
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

module.exports = {
  createMatch,
  getMatches,
  getForceCheckInMatch,
  updateCheckIn,
  updateMatch,
  updateMatchResult,
  deleteMatch,
  cloneMatch,
  notifyMatch,
  notifyMatchPush
};
