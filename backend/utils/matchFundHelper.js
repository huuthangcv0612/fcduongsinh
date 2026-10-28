/**
 * Helper calculation functions for Match Finances & Fund Splits
 * Handles friendly matches and internal (Team A vs Team B) matches.
 */

function parseDealRatio(dealStr) {
  const cleanDeal = (dealStr || '5-5').trim().toLowerCase();

  if (
    cleanDeal.includes('thua đóng') ||
    cleanDeal.includes('thua chịu') ||
    cleanDeal.includes('thua tra') ||
    cleanDeal === '10-0' ||
    cleanDeal === '0-10'
  ) {
    return { winRatio: 0, loseRatio: 1.0, isAllPay: true };
  }

  const matchRatio = cleanDeal.match(/^(\d+)[-–/:](\d+)$/);
  if (matchRatio) {
    const p1 = parseInt(matchRatio[1], 10);
    const p2 = parseInt(matchRatio[2], 10);
    const totalParts = p1 + p2;
    if (totalParts > 0) {
      const smaller = Math.min(p1, p2);
      const larger = Math.max(p1, p2);
      return {
        winRatio: smaller / totalParts,
        loseRatio: larger / totalParts,
        isAllPay: false
      };
    }
  }

  // Default 50% - 50%
  return { winRatio: 0.5, loseRatio: 0.5, isAllPay: false };
}

function calculateMatchFundBreakdown(match) {
  const pitchCost = Math.max(0, Number(match.pitchCost) || 0);
  const serviceCost = Math.max(0, Number(match.serviceCost) || 0);
  const totalCost = pitchCost + serviceCost;

  const isInternal = match.matchType === 'internal';

  if (!isInternal) {
    const joinedCount = (match.checkInList || []).filter(c => c.status === 'joined').length;
    const guestPlayers = Math.max(0, Number(match.guestPlayers) || 0);
    const guestPaidCount = Math.max(0, Number(match.guestPaidCount) || 0);
    const totalPlayers = joinedCount + guestPlayers;
    const feePerPerson = totalPlayers > 0 ? Math.round(totalCost / totalPlayers) : 0;

    return {
      isInternal: false,
      totalCost,
      pitchCost,
      serviceCost,
      teamJoinedCount: joinedCount,
      guestPlayers,
      guestPaidCount,
      totalPlayers,
      feePerPerson,
      deal: match.deal || '5-5'
    };
  }

  // --- INTERNAL MATCH LOGIC ---
  const teamA = match.internalTeams?.teamA || {};
  const teamB = match.internalTeams?.teamB || {};

  const teamAName = teamA.name || 'Team A';
  const teamBName = teamB.name || 'Team B';

  // Get player IDs for teamA and teamB
  const playersA = (teamA.players || []).map(p => (p?._id || p)?.toString());
  const playersB = (teamB.players || []).map(p => (p?._id || p)?.toString());

  // Count joined members in Team A and Team B
  const checkInList = match.checkInList || [];
  const joinedUsers = new Set(
    checkInList.filter(c => c.status === 'joined').map(c => (c.userId?._id || c.userId)?.toString())
  );

  // Members who are both joined and assigned to Team A / B
  const teamAMembers = playersA.filter(id => joinedUsers.has(id));
  const teamBMembers = playersB.filter(id => joinedUsers.has(id));

  // If some joined members are unassigned yet
  const assignedSet = new Set([...playersA, ...playersB]);
  const unassignedMembers = Array.from(joinedUsers).filter(id => !assignedSet.has(id));

  const guestPlayersA = Math.max(0, Number(match.guestPlayersA ?? teamA.guestPlayers ?? 0));
  const guestPlayersB = Math.max(0, Number(match.guestPlayersB ?? teamB.guestPlayers ?? 0));

  const countA = teamAMembers.length + guestPlayersA;
  const countB = teamBMembers.length + guestPlayersB;
  const totalInternalPlayers = countA + countB + unassignedMembers.length;

  const { winRatio, loseRatio } = parseDealRatio(match.deal);

  // Determine winner / loser from score
  const homeScore = match.score?.homeScore ?? 0;
  const awayScore = match.score?.awayScore ?? 0;

  let outcome = 'pending'; // 'pending' | 'draw' | 'teamA_win' | 'teamB_win'
  let ratioA = 0.5;
  let ratioB = 0.5;

  if (homeScore > awayScore) {
    outcome = 'teamA_win';
    ratioA = winRatio;
    ratioB = loseRatio;
  } else if (awayScore > homeScore) {
    outcome = 'teamB_win';
    ratioA = loseRatio;
    ratioB = winRatio;
  } else {
    outcome = 'draw';
    ratioA = 0.5;
    ratioB = 0.5;
  }

  // Cost split for Team A and Team B
  const costA = Math.round(totalCost * ratioA);
  const costB = totalCost - costA;

  const feeA = countA > 0 ? Math.round(costA / countA) : 0;
  const feeB = countB > 0 ? Math.round(costB / countB) : 0;

  // Average fallback fee for unassigned members if any
  const fallbackFee = totalInternalPlayers > 0 ? Math.round(totalCost / totalInternalPlayers) : 0;

  return {
    isInternal: true,
    totalCost,
    pitchCost,
    serviceCost,
    deal: match.deal || '5-5',
    outcome, // 'teamA_win' | 'teamB_win' | 'draw' | 'pending'
    dealWinRatio: winRatio,
    dealLoseRatio: loseRatio,
    teamJoinedCount: joinedUsers.size,
    guestPlayers: guestPlayersA + guestPlayersB,
    guestPlayersA,
    guestPlayersB,
    guestPaidCount: Math.max(0, Number(match.guestPaidCount) || 0),
    totalPlayers: totalInternalPlayers,
    feePerPerson: fallbackFee, // General average if needed
    teamA: {
      name: teamAName,
      kitColor: teamA.kitColor || 'xanh dương',
      memberCount: teamAMembers.length,
      guestPlayers: guestPlayersA,
      totalCount: countA,
      ratio: ratioA,
      cost: costA,
      feePerPerson: feeA,
      playerIds: teamAMembers
    },
    teamB: {
      name: teamBName,
      kitColor: teamB.kitColor || 'cam',
      memberCount: teamBMembers.length,
      guestPlayers: guestPlayersB,
      totalCount: countB,
      ratio: ratioB,
      cost: costB,
      feePerPerson: feeB,
      playerIds: teamBMembers
    },
    unassignedCount: unassignedMembers.length,
    fallbackFee
  };
}

function getMemberFeeForMatch(breakdown, userId) {
  if (!breakdown) return 0;
  if (!breakdown.isInternal) {
    return breakdown.feePerPerson || 0;
  }
  const uId = userId?.toString();
  if (breakdown.teamA?.playerIds?.includes(uId)) {
    return breakdown.teamA.feePerPerson || 0;
  }
  if (breakdown.teamB?.playerIds?.includes(uId)) {
    return breakdown.teamB.feePerPerson || 0;
  }
  return breakdown.fallbackFee || 0;
}

module.exports = {
  parseDealRatio,
  calculateMatchFundBreakdown,
  getMemberFeeForMatch
};
