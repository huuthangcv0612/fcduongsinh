const Match = require('../models/Match');
const User = require('../models/User');

/**
 * Controller to get statistics (all time or by specific month YYYY-MM)
 */
async function getStats(req, res, next) {
  try {
    const selectedMonth = req.query.month || 'all';

    // 1. Fetch all completed matches date list to get available months
    const allCompletedMatches = await Match.find({ status: 'completed' })
      .select('date')
      .sort({ date: -1 })
      .lean();

    const monthCounts = new Map();
    for (const m of allCompletedMatches) {
      if (m.date && m.date.length >= 7) {
        const ym = m.date.substring(0, 7);
        monthCounts.set(ym, (monthCounts.get(ym) || 0) + 1);
      }
    }

    const availableMonths = Array.from(monthCounts.entries()).map(([key, count]) => {
      const [y, m] = key.split('-');
      return {
        key,
        year: parseInt(y, 10),
        month: parseInt(m, 10),
        label: `Tháng ${m}/${y}`,
        matchCount: count
      };
    });

    // 2. Query completed matches for the selected period
    const matchFilter = { status: 'completed' };
    if (selectedMonth && selectedMonth !== 'all') {
      matchFilter.date = { $gte: `${selectedMonth}-01`, $lte: `${selectedMonth}-31` };
    }

    const matches = await Match.find(matchFilter)
      .select('date score matchType opponent motm scorers concededGoals checkInList')
      .sort({ date: -1 })
      .lean();

    // 3. Fetch active users
    const users = await User.find({ isActive: true })
      .select('_id name avatar position role')
      .sort({ name: 1 })
      .lean();

    // 4. Initialize stats maps
    const statsByUserId = new Map();
    const userIdByName = new Map();

    for (const user of users) {
      statsByUserId.set(String(user._id), { goals: 0, assists: 0, motm: 0, appearances: 0, mistakes: 0 });
      if (user.name) {
        userIdByName.set(user.name, String(user._id));
        userIdByName.set(user.name.trim().toLowerCase(), String(user._id));
      }
    }

    // 5. Calculate team summary metrics & user stats from matches
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;

    for (const match of matches) {
      const home = Number(match.score?.homeScore) || 0;
      const away = Number(match.score?.awayScore) || 0;
      goalsScored += home;
      goalsConceded += away;

      if (home > away) {
        wins++;
      } else if (home === away) {
        draws++;
      } else {
        losses++;
      }

      // Appearances (checkInList with status: 'joined')
      for (const c of match.checkInList || []) {
        if (c.status === 'joined' && c.userId) {
          const s = statsByUserId.get(String(c.userId));
          if (s) s.appearances++;
        }
      }

      // MOTM
      if (match.motm) {
        const motmTrimmed = String(match.motm).trim();
        const motmUserId = userIdByName.get(motmTrimmed) || userIdByName.get(motmTrimmed.toLowerCase());
        if (motmUserId && statsByUserId.has(motmUserId)) {
          statsByUserId.get(motmUserId).motm++;
        }
      }

      // Scorers and Assists
      for (const s of match.scorers || []) {
        const count = Number(s.count) || 1;
        if (s.playerName) {
          const pName = String(s.playerName).trim();
          const scorerId = userIdByName.get(pName) || userIdByName.get(pName.toLowerCase());
          if (scorerId && statsByUserId.has(scorerId)) {
            statsByUserId.get(scorerId).goals += count;
          }
        }
        if (s.assisterName) {
          const aName = String(s.assisterName).trim();
          const assisterId = userIdByName.get(aName) || userIdByName.get(aName.toLowerCase());
          if (assisterId && statsByUserId.has(assisterId)) {
            statsByUserId.get(assisterId).assists += count;
          }
        }
      }

      // Mistakes leading to conceded goals
      for (const cg of match.concededGoals || []) {
        if (cg.errorType === 'khong_loi') continue;
        let mUserId = cg.userId ? String(cg.userId) : null;
        if (!mUserId && cg.playerName) {
          const cgName = String(cg.playerName).trim();
          mUserId = userIdByName.get(cgName) || userIdByName.get(cgName.toLowerCase());
        }
        if (mUserId && statsByUserId.has(mUserId)) {
          statsByUserId.get(mUserId).mistakes++;
        }
      }
    }

    const totalMatches = matches.length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    const usersWithStats = users.map(u => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      position: u.position,
      role: u.role,
      stats: statsByUserId.get(String(u._id)) || { goals: 0, assists: 0, motm: 0, appearances: 0, mistakes: 0 }
    }));

    return res.json({
      success: true,
      data: {
        selectedMonth,
        availableMonths,
        summary: {
          totalMatches,
          wins,
          draws,
          losses,
          goalsScored,
          goalsConceded,
          winRate
        },
        users: usersWithStats
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats
};
