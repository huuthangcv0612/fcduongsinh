import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  Shield,
  RotateCcw,
  Sparkles,
  Shuffle,
  ArrowLeftRight,
  Check,
  Search,
  Trophy,
  Coins,
  Calculator,
  UserPlus
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import TacticalPitch from './TacticalPitch';

function parseDeal(dealStr) {
  const clean = (dealStr || '5-5').trim().toLowerCase();
  if (clean.includes('thua đóng') || clean.includes('thua chịu') || clean === '10-0' || clean === '0-10') {
    return { winRatio: 0, loseRatio: 1.0, isAllPay: true };
  }
  const match = clean.match(/^(\d+)[-–/:](\d+)$/);
  if (match) {
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    const total = p1 + p2;
    if (total > 0) {
      const smaller = Math.min(p1, p2);
      const larger = Math.max(p1, p2);
      return { winRatio: smaller / total, loseRatio: larger / total, isAllPay: false };
    }
  }
  return { winRatio: 0.5, loseRatio: 0.5, isAllPay: false };
}

export default function InternalMatchModal({ match, isOpen, onClose, isAdmin }) {
  useBodyScrollLock(isOpen);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Active Tab: 'roster' | 'pitch'
  const [viewTab, setViewTab] = useState('roster');
  const [pitchTeamTab, setPitchTeamTab] = useState('teamA');
  const [sendPushOnSave, setSendPushOnSave] = useState(true);

  // Search filter for unassigned pool
  const [searchQuery, setSearchQuery] = useState('');

  // Editable fields
  const [nameA, setNameA] = useState(match.internalTeams?.teamA?.name || 'Team A');
  const [kitA, setKitA] = useState(match.internalTeams?.teamA?.kitColor || 'xanh dương');
  const [guestA, setGuestA] = useState(
    match.guestPlayersA ?? match.internalTeams?.teamA?.guestPlayers ?? 0
  );

  const [nameB, setNameB] = useState(match.internalTeams?.teamB?.name || 'Team B');
  const [kitB, setKitB] = useState(match.internalTeams?.teamB?.kitColor || 'cam');
  const [guestB, setGuestB] = useState(
    match.guestPlayersB ?? match.internalTeams?.teamB?.guestPlayers ?? 0
  );

  const [deal, setDeal] = useState(match.deal || '5-5');

  // Local rosters
  const [rosterA, setRosterA] = useState([]);
  const [rosterB, setRosterB] = useState([]);

  // Sync from match props
  React.useEffect(() => {
    if (match?.internalTeams) {
      setNameA(match.internalTeams.teamA?.name || 'Team A');
      setKitA(match.internalTeams.teamA?.kitColor || 'xanh dương');
      setGuestA(match.guestPlayersA ?? match.internalTeams.teamA?.guestPlayers ?? 0);

      setNameB(match.internalTeams.teamB?.name || 'Team B');
      setKitB(match.internalTeams.teamB?.kitColor || 'cam');
      setGuestB(match.guestPlayersB ?? match.internalTeams.teamB?.guestPlayers ?? 0);

      setDeal(match.deal || '5-5');

      setRosterA(match.internalTeams.teamA?.players || []);
      setRosterB(match.internalTeams.teamB?.players || []);
    }
  }, [match]);

  // All checked in joined members
  const joinedMembers = useMemo(() => {
    return (match.checkInList || [])
      .filter(item => item.status === 'joined' && item.userId)
      .map(item => item.userId);
  }, [match]);

  // Members who are joined but not yet assigned to Team A or Team B
  const unassignedMembers = useMemo(() => {
    const assignedIds = new Set([
      ...rosterA.map(p => (p._id || p).toString()),
      ...rosterB.map(p => (p._id || p).toString())
    ]);
    const list = joinedMembers.filter(m => !assignedIds.has((m._id || m).toString()));
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter(m => m.name?.toLowerCase().includes(q) || m.position?.toLowerCase().includes(q));
  }, [joinedMembers, rosterA, rosterB, searchQuery]);

  // Financial Breakdown & Outcome Calculations
  const totalCost = (Number(match.pitchCost) || 0) + (Number(match.serviceCost) || 0);
  const numGuestA = Math.max(0, Number(guestA) || 0);
  const numGuestB = Math.max(0, Number(guestB) || 0);
  const totalCountA = rosterA.length + numGuestA;
  const totalCountB = rosterB.length + numGuestB;

  const { winRatio, loseRatio } = useMemo(() => parseDeal(deal), [deal]);

  const homeScore = match.score?.homeScore ?? 0;
  const awayScore = match.score?.awayScore ?? 0;
  const isMatchFinished = match.status === 'completed';

  // Live calculation based on score or simulation
  const financialModel = useMemo(() => {
    // If Team A wins
    const winCost = Math.round(totalCost * winRatio);
    const loseCost = totalCost - winCost;

    const winFeeA = totalCountA > 0 ? Math.round(winCost / totalCountA) : 0;
    const loseFeeB = totalCountB > 0 ? Math.round(loseCost / totalCountB) : 0;

    // If Team B wins
    const winFeeB = totalCountB > 0 ? Math.round(winCost / totalCountB) : 0;
    const loseFeeA = totalCountA > 0 ? Math.round(loseCost / totalCountA) : 0;

    // If draw
    const drawCostA = Math.round(totalCost / 2);
    const drawCostB = totalCost - drawCostA;
    const drawFeeA = totalCountA > 0 ? Math.round(drawCostA / totalCountA) : 0;
    const drawFeeB = totalCountB > 0 ? Math.round(drawCostB / totalCountB) : 0;

    let actualOutcome = 'upcoming'; // 'teamA_win' | 'teamB_win' | 'draw'
    let actualCostA = drawCostA;
    let actualCostB = drawCostB;
    let actualFeeA = drawFeeA;
    let actualFeeB = drawFeeB;

    if (homeScore > awayScore) {
      actualOutcome = 'teamA_win';
      actualCostA = winCost;
      actualCostB = loseCost;
      actualFeeA = winFeeA;
      actualFeeB = loseFeeB;
    } else if (awayScore > homeScore) {
      actualOutcome = 'teamB_win';
      actualCostA = loseCost;
      actualCostB = winCost;
      actualFeeA = loseFeeA;
      actualFeeB = winFeeB;
    } else {
      actualOutcome = 'draw';
    }

    return {
      winCost,
      loseCost,
      winFeeA,
      loseFeeB,
      winFeeB,
      loseFeeA,
      drawCostA,
      drawCostB,
      drawFeeA,
      drawFeeB,
      actualOutcome,
      actualCostA,
      actualCostB,
      actualFeeA,
      actualFeeB
    };
  }, [totalCost, winRatio, totalCountA, totalCountB, homeScore, awayScore]);

  // Mutation: Auto Split Teams (Balanced or Random)
  const splitMutation = useMutation({
    mutationFn: (mode) => api.post(`/matches/${match._id}/split-teams`, { mode }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setRosterA(res.data.teamA?.players || []);
      setRosterB(res.data.teamB?.players || []);
      toast.success(res.message || 'Chia đội thành công!', 'Giao Lưu Nội Bộ');
    },
    onError: (err) => {
      toast.error(err.message || 'Chia đội thất bại', 'Lỗi');
    }
  });

  // Mutation: Save changes
  const saveMutation = useMutation({
    mutationFn: () => api.put(`/matches/${match._id}/internal-teams`, {
      teamA: {
        name: nameA.trim() || 'Team A',
        kitColor: kitA,
        guestPlayers: numGuestA,
        players: rosterA.map(p => p._id || p)
      },
      teamB: {
        name: nameB.trim() || 'Team B',
        kitColor: kitB,
        guestPlayers: numGuestB,
        players: rosterB.map(p => p._id || p)
      },
      guestPlayersA: numGuestA,
      guestPlayersB: numGuestB,
      deal: deal.trim() || '5-5',
      sendPush: sendPushOnSave
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['match-funds'] });
      toast.success('Đã lưu danh sách 2 đội, khách vãng lai & kèo sân thành công!', 'Giao Lưu Nội Bộ');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi lưu đội hình', 'Lỗi');
    }
  });

  // Move player between teams
  const moveToTeamA = (player) => {
    const pId = (player._id || player).toString();
    setRosterB(prev => prev.filter(p => (p._id || p).toString() !== pId));
    setRosterA(prev => {
      if (prev.some(p => (p._id || p).toString() === pId)) return prev;
      return [...prev, player];
    });
  };

  const moveToTeamB = (player) => {
    const pId = (player._id || player).toString();
    setRosterA(prev => prev.filter(p => (p._id || p).toString() !== pId));
    setRosterB(prev => {
      if (prev.some(p => (p._id || p).toString() === pId)) return prev;
      return [...prev, player];
    });
  };

  const removeAssignment = (player) => {
    const pId = (player._id || player).toString();
    setRosterA(prev => prev.filter(p => (p._id || p).toString() !== pId));
    setRosterB(prev => prev.filter(p => (p._id || p).toString() !== pId));
  };

  const getKitBadgeStyle = (kitColor) => {
    switch (kitColor?.toLowerCase()) {
      case 'xanh dương':
      case 'xanh':
        return 'bg-blue-600 text-white';
      case 'cam':
        return 'bg-orange-500 text-white';
      case 'đỏ':
        return 'bg-rose-600 text-white';
      case 'đen':
        return 'bg-slate-900 text-white';
      case 'trắng':
        return 'bg-white text-slate-900 border border-slate-300';
      case 'vàng':
        return 'bg-amber-400 text-slate-900';
      case 'xanh lá':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-indigo-600 text-white';
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overscroll-contain">
      <div className="w-full max-w-5xl h-[95dvh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  ⚔️ Chia 2 Đội Đá Nội Bộ: {nameA} vs {nameB}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {match.date} • {match.time}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold">
                Sân: {match.stadium} • Tổng chi phí: <span className="text-emerald-400 font-mono font-black">{totalCost.toLocaleString('vi-VN')} đ</span> • Kèo sân: <span className="text-amber-400 font-mono font-black">{deal}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Tab Switcher Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* View Tab Toggle */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewTab('roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewTab === 'roster'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Danh Sách 2 Đội ({rosterA.length} vs {rosterB.length})</span>
            </button>
            <button
              onClick={() => setViewTab('pitch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewTab === 'pitch'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Sa Bàn Chiến Thuật</span>
            </button>
          </div>

          {/* Admin Balancing & Save Controls */}
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => splitMutation.mutate('balanced')}
                disabled={splitMutation.isPending || joinedMembers.length < 2}
                className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm transition disabled:opacity-50"
                title="Tự động xếp đều theo vị trí"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Tự Động Cân Đội</span>
              </button>

              <button
                type="button"
                onClick={() => splitMutation.mutate('random')}
                disabled={splitMutation.isPending || joinedMembers.length < 2}
                className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black border border-slate-700 transition disabled:opacity-50"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>🎲 Xáo Ngẫu Nhiên</span>
              </button>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="tactile-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saveMutation.isPending ? 'Đang Lưu...' : 'Lưu Đội Hình'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5 space-y-4">
          {viewTab === 'roster' ? (
            <>
              {/* 💰 FINANCIAL & DEAL BREAKDOWN BANNER */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-800/90 via-slate-850 to-slate-800/90 border border-slate-700/80 shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <Calculator className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                        <span>Chi Tiết Thanh Toán Kèo Sân & Chia Quỹ</span>
                        {isMatchFinished && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-500/30 text-rose-300 border border-rose-500/40">
                            Đã có tỉ số: {homeScore} - {awayScore}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-bold">
                        Tổng tiền trận: <b className="text-white">{totalCost.toLocaleString('vi-VN')} đ</b> ({totalCountA} người Team A vs {totalCountB} người Team B)
                      </p>
                    </div>
                  </div>

                  {/* Deal Preset Selector (Admin) */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 self-start sm:self-auto">
                      <span className="text-[10px] text-slate-400 font-black px-1.5 uppercase">Kèo:</span>
                      {['5-5', '6-4', '7-3', '10-0'].map(dVal => (
                        <button
                          key={dVal}
                          type="button"
                          onClick={() => setDeal(dVal)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black transition ${
                            deal === dVal
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {dVal === '10-0' ? 'Thua đóng tất' : dVal}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outcome Display: Real Result if finished OR Live Simulator */}
                {isMatchFinished || (homeScore > 0 || awayScore > 0) ? (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Kết Quả: {financialModel.actualOutcome === 'teamA_win' ? `🏆 ${nameA} THẮNG (${homeScore} - ${awayScore})` : financialModel.actualOutcome === 'teamB_win' ? `🏆 ${nameB} THẮNG (${awayScore} - ${homeScore})` : `🤝 HÒA (${homeScore} - ${awayScore})`}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">Kèo {deal}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Team A actual payment */}
                      <div className={`p-2.5 rounded-xl border ${financialModel.actualOutcome === 'teamA_win' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : financialModel.actualOutcome === 'teamB_win' ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' : 'bg-slate-800/80 border-slate-700 text-slate-200'}`}>
                        <div className="font-black text-xs mb-1 flex items-center justify-between">
                          <span>{nameA} ({financialModel.actualOutcome === 'teamA_win' ? 'Bên Thắng 🌟' : financialModel.actualOutcome === 'teamB_win' ? 'Bên Thua' : 'Hòa'})</span>
                          <span className="font-mono text-sm font-black">{financialModel.actualCostA.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="text-[11px] opacity-90 flex items-center justify-between">
                          <span>{rosterA.length} đội + {numGuestA} vãng lai ({totalCountA} người)</span>
                          <span className="font-black font-mono text-amber-300">👉 {financialModel.actualFeeA.toLocaleString('vi-VN')} đ / người</span>
                        </div>
                      </div>

                      {/* Team B actual payment */}
                      <div className={`p-2.5 rounded-xl border ${financialModel.actualOutcome === 'teamB_win' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : financialModel.actualOutcome === 'teamA_win' ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' : 'bg-slate-800/80 border-slate-700 text-slate-200'}`}>
                        <div className="font-black text-xs mb-1 flex items-center justify-between">
                          <span>{nameB} ({financialModel.actualOutcome === 'teamB_win' ? 'Bên Thắng 🌟' : financialModel.actualOutcome === 'teamA_win' ? 'Bên Thua' : 'Hòa'})</span>
                          <span className="font-mono text-sm font-black">{financialModel.actualCostB.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="text-[11px] opacity-90 flex items-center justify-between">
                          <span>{rosterB.length} đội + {numGuestB} vãng lai ({totalCountB} người)</span>
                          <span className="font-black font-mono text-amber-300">👉 {financialModel.actualFeeB.toLocaleString('vi-VN')} đ / người</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Upcoming match scenarios preview */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/80">
                      <div className="text-[11px] font-black text-blue-300 mb-1 flex items-center justify-between">
                        <span>🏆 NẾU {nameA} THẮNG (Kèo {deal}):</span>
                      </div>
                      <div className="space-y-0.5 text-[11px] text-slate-300">
                        <p className="flex justify-between">
                          <span>• {nameA} trả: <b className="text-white">{financialModel.winCost.toLocaleString('vi-VN')} đ</b></span>
                          <span className="text-emerald-400 font-mono font-bold">({financialModel.winFeeA.toLocaleString('vi-VN')} đ/người)</span>
                        </p>
                        <p className="flex justify-between">
                          <span>• {nameB} trả: <b className="text-white">{financialModel.loseCost.toLocaleString('vi-VN')} đ</b></span>
                          <span className="text-rose-400 font-mono font-bold">({financialModel.loseFeeB.toLocaleString('vi-VN')} đ/người)</span>
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/80">
                      <div className="text-[11px] font-black text-orange-300 mb-1 flex items-center justify-between">
                        <span>🏆 NẾU {nameB} THẮNG (Kèo {deal}):</span>
                      </div>
                      <div className="space-y-0.5 text-[11px] text-slate-300">
                        <p className="flex justify-between">
                          <span>• {nameB} trả: <b className="text-white">{financialModel.winCost.toLocaleString('vi-VN')} đ</b></span>
                          <span className="text-emerald-400 font-mono font-bold">({financialModel.winFeeB.toLocaleString('vi-VN')} đ/người)</span>
                        </p>
                        <p className="flex justify-between">
                          <span>• {nameA} trả: <b className="text-white">{financialModel.loseCost.toLocaleString('vi-VN')} đ</b></span>
                          <span className="text-rose-400 font-mono font-bold">({financialModel.loseFeeA.toLocaleString('vi-VN')} đ/người)</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ⚠️ UNASSIGNED MEMBERS DOCK */}
              {unassignedMembers.length > 0 && (
                <div className="p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <UserPlus className="w-4 h-4 text-amber-400" />
                      Cầu thủ điểm danh tham gia chưa xếp đội ({unassignedMembers.length})
                    </span>
                    
                    {/* Search box */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Tìm theo tên/vị trí..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-900/80 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-48"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                    {unassignedMembers.map(player => (
                      <div
                        key={player._id}
                        className="flex items-center gap-2 bg-slate-800/95 border border-slate-700 px-2.5 py-1.5 rounded-xl shadow-xs"
                      >
                        <img
                          src={player.avatar || 'https://via.placeholder.com/40'}
                          alt={player.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div className="text-left">
                          <p className="text-xs font-bold text-white leading-none">{player.name}</p>
                          <span className="text-[10px] text-emerald-400 font-mono">{player.position || 'Tự do'}</span>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 ml-1.5">
                            <button
                              type="button"
                              onClick={() => moveToTeamA(player)}
                              className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[10px] font-black text-white transition active:scale-95 shadow-xs"
                              title={`Thêm vào ${nameA}`}
                            >
                              + {nameA}
                            </button>
                            <button
                              type="button"
                              onClick={() => moveToTeamB(player)}
                              className="px-2 py-0.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-[10px] font-black text-white transition active:scale-95 shadow-xs"
                              title={`Thêm vào ${nameB}`}
                            >
                              + {nameB}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2 TEAMS SIDE BY SIDE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* TEAM A CARD */}
                <div className="bg-slate-800/60 border-2 border-blue-500/40 rounded-2xl p-4 flex flex-col shadow-lg space-y-3">
                  {/* Team A Header & Config */}
                  <div className="pb-3 border-b border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase shadow-xs ${getKitBadgeStyle(kitA)}`}>
                          Áo {kitA}
                        </span>
                        {isAdmin ? (
                          <input
                            type="text"
                            value={nameA}
                            onChange={(e) => setNameA(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-black text-blue-400 focus:outline-none focus:border-blue-500 w-32"
                          />
                        ) : (
                          <h4 className="text-sm font-black text-blue-400 uppercase tracking-wide">
                            {nameA}
                          </h4>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-white font-mono">
                          {totalCountA} người
                        </span>
                        <p className="text-[10px] text-slate-400">
                          ({rosterA.length} đội + {numGuestA} khách)
                        </p>
                      </div>
                    </div>

                    {/* Team A Guest Players & Kit Input */}
                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-0.5">👤 Khách vãng lai Team A</label>
                          <input
                            type="number"
                            min="0"
                            value={guestA}
                            onChange={(e) => setGuestA(e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-0.5">Màu áo</label>
                          <select
                            value={kitA}
                            onChange={(e) => setKitA(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            <option value="xanh dương">Xanh dương</option>
                            <option value="đỏ">Đỏ</option>
                            <option value="đen">Đen</option>
                            <option value="cam">Cam</option>
                            <option value="trắng">Trắng</option>
                            <option value="vàng">Vàng</option>
                            <option value="xanh lá">Xanh lá</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Player List A */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[45vh] pr-1">
                    {rosterA.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs font-bold">
                        Chưa có cầu thủ trong {nameA}. Hãy nhặt cầu thủ từ danh sách trên hoặc bấm "⚡ Tự Động Cân Đội"!
                      </div>
                    ) : (
                      rosterA.map((player, idx) => (
                        <div
                          key={player._id || idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xs font-mono font-bold text-slate-500 w-4 text-center">
                              {idx + 1}
                            </span>
                            <img
                              src={player.avatar || 'https://via.placeholder.com/40'}
                              alt={player.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-600 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate group-hover:text-blue-300">
                                {player.name}
                              </p>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="text-emerald-400 font-bold">{player.position || 'Tự do'}</span>
                                {player.stats?.goals > 0 && (
                                  <span className="text-rose-400">⚽ {player.stats.goals}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveToTeamB(player)}
                                className="p-1.5 rounded-lg bg-orange-600/30 hover:bg-orange-600 text-orange-300 hover:text-white text-[11px] font-black transition flex items-center gap-1"
                                title={`Chuyển sang ${nameB}`}
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span className="hidden sm:inline">Sang B</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeAssignment(player)}
                                className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-600/80 text-slate-400 hover:text-white transition"
                                title="Bỏ chọn"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* TEAM B CARD */}
                <div className="bg-slate-800/60 border-2 border-orange-500/40 rounded-2xl p-4 flex flex-col shadow-lg space-y-3">
                  {/* Team B Header & Config */}
                  <div className="pb-3 border-b border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase shadow-xs ${getKitBadgeStyle(kitB)}`}>
                          Áo {kitB}
                        </span>
                        {isAdmin ? (
                          <input
                            type="text"
                            value={nameB}
                            onChange={(e) => setNameB(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-black text-orange-400 focus:outline-none focus:border-orange-500 w-32"
                          />
                        ) : (
                          <h4 className="text-sm font-black text-orange-400 uppercase tracking-wide">
                            {nameB}
                          </h4>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-white font-mono">
                          {totalCountB} người
                        </span>
                        <p className="text-[10px] text-slate-400">
                          ({rosterB.length} đội + {numGuestB} khách)
                        </p>
                      </div>
                    </div>

                    {/* Team B Guest Players & Kit Input */}
                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-0.5">👤 Khách vãng lai Team B</label>
                          <input
                            type="number"
                            min="0"
                            value={guestB}
                            onChange={(e) => setGuestB(e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-0.5">Màu áo</label>
                          <select
                            value={kitB}
                            onChange={(e) => setKitB(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-orange-500"
                          >
                            <option value="cam">Cam</option>
                            <option value="đỏ">Đỏ</option>
                            <option value="xanh dương">Xanh dương</option>
                            <option value="đen">Đen</option>
                            <option value="trắng">Trắng</option>
                            <option value="vàng">Vàng</option>
                            <option value="xanh lá">Xanh lá</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Player List B */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[45vh] pr-1">
                    {rosterB.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs font-bold">
                        Chưa có cầu thủ trong {nameB}. Hãy nhặt cầu thủ từ danh sách trên hoặc bấm "⚡ Tự Động Cân Đội"!
                      </div>
                    ) : (
                      rosterB.map((player, idx) => (
                        <div
                          key={player._id || idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xs font-mono font-bold text-slate-500 w-4 text-center">
                              {idx + 1}
                            </span>
                            <img
                              src={player.avatar || 'https://via.placeholder.com/40'}
                              alt={player.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-600 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate group-hover:text-orange-300">
                                {player.name}
                              </p>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="text-emerald-400 font-bold">{player.position || 'Tự do'}</span>
                                {player.stats?.goals > 0 && (
                                  <span className="text-rose-400">⚽ {player.stats.goals}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveToTeamA(player)}
                                className="p-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-black transition flex items-center gap-1"
                                title={`Chuyển sang ${nameA}`}
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span className="hidden sm:inline">Sang A</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeAssignment(player)}
                                className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-600/80 text-slate-400 hover:text-white transition"
                                title="Bỏ chọn"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* Tactical Pitch Tab */
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
                <button
                  onClick={() => setPitchTeamTab('teamA')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                    pitchTeamTab === 'teamA'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔵 Sa bàn {nameA} (Áo {kitA})
                </button>
                <button
                  onClick={() => setPitchTeamTab('teamB')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                    pitchTeamTab === 'teamB'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🟠 Sa bàn {nameB} (Áo {kitB})
                </button>
              </div>

              {/* Tactical Pitch for active team */}
              <div className="w-full max-w-md">
                <TacticalPitch
                  kitColor={pitchTeamTab === 'teamA' ? kitA : kitB}
                  isEditable={false}
                  starters={(pitchTeamTab === 'teamA' ? rosterA : rosterB).slice(0, 7).map((p, idx) => ({
                    positionKey: p.position ? p.position.substring(0, 2).toUpperCase() : `P${idx + 1}`,
                    positionName: p.position || 'Cầu thủ',
                    x: [50, 25, 75, 35, 65, 50, 50][idx] || 50,
                    y: [85, 70, 70, 48, 48, 25, 15][idx] || 50,
                    userId: p
                  }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-800/90 border-t border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-300 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tổng cộng: <b className="text-white">{joinedMembers.length}</b> tham gia • <span className="text-blue-300">{nameA}: {totalCountA}</span> | <span className="text-orange-300">{nameB}: {totalCountB}</span></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 text-xs font-bold transition"
            >
              Đóng
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
