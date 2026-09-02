import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  Shield,
  Send,
  RotateCcw,
  Sparkles,
  Shuffle,
  ArrowLeftRight,
  Check,
  UserCheck,
  Crown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import TacticalPitch from './TacticalPitch';

export default function InternalMatchModal({ match, isOpen, onClose, isAdmin }) {
  useBodyScrollLock(isOpen);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Active Tab: 'roster' | 'pitch'
  const [viewTab, setViewTab] = useState('roster');
  // Team Tab for Pitch View: 'teamA' | 'teamB'
  const [pitchTeamTab, setPitchTeamTab] = useState('teamA');
  const [sendPushOnSave, setSendPushOnSave] = useState(true);

  const teamA = match.internalTeams?.teamA || {
    name: 'Đội Xanh',
    kitColor: 'xanh dương',
    players: []
  };

  const teamB = match.internalTeams?.teamB || {
    name: 'Đội Cam',
    kitColor: 'cam',
    players: []
  };

  // Local state for immediate responsiveness
  const [rosterA, setRosterA] = useState([]);
  const [rosterB, setRosterB] = useState([]);

  // Initialize rosters from match props or populated players
  React.useEffect(() => {
    if (match?.internalTeams) {
      setRosterA(match.internalTeams.teamA?.players || []);
      setRosterB(match.internalTeams.teamB?.players || []);
    }
  }, [match]);

  // List of all checked in joined members
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
    return joinedMembers.filter(m => !assignedIds.has((m._id || m).toString()));
  }, [joinedMembers, rosterA, rosterB]);

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

  // Mutation: Save manual changes
  const saveMutation = useMutation({
    mutationFn: () => api.put(`/matches/${match._id}/internal-teams`, {
      teamA: {
        name: teamA.name,
        kitColor: teamA.kitColor,
        players: rosterA.map(p => p._id || p)
      },
      teamB: {
        name: teamB.name,
        kitColor: teamB.kitColor,
        players: rosterB.map(p => p._id || p)
      },
      sendPush: sendPushOnSave
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Đã lưu danh sách chia đội thành công!', 'Giao Lưu Nội Bộ');
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi lưu đội hình', 'Lỗi');
    }
  });

  // Actions: Move player between teams
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overscroll-contain">
      <div className="w-full max-w-5xl h-[94dvh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  ⚔️ Chia Đội Giao Lưu Nội Bộ
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {match.date} • {match.time}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold">
                {teamA.name} ({teamA.kitColor}) ⚔️ {teamB.name} ({teamB.kitColor}) • Sân: {match.stadium}
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
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
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

          {/* Admin Fast Balancing Actions */}
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => splitMutation.mutate('balanced')}
                disabled={splitMutation.isPending || joinedMembers.length < 2}
                className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm transition disabled:opacity-50"
                title="Tự động xếp đều Thủ môn, Hậu vệ, Tiền vệ, Tiền đạo theo snake draft"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
                <span>⚡ Tự Động Cân Vị Trí</span>
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
        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5">
          {viewTab === 'roster' ? (
            <div className="space-y-4">
              {/* Top Unassigned Dock if any */}
              {unassignedMembers.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <span>⚠️</span> Cầu thủ đã điểm danh chưa xếp đội ({unassignedMembers.length})
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold">Chạm để đưa vào Đội A hoặc Đội B</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unassignedMembers.map(player => (
                      <div
                        key={player._id}
                        className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-2.5 py-1.5 rounded-xl shadow-xs"
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
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              onClick={() => moveToTeamA(player)}
                              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-black text-white"
                              title="Vào Đội A"
                            >
                              + A
                            </button>
                            <button
                              onClick={() => moveToTeamB(player)}
                              className="px-2 py-0.5 rounded bg-orange-600 hover:bg-orange-500 text-[10px] font-black text-white"
                              title="Vào Đội B"
                            >
                              + B
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2 Teams Side by Side (Desktop) or Stacked (Mobile) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TEAM A CARD */}
                <div className="bg-slate-800/60 border-2 border-blue-500/40 rounded-2xl p-4 flex flex-col shadow-lg">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase shadow-xs ${getKitBadgeStyle(teamA.kitColor)}`}>
                        Áo {teamA.kitColor}
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-wide">
                          {teamA.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-bold">
                          {rosterA.length} Cầu thủ
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Player List A */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                    {rosterA.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs font-bold">
                        Chưa có cầu thủ trong {teamA.name}. Hãy bấm "⚡ Tự Động Cân Vị Trí" hoặc gán từ danh sách trên!
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
                                onClick={() => moveToTeamB(player)}
                                className="p-1.5 rounded-lg bg-orange-600/30 hover:bg-orange-600 text-orange-300 hover:text-white text-[11px] font-black transition flex items-center gap-1"
                                title="Chuyển sang Đội B"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span className="hidden sm:inline">Sang B</span>
                              </button>
                              <button
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
                <div className="bg-slate-800/60 border-2 border-orange-500/40 rounded-2xl p-4 flex flex-col shadow-lg">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase shadow-xs ${getKitBadgeStyle(teamB.kitColor)}`}>
                        Áo {teamB.kitColor}
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-orange-400 uppercase tracking-wide">
                          {teamB.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-bold">
                          {rosterB.length} Cầu thủ
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Player List B */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                    {rosterB.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs font-bold">
                        Chưa có cầu thủ trong {teamB.name}. Hãy bấm "⚡ Tự Động Cân Vị Trí" hoặc gán từ danh sách trên!
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
                                onClick={() => moveToTeamA(player)}
                                className="p-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-black transition flex items-center gap-1"
                                title="Chuyển sang Đội A"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span className="hidden sm:inline">Sang A</span>
                              </button>
                              <button
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
            </div>
          ) : (
            /* Sa Bàn Chiến Thuật Tab */
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
                  🔵 Sa bàn {teamA.name} (Áo {teamA.kitColor})
                </button>
                <button
                  onClick={() => setPitchTeamTab('teamB')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                    pitchTeamTab === 'teamB'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🟠 Sa bàn {teamB.name} (Áo {teamB.kitColor})
                </button>
              </div>

              {/* Tactical Pitch for active team */}
              <div className="w-full max-w-md">
                <TacticalPitch
                  kitColor={pitchTeamTab === 'teamA' ? teamA.kitColor : teamB.kitColor}
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
        <div className="px-4 sm:px-6 py-3 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Tổng cộng: <b>{joinedMembers.length}</b> thành viên tham gia
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
