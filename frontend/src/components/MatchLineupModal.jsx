import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  Shield,
  Send,
  Save,
  RotateCcw,
  Sparkles,
  Crown,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  MapPin,
  Flame,
  UserCheck,
  UserX,
  Share2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import TacticalPitch, { FORMATIONS } from './TacticalPitch';

export default function MatchLineupModal({ match, isOpen, onClose, isAdmin }) {
  useBodyScrollLock(isOpen);
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Mode: 'view' | 'edit'
  const [mode, setMode] = useState(isAdmin ? 'edit' : 'view');
  const [formation, setFormation] = useState('2-3-1');
  const [starters, setStarters] = useState([]);
  const [substitutes, setSubstitutes] = useState([]);
  const [tacticsNote, setTacticsNote] = useState('');
  const [selectedPlayerToPlace, setSelectedPlayerToPlace] = useState(null);
  const [sendPushOnSave, setSendPushOnSave] = useState(true);
  const [activeTab, setActiveTab] = useState('joined'); // 'joined' | 'bench' | 'all'

  // Query Lineup and Players
  const { data: lineupRes, isLoading, refetch } = useQuery({
    queryKey: ['matchLineup', match?._id],
    queryFn: () => api.get(`/matches/${match._id}/lineup`),
    enabled: Boolean(isOpen && match?._id)
  });

  const lineupData = lineupRes?.data;

  // Initialize or reset formation and slots when lineup data changes
  useEffect(() => {
    if (!lineupData) return;

    const currentLineup = lineupData.lineup || {};
    const formKey = currentLineup.formation && FORMATIONS[currentLineup.formation]
      ? currentLineup.formation
      : '2-3-1';

    setFormation(formKey);
    setTacticsNote(currentLineup.tacticsNote || '');

    const defaultSlots = FORMATIONS[formKey].slots;

    if (currentLineup.starters && currentLineup.starters.length === 7) {
      setStarters(
        defaultSlots.map((defaultSlot, idx) => {
          const existing = currentLineup.starters[idx] || {};
          return {
            positionKey: existing.positionKey || defaultSlot.positionKey,
            positionName: existing.positionName || defaultSlot.positionName,
            x: defaultSlot.x,
            y: defaultSlot.y,
            userId: existing.userId || null,
            isCaptain: !!existing.isCaptain
          };
        })
      );
    } else {
      setStarters(
        defaultSlots.map(s => ({
          ...s,
          userId: null,
          isCaptain: false
        }))
      );
    }

    setSubstitutes(currentLineup.substitutes || []);
  }, [lineupData]);

  // Handle Changing Formation
  const handleFormationChange = (newFormationKey) => {
    if (!FORMATIONS[newFormationKey]) return;
    setFormation(newFormationKey);
    const newSlots = FORMATIONS[newFormationKey].slots;

    // Preserve already placed players in corresponding slots if possible
    setStarters((prev) => {
      return newSlots.map((newSlot, idx) => {
        const prevSlot = prev[idx];
        return {
          positionKey: newSlot.positionKey,
          positionName: newSlot.positionName,
          x: newSlot.x,
          y: newSlot.y,
          userId: prevSlot ? prevSlot.userId : null,
          isCaptain: prevSlot ? prevSlot.isCaptain : false
        };
      });
    });
  };

  // Players mapped from Check-in list
  const { joinedPlayers, uncertainPlayers, absentPlayers, allTeamPlayers } = useMemo(() => {
    if (!lineupData) return { joinedPlayers: [], uncertainPlayers: [], absentPlayers: [], allTeamPlayers: [] };

    const checkIns = lineupData.checkInList || [];
    const allUsers = lineupData.allUsers || [];

    const joined = [];
    const uncertain = [];
    const absent = [];

    checkIns.forEach(c => {
      const u = c.userId;
      if (!u) return;
      if (c.status === 'joined') joined.push(u);
      else if (c.status === 'uncertain') uncertain.push(u);
      else if (c.status === 'absent') absent.push(u);
    });

    return {
      joinedPlayers: joined,
      uncertainPlayers: uncertain,
      absentPlayers: absent,
      allTeamPlayers: allUsers
    };
  }, [lineupData]);

  // Set of player IDs currently on field
  const startersUserIds = useMemo(() => {
    return new Set(starters.filter(s => s.userId).map(s => (s.userId._id || s.userId).toString()));
  }, [starters]);

  // Assign player to slot
  const assignPlayerToSlot = (slotIndex, playerUser) => {
    if (!playerUser) return;
    const playerUserId = (playerUser._id || playerUser).toString();

    setStarters(prev => {
      // If player already on field in another slot, swap or clear
      return prev.map((s, idx) => {
        const currId = s.userId ? (s.userId._id || s.userId).toString() : null;
        if (idx === slotIndex) {
          return { ...s, userId: playerUser };
        }
        if (currId === playerUserId) {
          return { ...s, userId: null, isCaptain: false };
        }
        return s;
      });
    });

    // Remove from substitutes if present
    setSubstitutes(prev => prev.filter(sub => (sub._id || sub).toString() !== playerUserId));
    setSelectedPlayerToPlace(null);
  };

  // Drag & drop on slot
  const handleSlotDrop = (targetIndex, payload) => {
    if (payload.type === 'FROM_LIST') {
      assignPlayerToSlot(targetIndex, payload.user);
    } else if (payload.type === 'FROM_SLOT') {
      const sourceIndex = payload.sourceIndex;
      if (sourceIndex === targetIndex) return;

      setStarters(prev => {
        const next = [...prev];
        const sourceUser = next[sourceIndex].userId;
        const sourceCaptain = next[sourceIndex].isCaptain;
        const targetUser = next[targetIndex].userId;
        const targetCaptain = next[targetIndex].isCaptain;

        next[targetIndex] = { ...next[targetIndex], userId: sourceUser, isCaptain: sourceCaptain };
        next[sourceIndex] = { ...next[sourceIndex], userId: targetUser, isCaptain: targetCaptain };
        return next;
      });
    }
  };

  // Remove player from slot (move to bench)
  const handleRemovePlayerFromSlot = (slotIndex) => {
    setStarters(prev => {
      const next = [...prev];
      const removedUser = next[slotIndex].userId;
      if (removedUser) {
        // Add to substitutes
        const uid = (removedUser._id || removedUser).toString();
        setSubstitutes(subPrev => {
          if (!subPrev.some(s => (s._id || s).toString() === uid)) {
            return [...subPrev, removedUser];
          }
          return subPrev;
        });
      }
      next[slotIndex] = { ...next[slotIndex], userId: null, isCaptain: false };
      return next;
    });
  };

  // Toggle captain (C)
  const handleToggleCaptain = (slotIndex) => {
    setStarters(prev => {
      return prev.map((s, idx) => {
        if (idx === slotIndex) {
          return { ...s, isCaptain: !s.isCaptain };
        }
        // Only one captain at a time
        return { ...s, isCaptain: false };
      });
    });
  };

  // Auto fill starting lineup based on positions and joined voters
  const handleAutoFill = () => {
    const available = [...joinedPlayers, ...uncertainPlayers].filter(
      u => !startersUserIds.has(u._id.toString())
    );

    if (available.length === 0) {
      toast.info('Tất cả cầu thủ tham gia đã được xếp trên sân.');
      return;
    }

    setStarters(prev => {
      const next = [...prev];
      const unassignedPool = [...available];

      next.forEach((slot, idx) => {
        if (slot.userId) return; // already filled

        // Try to match position preference
        let matchIdx = -1;
        if (slot.positionKey === 'GK') {
          matchIdx = unassignedPool.findIndex(u => u.position?.toLowerCase().includes('thủ môn') || u.position?.toLowerCase().includes('gk'));
        } else if (['LB', 'RB', 'CB', 'LCB', 'RCB'].includes(slot.positionKey)) {
          matchIdx = unassignedPool.findIndex(u => u.position?.toLowerCase().includes('hậu vệ') || u.position?.toLowerCase().includes('cb') || u.position?.toLowerCase().includes('df'));
        } else if (['LM', 'RM', 'CM', 'CDM', 'LAM', 'RAM', 'LCM', 'RCM'].includes(slot.positionKey)) {
          matchIdx = unassignedPool.findIndex(u => u.position?.toLowerCase().includes('tiền vệ') || u.position?.toLowerCase().includes('mf'));
        } else if (['ST', 'LS', 'RS'].includes(slot.positionKey)) {
          matchIdx = unassignedPool.findIndex(u => u.position?.toLowerCase().includes('tiền đạo') || u.position?.toLowerCase().includes('fw') || u.position?.toLowerCase().includes('st'));
        }

        if (matchIdx !== -1) {
          next[idx] = { ...slot, userId: unassignedPool[matchIdx] };
          unassignedPool.splice(matchIdx, 1);
        } else if (unassignedPool.length > 0) {
          // Take first available
          next[idx] = { ...slot, userId: unassignedPool[0] };
          unassignedPool.splice(0, 1);
        }
      });

      return next;
    });

    toast.success('Đã tự động xếp đội hình theo vị trí sở trường!');
  };

  // Reset starting 7
  const handleResetPitch = () => {
    setStarters(prev => prev.map(s => ({ ...s, userId: null, isCaptain: false })));
    toast.info('Đã xoá toàn bộ cầu thủ trên sa bàn.');
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (payload) => api.put(`/matches/${match._id}/lineup`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['matchLineup', match._id] });
      toast.success(res.data?.message || 'Đã lưu đội hình thành công!', 'Chiến thuật');
      if (res.data?.data) {
        setMode('view');
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi lưu đội hình', 'Lỗi');
    }
  });

  const handleSaveLineup = () => {
    saveMutation.mutate({
      formation,
      starters: starters.map(s => ({
        positionKey: s.positionKey,
        positionName: s.positionName,
        x: s.x,
        y: s.y,
        userId: s.userId ? (s.userId._id || s.userId) : null,
        isCaptain: s.isCaptain
      })),
      substitutes: substitutes.map(sub => sub._id || sub),
      tacticsNote,
      isPublished: true,
      sendPush: sendPushOnSave
    });
  };

  // Push Notification standalone trigger mutation
  const pushNotificationMutation = useMutation({
    mutationFn: () => api.post(`/matches/${match._id}/lineup/notify`),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Đã bắn push notification cho các thành viên!', 'Thông báo');
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi gửi thông báo', 'Lỗi');
    }
  });

  if (!isOpen || !match) return null;

  const currentFormationInfo = FORMATIONS[formation] || FORMATIONS['2-3-1'];
  const filledStartersCount = starters.filter(s => s.userId).length;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div
        className="relative bg-slate-900 border border-slate-700/80 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={() => setSelectedPlayerToPlace(null)}
      >
        {/* 🌟 Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white truncate tracking-wide">
                  Đội hình ra sân vs {match.opponent?.teamName || 'Đối thủ'}
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                  Sân 7
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {match.time} • {match.date}
                </span>
                <span className="hidden md:flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {match.stadium}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    mode === 'view'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Xem
                </button>
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    mode === 'edit'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Chỉnh sửa
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 📋 Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ⚽ Left Column: Tactical Pitch */}
          <div className="lg:col-span-6 flex flex-col items-center justify-start space-y-3">
            {/* Formation & Quick Stats Bar */}
            <div className="w-full flex items-center justify-between bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-2xl p-2.5 px-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Sơ đồ:</span>
                {mode === 'edit' ? (
                  <select
                    value={formation}
                    onChange={(e) => handleFormationChange(e.target.value)}
                    className="bg-slate-900 text-emerald-400 text-xs font-black px-2.5 py-1 rounded-lg border border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(FORMATIONS).map(([key, f]) => (
                      <option key={key} value={key}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-xs border border-emerald-500/30">
                    {currentFormationInfo.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">
                  {filledStartersCount}/7 <span className="text-slate-500 font-normal">chính thức</span>
                </span>
              </div>
            </div>

            {/* Hint for mobile / tap to place */}
            {mode === 'edit' && selectedPlayerToPlace && (
              <div className="w-full p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between animate-pulse">
                <span className="font-semibold truncate">
                  👉 Chạm vào 1 vị trí trên sân để xếp <strong>{selectedPlayerToPlace.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlayerToPlace(null);
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/30 rounded hover:bg-amber-500/50"
                >
                  Huỷ
                </button>
              </div>
            )}

            {/* 🏟️ The Pitch Component */}
            <div className="w-full flex justify-center">
              <TacticalPitch
                starters={starters}
                onSlotDrop={handleSlotDrop}
                onRemovePlayer={handleRemovePlayerFromSlot}
                onToggleCaptain={handleToggleCaptain}
                onSlotClick={(slotIdx) => {
                  if (selectedPlayerToPlace) {
                    assignPlayerToSlot(slotIdx, selectedPlayerToPlace);
                  }
                }}
                selectedPlayerToPlace={selectedPlayerToPlace}
                kitColor={match.kitColor}
                isEditable={mode === 'edit'}
              />
            </div>

            {/* Formation description */}
            <p className="text-[11px] text-slate-400 text-center italic">
              {currentFormationInfo.description}
            </p>
          </div>

          {/* 👥 Right Column: Squad, Bench & Tactics Note */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            {/* Quick Actions (Admin Edit Mode) */}
            {mode === 'edit' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs shadow-md hover:from-teal-500 hover:to-emerald-500 transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Tự động xếp nhanh
                </button>
                <button
                  type="button"
                  onClick={handleResetPitch}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-rose-300 font-bold text-xs border border-rose-500/30 hover:bg-rose-500/10 transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  Xoá sa bàn
                </button>
              </div>
            )}

            {/* Squad Tabs */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/70 p-3.5 flex flex-col flex-1">
              <div className="flex items-center gap-2 border-b border-slate-700/60 pb-2 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('joined')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'joined'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Tham gia & 50-50 ({joinedPlayers.length + uncertainPlayers.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('bench')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'bench'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Dự bị ({substitutes.length})
                </button>

                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeTab === 'all'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tất cả đội ({allTeamPlayers.length})
                  </button>
                )}
              </div>

              {/* Player Cards List */}
              <div className="flex-1 overflow-y-auto max-h-56 sm:max-h-64 space-y-2 pr-1 custom-scrollbar">
                {activeTab === 'joined' && (
                  <>
                    {joinedPlayers.length === 0 && uncertainPlayers.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        Chưa có thành viên nào điểm danh tham gia.
                      </div>
                    ) : (
                      <>
                        {/* Confirmed Joined */}
                        {joinedPlayers.map(p => {
                          const isOnField = startersUserIds.has(p._id.toString());
                          const isSelected = selectedPlayerToPlace?._id === p._id;

                          return (
                            <div
                              key={p._id}
                              draggable={mode === 'edit' && !isOnField}
                              onDragStart={(e) => {
                                if (mode !== 'edit' || isOnField) return;
                                e.dataTransfer.setData(
                                  'application/json',
                                  JSON.stringify({ type: 'FROM_LIST', user: p })
                                );
                              }}
                              onClick={(e) => {
                                if (mode !== 'edit') return;
                                e.stopPropagation();
                                if (isOnField) return;
                                setSelectedPlayerToPlace(isSelected ? null : p);
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl border transition ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50'
                                  : isOnField
                                  ? 'bg-slate-900/40 border-slate-800 opacity-60'
                                  : 'bg-slate-800/80 border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800 cursor-pointer active:scale-[0.98]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-700 shrink-0 border border-slate-600">
                                  {p.avatar ? (
                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                      {p.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                    {p.number && (
                                      <span className="text-[10px] font-black text-amber-400">#{p.number}</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-emerald-400">
                                    {p.position || 'Cầu thủ'} • <span className="text-emerald-300">Tham gia</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isOnField ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Đá chính
                                  </span>
                                ) : mode === 'edit' ? (
                                  <span className="text-[11px] font-bold text-amber-400 hover:underline">
                                    {isSelected ? 'Đang chọn...' : '+ Kéo / Chạm'}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}

                        {/* Uncertain (50-50) */}
                        {uncertainPlayers.map(p => {
                          const isOnField = startersUserIds.has(p._id.toString());
                          const isSelected = selectedPlayerToPlace?._id === p._id;

                          return (
                            <div
                              key={p._id}
                              draggable={mode === 'edit' && !isOnField}
                              onDragStart={(e) => {
                                if (mode !== 'edit' || isOnField) return;
                                e.dataTransfer.setData(
                                  'application/json',
                                  JSON.stringify({ type: 'FROM_LIST', user: p })
                                );
                              }}
                              onClick={(e) => {
                                if (mode !== 'edit') return;
                                e.stopPropagation();
                                if (isOnField) return;
                                setSelectedPlayerToPlace(isSelected ? null : p);
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl border transition ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50'
                                  : isOnField
                                  ? 'bg-slate-900/40 border-slate-800 opacity-60'
                                  : 'bg-slate-800/80 border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-800 cursor-pointer active:scale-[0.98]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-700 shrink-0 border border-slate-600">
                                  {p.avatar ? (
                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                      {p.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                    {p.number && (
                                      <span className="text-[10px] font-black text-amber-400">#{p.number}</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-amber-400">
                                    {p.position || 'Cầu thủ'} • <span className="text-amber-300">50-50</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isOnField ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Đá chính
                                  </span>
                                ) : mode === 'edit' ? (
                                  <span className="text-[11px] font-bold text-amber-400 hover:underline">
                                    {isSelected ? 'Đang chọn...' : '+ Kéo / Chạm'}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                )}

                {activeTab === 'bench' && (
                  <>
                    {substitutes.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        Băng ghế dự bị chưa có cầu thủ nào.
                      </div>
                    ) : (
                      substitutes.map(sub => {
                        const p = sub;
                        const isSelected = selectedPlayerToPlace?._id === p._id;

                        return (
                          <div
                            key={p._id}
                            draggable={mode === 'edit'}
                            onDragStart={(e) => {
                              if (mode !== 'edit') return;
                              e.dataTransfer.setData(
                                'application/json',
                                JSON.stringify({ type: 'FROM_LIST', user: p })
                              );
                            }}
                            onClick={(e) => {
                              if (mode !== 'edit') return;
                              e.stopPropagation();
                              setSelectedPlayerToPlace(isSelected ? null : p);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border bg-slate-800/80 border-slate-700/80 transition ${
                              isSelected ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50' : 'hover:border-emerald-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 shrink-0 border border-slate-600">
                                {p.avatar ? (
                                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                    {p.name?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400">{p.position || 'Dự bị'}</p>
                              </div>
                            </div>

                            {mode === 'edit' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSubstitutes(prev => prev.filter(s => s._id !== p._id));
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-400"
                                title="Xoá khỏi dự bị"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {activeTab === 'all' && (
                  allTeamPlayers.map(p => {
                    const isOnField = startersUserIds.has(p._id.toString());
                    const isSelected = selectedPlayerToPlace?._id === p._id;

                    return (
                      <div
                        key={p._id}
                        draggable={mode === 'edit' && !isOnField}
                        onDragStart={(e) => {
                          if (mode !== 'edit' || isOnField) return;
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ type: 'FROM_LIST', user: p })
                          );
                        }}
                        onClick={(e) => {
                          if (mode !== 'edit') return;
                          e.stopPropagation();
                          if (isOnField) return;
                          setSelectedPlayerToPlace(isSelected ? null : p);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border transition ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400'
                            : isOnField
                            ? 'bg-slate-900/40 border-slate-800 opacity-60'
                            : 'bg-slate-800/80 border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 shrink-0 border border-slate-600">
                            {p.avatar ? (
                              <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                {p.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.position || 'Cầu thủ'}</p>
                          </div>
                        </div>
                        {isOnField ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Đá chính
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-400 hover:underline">
                            + Xếp
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Tactics & Strategy Note */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/70 p-3.5 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Ghi chú & Dặn dò chiến thuật của BHL
              </label>
              {mode === 'edit' ? (
                <textarea
                  value={tacticsNote}
                  onChange={(e) => setTacticsNote(e.target.value)}
                  placeholder="VD: Chủ động áp sát từ đầu, chuyền ban bật nhỏ, hậu vệ giữ cự ly bọc lót..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 italic min-h-[44px]">
                  {tacticsNote ? tacticsNote : 'Chưa có ghi chú chiến thuật cho trận đấu này.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🚀 Footer Controls */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-800/90 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isAdmin && mode === 'view' && (
              <button
                type="button"
                onClick={() => pushNotificationMutation.mutate()}
                disabled={pushNotificationMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/40 text-xs font-bold hover:bg-blue-600/30 transition active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {pushNotificationMutation.isPending ? 'Đang gửi...' : 'Bắn Push thông báo'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {mode === 'edit' && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none mr-2">
                <input
                  type="checkbox"
                  checked={sendPushOnSave}
                  onChange={(e) => setSendPushOnSave(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                />
                <span>Bắn thông báo (Push & In-app) cho anh em</span>
              </label>
            )}

            {mode === 'edit' ? (
              <button
                type="button"
                onClick={handleSaveLineup}
                disabled={saveMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-black shadow-lg hover:bg-emerald-500 transition active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Đang lưu...' : 'Lưu đội hình'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-700 text-white text-xs sm:text-sm font-bold hover:bg-slate-600 transition"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
