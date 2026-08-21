import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, MapPin, DollarSign, Users, Copy, CheckCircle2, XCircle, HelpCircle, Edit3, Trophy, Plus, Minus, Trash2, X, Zap, Send, Shirt, Bell, Star, Award, Crown, Flame } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import teamLogo from '../asset/logo.png';
import { useToast } from '../context/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export default function MatchCard({ match, onCheckIn, onClone, onDelete, onNotify, onNotifyPush, isAdmin }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const getKitColorClass = (color) => {
    switch (color?.toLowerCase()) {
      case 'xanh dương':
      case 'xanh':
        return 'text-blue-600';
      case 'đỏ':
        return 'text-rose-600';
      case 'đen':
        return 'text-slate-800';
      default:
        return 'text-slate-500';
    }
  };
  const toast = useToast();

  const [showMembers, setShowMembers] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMvpModal, setShowMvpModal] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [selectedMvpCandidate, setSelectedMvpCandidate] = useState('');

  const formatDateWithDay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[d.getDay()];
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${dayName}, ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return `${dayName}, ${dateStr}`;
    } catch {
      return dateStr;
    }
  };

  const [showResultModal, setShowResultModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  // Reason Modal State for 'uncertain' and 'absent'
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null); // 'uncertain' | 'absent'
  const [reasonInput, setReasonInput] = useState('');
  const [reasonError, setReasonError] = useState('');

  // Query MVP stats for this match
  const { data: mvpStatsRes } = useQuery({
    queryKey: ['matchMvpStats', match._id],
    queryFn: () => api.get(`/matches/${match._id}/mvp-stats`),
    enabled: showMvpModal || match.status === 'completed'
  });
  const mvpStats = mvpStatsRes?.data;

  // MVP Vote Mutation
  const voteMvpMutation = useMutation({
    mutationFn: (candidateId) => api.post(`/matches/${match._id}/vote-mvp`, { candidateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['matchMvpStats', match._id] });
      queryClient.invalidateQueries({ queryKey: ['forceMvpVoteMatch'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('mvp.vote_success'), 'MVP');
    },
    onError: (err) => {
      toast.error(err.message || t('mvp.vote_fail'), 'Lỗi');
    }
  });

  // Finalize MVP Mutation
  const finalizeMvpMutation = useMutation({
    mutationFn: () => api.post(`/matches/${match._id}/finalize-mvp`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['matchMvpStats', match._id] });
      queryClient.invalidateQueries({ queryKey: ['forceMvpVoteMatch'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('mvp.finalize_success'), 'MVP');
      setShowFinalizeConfirm(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi chốt MVP', 'Lỗi');
    }
  });

  // Query team members list for goal scorer dropdown selection
  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users')
  });

  const memberList = Array.isArray(usersRes?.data) ? usersRes.data : [];

  // Edit Match State
  const [editForm, setEditForm] = useState({
    date: match.date || '',
    time: match.time || '',
    stadium: match.stadium || '',
    stadiumLink: match.stadiumLink || '',
    pitchCost: match.pitchCost || 0,
    deal: match.deal || '5-5',
    kitColor: match.kitColor || '',
    opponentName: match.opponent?.teamName || '',
    opponentPhone: match.opponent?.phone || '',
    opponentFbLink: match.opponent?.fbLink || '',
    status: match.status || 'upcoming',
    notes: match.notes || ''
  });

  // Result & Scorers State
  const [resultForm, setResultForm] = useState({
    homeScore: match.score?.homeScore ?? 0,
    awayScore: match.score?.awayScore ?? 0,
    status: match.status === 'upcoming' ? 'completed' : match.status,
    scorers: match.scorers || [],
    motm: match.motm || ''
  });

  const [selectedMember, setSelectedMember] = useState('');
  const [customPlayerName, setCustomPlayerName] = useState('');
  const [selectedAssister, setSelectedAssister] = useState('');
  const [customAssisterName, setCustomAssisterName] = useState('');
  const [newScorer, setNewScorer] = useState({ minute: '', count: 1 });

  const summary = match.checkInSummary || { joined: 0, uncertain: 0, absent: 0, pending: 0 };
  const totalCheckIn = summary.joined + summary.uncertain + summary.absent + summary.pending || 1;
  const joinedPct = Math.round((summary.joined / totalCheckIn) * 100);
  const uncertainPct = Math.round((summary.uncertain / totalCheckIn) * 100);
  const absentPct = Math.round((summary.absent / totalCheckIn) * 100);

  const userStatus = match.userCheckInStatus || 'pending';

  // Open reason modal
  const handleOpenReasonModal = (status) => {
    setTargetStatus(status);
    setReasonInput(match.userCheckInReason || '');
    setReasonError('');
    setShowReasonModal(true);
  };

  // Submit checkin with reason
  const handleConfirmReason = (e) => {
    e.preventDefault();
    if (!reasonInput.trim()) {
      setReasonError('Bắt buộc phải nhập lý do để ban quản lý nắm tình hình nhân sự!');
      return;
    }
    onCheckIn(match._id, targetStatus, reasonInput.trim());
    setShowReasonModal(false);
  };

  // Handle Edit Save
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/matches/${match._id}`, {
        date: editForm.date,
        time: editForm.time,
        stadium: editForm.stadium,
        stadiumLink: editForm.stadiumLink,
        pitchCost: Number(editForm.pitchCost),
        deal: editForm.deal,
        kitColor: editForm.kitColor,
        opponent: {
          teamName: editForm.opponentName,
          phone: editForm.opponentPhone,
          fbLink: editForm.opponentFbLink
        },
        status: editForm.status,
        notes: editForm.notes
      });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Đã cập nhật thông tin trận đấu thành công!', 'Sửa Trận Đấu');
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.message || 'Lỗi khi cập nhật trận đấu', 'Lỗi');
    }
  };

  // Handle Result Save
  const handleSaveResult = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/matches/${match._id}/result`, {
        homeScore: Number(resultForm.homeScore),
        awayScore: Number(resultForm.awayScore),
        scorers: resultForm.scorers,
        motm: resultForm.motm,
        status: resultForm.status
      });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Đã cập nhật tỉ số và danh sách cầu thủ ghi bàn!', 'Tỉ Số Realtime');
      setShowResultModal(false);
    } catch (err) {
      toast.error(err.message || 'Lỗi khi cập nhật tỉ số', 'Lỗi');
    }
  };

  // Add Scorer to list
  const handleAddScorer = () => {
    const finalName = selectedMember === 'CUSTOM' ? customPlayerName.trim() : selectedMember.trim();
    if (!finalName) return;

    const finalAssister = selectedAssister === 'CUSTOM' ? customAssisterName.trim() : selectedAssister.trim();

    setResultForm({
      ...resultForm,
      scorers: [
        ...resultForm.scorers,
        { playerName: finalName, assisterName: finalAssister, minute: newScorer.minute.trim(), count: Number(newScorer.count) || 1 }
      ]
    });
    setSelectedMember('');
    setCustomPlayerName('');
    setSelectedAssister('');
    setCustomAssisterName('');
    setNewScorer({ minute: '', count: 1 });
  };

  // Remove Scorer from list
  const handleRemoveScorer = (index) => {
    const updated = [...resultForm.scorers];
    updated.splice(index, 1);
    setResultForm({ ...resultForm, scorers: updated });
  };

  return (
    <div className="app-card p-3 md:p-4 lg:p-5 border border-slate-200 hover:border-blue-400 transition-all duration-300 shadow-md bg-white flex flex-col justify-between relative">
      <div>
        {/* Match Header */}
        <div className="flex items-start sm:items-center justify-between border-b border-slate-100 pb-3 mb-3 text-xs flex-col sm:flex-row gap-3 sm:gap-2">
          <div className="flex items-start sm:items-center gap-2 flex-1 pr-2 w-full">
            <span className="w-2.5 h-2.5 rounded-full bg-[#374df5] shrink-0 mt-1 sm:mt-0" />
            <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] break-words line-clamp-2">
              ⚽ {match.stadium ? `${t('matchcard.friendly')} • ${match.stadium}` : t('matchcard.friendly')}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1.5 shrink-0 flex-wrap w-full sm:w-auto">
            {match.status === 'live' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse flex items-center gap-1">
                <Zap className="w-3 h-3 fill-white" /> {t('matchcard.live')}
              </span>
            )}

            {match.status === 'upcoming' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#374df5] text-white">
                {t('matchcard.upcoming')}
              </span>
            )}

            {match.status === 'completed' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-700 text-white">
                {t('matchcard.completed')}
              </span>
            )}

            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowEditModal(true)}
                  title="Chỉnh sửa thông tin trận đấu"
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onClone(match._id)}
                  title="Sao chép tạo trận đấu tương tự"
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  title="Xóa trận đấu"
                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    if (match.isNotified) return;
                    setShowNotifyModal(true);
                  }}
                  disabled={match.isNotified}
                  title={match.isNotified ? 'Đã gửi Email' : 'Gửi Email thông báo'}
                  className={`p-1 rounded-lg transition ${
                    match.isNotified
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
                
                <button
                  onClick={() => onNotifyPush(match._id)}
                  title="Gửi Push Notification & App Popup (Có thể gửi nhiều lần)"
                  className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition ml-1"
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scoreboard Grid */}
        <div className="p-2 md:p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mb-4">
          <div className="flex items-center justify-between gap-2">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center text-center w-0">
              <div className="w-12 h-12 rounded-2xl shadow-md mb-1.5 overflow-hidden border-2 border-white shrink-0">
                <img src={teamLogo} alt="FC Nhà Trẻ" className="w-full h-full object-cover" />
              </div>
              <span className="font-black text-sm text-slate-900 line-clamp-1 w-full px-1">FC Nhà Trẻ</span>
              <span className="text-[10px] font-bold text-slate-500">{t('matchcard.home_team')}</span>
            </div>

            {/* Score Display */}
            <div className="flex flex-col items-center justify-center px-4">
              {match.status === 'completed' || match.status === 'live' ? (
                <div className="flex items-center gap-2 bg-[#2c3ec4] text-white px-4 py-1.5 rounded-2xl shadow-md font-mono font-black text-2xl">
                  <span>{match.score?.homeScore ?? 0}</span>
                  <span className="text-white/60 text-sm">-</span>
                  <span>{match.score?.awayScore ?? 0}</span>
                </div>
              ) : (
                <div className="bg-slate-200 text-slate-700 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                  VS
                </div>
              )}
              <span className="text-[11px] font-black text-slate-600 mt-1">{match.time}</span>
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center text-center w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-400 to-rose-500 text-white flex items-center justify-center font-black text-xl shadow-md mb-1.5 shrink-0">
                ⚔️
              </div>
              <span className="font-black text-sm text-slate-900 line-clamp-1 w-full px-1">{match.opponent?.teamName || t('matchcard.awaiting_opponent')}</span>
              {match.opponent?.fbLink ? (
                <a href={match.opponent.fbLink} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline line-clamp-1 px-1">{t('matchcard.opponent_fb')}</a>
              ) : (
                <span className="text-[10px] font-bold text-slate-500">{t('matchcard.opponent')}</span>
              )}
            </div>
          </div>

          {/* Goal Scorers List */}
          {match.scorers && match.scorers.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-200/80 text-xs">
              <div className="text-[11px] font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
                ⚽ {t('matchcard.fc_nhatre_scorers')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {match.scorers.map((sc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-slate-300 font-bold text-slate-900 text-[11px] shadow-2xs">
                    <span>⚽</span>
                    <span>{sc.playerName}</span>
                    {sc.minute && <span className="text-slate-500">({sc.minute})</span>}
                    {sc.count > 1 && <span className="text-rose-600 font-black">x{sc.count}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Admin Button: Update Score */}
          {isAdmin && (
            <button
              onClick={() => setShowResultModal(true)}
              className="w-full mt-3 py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#2c3ec4] border border-[#2c3ec4]/30 font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{t('matchcard.update_score_btn')}</span>
            </button>
          )}
        </div>

        {/* ⭐ MVP SECTION (For completed matches) */}
        {match.status === 'completed' && (
          <div className="mb-4">
            {match.motm ? (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/20 to-amber-500/10 border-2 border-amber-400 shadow-xs flex items-center justify-between gap-2.5 relative overflow-hidden">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center font-black text-xl shadow-sm shrink-0 border border-amber-300">
                    👑
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {t('matchcard.mvp_winner')}
                    </div>
                    <div className="text-sm font-black text-slate-900 truncate">
                      {match.motm}
                    </div>
                    {match.motmReason && (
                      <div className="text-[10px] font-bold text-amber-900/80 truncate">
                        {match.motmReason}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMvpModal(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 font-extrabold text-[11px] border border-amber-300 shadow-2xs transition shrink-0 flex items-center gap-1"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t('matchcard.mvp_view_votes')}</span>
                </button>
              </div>
            ) : match.isMvpVotingOpen ? (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-300 shadow-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-lg shrink-0 animate-pulse">
                    ⭐
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                      {t('matchcard.mvp_voting')}
                    </div>
                    <div className="text-[10px] font-bold text-amber-800">
                      {mvpStats?.totalVotes ?? match.mvpVotes?.length ?? 0} / {mvpStats?.totalJoined ?? summary.joined ?? 0} {t('matchcard.mvp_votes_count')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMvpModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-[11px] shadow-sm transition flex items-center gap-1"
                  >
                    <Star className="w-3 h-3 fill-slate-950" />
                    <span>{t('matchcard.mvp_vote_btn')}</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowFinalizeConfirm(true)}
                      title={t('matchcard.mvp_finalize_early')}
                      className="p-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-xs transition border border-amber-300"
                    >
                      👑
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Match Specs Bar */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-[11px] font-bold text-slate-800">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 truncate">
            <Calendar className="w-3.5 h-3.5 text-[#374df5]" />
            <span>{formatDateWithDay(match.date)}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 truncate">
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
            <span>{match.time}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <div className="truncate flex-1">
              <span>{match.stadium}</span>
              {match.stadiumLink && (
                <a href={match.stadiumLink} target="_blank" rel="noreferrer" className="ml-2 text-[10px] text-blue-600 underline font-black">
                  {t('matchcard.map')}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 truncate">
            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            <span>{match.pitchCost?.toLocaleString('vi-VN')} đ ({match.deal})</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 truncate">
            <Shirt className={`w-3.5 h-3.5 ${getKitColorClass(match.kitColor)}`} />
            <span>{t('matchcard.color')} <span className={`uppercase ${getKitColorClass(match.kitColor)}`}>{match.kitColor || t('matchcard.undecided')}</span></span>
          </div>
        </div>

        {/* Check-in Multi-state Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1 font-bold">
            <span className="text-slate-800">{t('matchcard.attendance')} ({summary.joined} {t('matchcard.joined')})</span>
            <span className="text-emerald-700 font-black">{joinedPct}% {t('matchcard.ratio')}</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex">
            <div style={{ width: `${joinedPct}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`${summary.joined} ${t('matchcard.joined')}`} />
            <div style={{ width: `${uncertainPct}%` }} className="bg-amber-400 h-full transition-all duration-500" title={`${summary.uncertain} ${t('matchcard.uncertain')}`} />
            <div style={{ width: `${absentPct}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`${summary.absent} ${t('matchcard.absent')}`} />
          </div>

          <div className="flex items-center justify-between text-[10px] font-extrabold mt-1 text-slate-600">
            <span className="text-emerald-700">✓ {summary.joined} {t('matchcard.will_play')}</span>
            <span className="text-amber-700">? {summary.uncertain} {t('matchcard.uncertain')}</span>
            <span className="text-rose-700">✕ {summary.absent} {t('matchcard.absent')}</span>
          </div>
        </div>

        {/* Member Check-in List Toggle */}
        <button
          onClick={() => setShowMembers(true)}
          className="w-full text-center text-xs font-black text-slate-600 hover:text-[#374df5] py-1.5 transition flex items-center justify-center gap-1 border-t border-slate-100"
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('matchcard.view_details')}</span>
        </button>
      </div>

      {/* User Action Footer (3 Options: Joined, Uncertain, Absent) */}
      {match.status === 'upcoming' && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5">
          {/* Option 1: Joined */}
          <button
            onClick={() => onCheckIn(match._id, 'joined', '')}
            className={`flex-1 py-2 px-2 rounded-full text-[11px] font-black flex items-center justify-center gap-1 transition ${
              userStatus === 'joined'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 hover:bg-emerald-50 text-emerald-800 border border-slate-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {userStatus === 'joined' ? t('matchcard.registered') : t('matchcard.play')}
          </button>

          {/* Option 2: Uncertain (Requires reason!) */}
          <button
            onClick={() => handleOpenReasonModal('uncertain')}
            className={`flex-1 py-2 px-2 rounded-full text-[11px] font-black flex items-center justify-center gap-1 transition ${
              userStatus === 'uncertain'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-slate-100 hover:bg-amber-50 text-amber-800 border border-slate-300'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {userStatus === 'uncertain' ? t('matchcard.uncertain') : t('matchcard.uncertain_btn')}
          </button>

          {/* Option 3: Absent (Requires reason!) */}
          <button
            onClick={() => handleOpenReasonModal('absent')}
            className={`flex-1 py-2 px-2 rounded-full text-[11px] font-black flex items-center justify-center gap-1 transition ${
              userStatus === 'absent'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-100 hover:bg-rose-50 text-rose-800 border border-slate-300'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            {userStatus === 'absent' ? t('matchcard.absent_btn_done') : t('matchcard.absent_btn')}
          </button>
        </div>
      )}

      {/* 📋 MODAL: SHOW MEMBERS LIST */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 relative bg-white border border-[#374df5] shadow-2xl flex flex-col max-h-[80vh]">
            <button onClick={() => setShowMembers(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
              📋 {t('matchcard.attendance_list')}
            </h3>
            <p className="text-xs text-slate-500 font-bold mb-4">
              {t('matchcard.attendance_date')} {match.date}
            </p>
            
            <div className="overflow-y-auto space-y-2 pr-1 text-xs">
              {match.checkInList?.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.userId?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt="User"
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-300"
                    />
                    <div>
                      <span className="text-slate-900 font-black text-[13px]">{item.userId?.name || t('matchcard.member')}</span>
                      {item.userId?.position && (
                        <span className="text-[11px] text-slate-500 font-bold block">{item.userId.position}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    {item.status === 'joined' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ĐÁ
                      </span>
                    )}

                    {item.status === 'uncertain' && (
                      <div className="bg-amber-100 text-amber-900 px-2 py-1 rounded-lg border border-amber-300 font-bold text-[11px] max-w-[150px]">
                        <span className="font-black">❓ 50-50:</span> "{item.reason || 'Chưa ghi lý do'}"
                      </div>
                    )}

                    {item.status === 'absent' && (
                      <div className="bg-rose-100 text-rose-900 px-2 py-1 rounded-lg border border-rose-300 font-bold text-[11px] max-w-[150px]">
                        <span className="font-black">✕ Xin nghỉ:</span> "{item.reason || 'Chưa ghi lý do'}"
                      </div>
                    )}

                    {item.status === 'pending' && (
                      <span className="text-slate-400 font-bold text-[11px] px-2 py-1 bg-slate-100 rounded-lg">⌛ Chờ chốt</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ❓ MANDATORY REASON MODAL FOR UNCERTAIN & ABSENT */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 relative bg-white border-2 border-amber-400 shadow-2xl">
            <button onClick={() => setShowReasonModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
              {targetStatus === 'uncertain' ? '❓ Lý Do Chưa Chắc Chắn Tham Gia' : '✕ Lý Do Báo Vắng Mặt'}
            </h3>
            <p className="text-xs text-slate-500 font-bold mb-4">
              Vui lòng nhập lý do cụ thể để ban quản lý nắm được tình hình đội hình.
            </p>

            <form onSubmit={handleConfirmReason} className="space-y-4">
              {reasonError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 font-bold text-xs">
                  ⚠️ {reasonError}
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Lý do chi tiết (Bắt buộc):</label>
                <textarea
                  rows="3"
                  required
                  autoFocus
                  placeholder={
                    targetStatus === 'uncertain'
                      ? 'Sốt nhẹ, đang chờ xem tình hình / Tăng ca 20h nếu xong sớm sẽ ra sân...'
                      : 'Bận công tác xa / Chấn thương đầu gối / Việc gia đình đột xuất...'
                  }
                  value={reasonInput}
                  onChange={(e) => {
                    setReasonInput(e.target.value);
                    if (e.target.value.trim()) setReasonError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowReasonModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Hủy
                </button>

                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-full font-black text-xs text-white shadow-md transition ${
                    targetStatus === 'uncertain' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Xác Nhận điểm Danh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ MODAL 1: EDIT MATCH DETAILS */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 relative bg-white border border-[#374df5] shadow-2xl">
            <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1">✏️ Chỉnh Sửa Thông Tin Trận Đấu</h3>
            <p className="text-xs text-slate-500 font-bold mb-4">Cập nhật thời gian, sân bóng và đối thủ</p>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày đá:</label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giờ đá:</label>
                  <input
                    type="time"
                    required
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên sân bóng:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Sân Ngọc Minh, Sân Viettel 1..."
                    value={editForm.stadium}
                    onChange={(e) => setEditForm({ ...editForm, stadium: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link Google Maps:</label>
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/..."
                    value={editForm.stadiumLink}
                    onChange={(e) => setEditForm({ ...editForm, stadiumLink: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên đội đối thủ:</label>
                  <input
                    type="text"
                    placeholder="VD: FC Thăng Long"
                    value={editForm.opponentName}
                    onChange={(e) => setEditForm({ ...editForm, opponentName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SĐT liên hệ:</label>
                  <input
                    type="text"
                    placeholder="0987654321"
                    value={editForm.opponentPhone}
                    onChange={(e) => setEditForm({ ...editForm, opponentPhone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link Facebook Đội bạn:</label>
                <input
                  type="text"
                  placeholder="https://facebook.com/..."
                  value={editForm.opponentFbLink || ''}
                  onChange={(e) => setEditForm({ ...editForm, opponentFbLink: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiền sân (VNĐ):</label>
                  <input
                    type="number"
                    value={editForm.pitchCost}
                    onChange={(e) => setEditForm({ ...editForm, pitchCost: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Màu áo thi đấu:</label>
                  <select
                    value={editForm.kitColor}
                    onChange={(e) => setEditForm({ ...editForm, kitColor: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  >
                    <option value="">-- Chưa chốt --</option>
                    <option value="xanh dương">Xanh dương</option>
                    <option value="đỏ">Đỏ</option>
                    <option value="đen">Đen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kèo giao hữu:</label>
                  <input
                    type="text"
                    placeholder="5-5 / 6-4"
                    value={editForm.deal}
                    onChange={(e) => setEditForm({ ...editForm, deal: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái:</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950"
                  >
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="live">Đang Live</option>
                    <option value="completed">Đã kết thúc</option>
                    <option value="cancelled">Hủy trận</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-full bg-[#374df5] text-white font-black text-xs shadow-md">
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚽ MODAL 2: UPDATE RESULT & SCORERS */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-lg glass-modal rounded-3xl p-6 relative bg-white border border-[#2c3ec4] shadow-2xl">
            <button onClick={() => setShowResultModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1">⚽ Cập Nhật Tỉ Số & Cầu Thủ Ghi Bàn</h3>
            <p className="text-xs text-slate-500 font-bold mb-4">Ghi nhận tỉ số trận đấu và chọn cầu thủ lập công từ danh sách thành viên</p>

            <form onSubmit={handleSaveResult} className="space-y-4">
              {/* Ultra High-Contrast Score Input Box with Stepper Buttons */}
              <div className="bg-[#1f2ca3] text-white p-5 rounded-2xl border border-[#2c3ec4] flex items-center justify-around shadow-lg">
                {/* Home Team (FC Nhà Trẻ) */}
                <div className="flex flex-col items-center">
                  <div className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1">
                    🏠 FC Nhà Trẻ
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setResultForm({ ...resultForm, homeScore: Math.max(0, Number(resultForm.homeScore) - 1) })}
                      className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-black text-xl flex items-center justify-center transition active:scale-95"
                      title="Giảm 1 bàn"
                    >
                      -
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={resultForm.homeScore}
                      onChange={(e) => setResultForm({ ...resultForm, homeScore: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-16 h-14 text-center text-3xl font-black text-slate-950 bg-white border-2 border-emerald-400 rounded-2xl shadow-inner focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
                    />

                    <button
                      type="button"
                      onClick={() => setResultForm({ ...resultForm, homeScore: Number(resultForm.homeScore) + 1 })}
                      className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-md transition active:scale-95"
                      title="Thêm 1 bàn"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center px-2">
                  <span className="text-white/60 font-black text-[10px] uppercase tracking-widest">TỈ SỐ</span>
                  <span className="text-3xl font-black text-amber-300">-</span>
                </div>

                {/* Away Team (Opponent) */}
                <div className="flex flex-col items-center">
                  <div className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1 line-clamp-1 max-w-[130px]">
                    ⚔️ {match.opponent?.teamName || 'Đối thủ'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setResultForm({ ...resultForm, awayScore: Math.max(0, Number(resultForm.awayScore) - 1) })}
                      className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-black text-xl flex items-center justify-center transition active:scale-95"
                      title="Giảm 1 bàn"
                    >
                      -
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={resultForm.awayScore}
                      onChange={(e) => setResultForm({ ...resultForm, awayScore: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-16 h-14 text-center text-3xl font-black text-slate-950 bg-white border-2 border-amber-400 rounded-2xl shadow-inner focus:outline-none focus:ring-4 focus:ring-amber-400/40"
                    />

                    <button
                      type="button"
                      onClick={() => setResultForm({ ...resultForm, awayScore: Number(resultForm.awayScore) + 1 })}
                      className="w-9 h-9 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xl flex items-center justify-center shadow-md transition active:scale-95"
                      title="Thêm 1 bàn"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Add Goal Scorer Form with Member Dropdown Selection */}
              <div className="border-t border-slate-200 pt-3">
                <label className="block text-xs font-black text-slate-800 mb-2">⚽ Chọn cầu thủ ghi bàn (FC Nhà Trẻ):</label>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Member Dropdown */}
                    <select
                      value={selectedMember}
                      onChange={(e) => setSelectedMember(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                    >
                      <option value="">-- Chọn thành viên trong đội --</option>
                      {memberList.map((user) => (
                        <option key={user._id} value={user.name}>
                          👤 {user.name} ({user.position || 'Cầu thủ'})
                        </option>
                      ))}
                      <option value="CUSTOM">➕ Nhập tên khác (Khách / Thử việc)...</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Phút (15', 38')"
                      value={newScorer.minute}
                      onChange={(e) => setNewScorer({ ...newScorer, minute: e.target.value })}
                      className="w-24 bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#374df5]"
                    />

                    <input
                      type="number"
                      min="1"
                      value={newScorer.count}
                      onChange={(e) => setNewScorer({ ...newScorer, count: e.target.value })}
                      className="w-14 bg-white border border-slate-300 text-slate-950 font-black rounded-xl px-2 py-2 text-xs text-center focus:outline-none focus:border-[#374df5]"
                      title="Số bàn thắng"
                    />

                    <button
                      type="button"
                      onClick={handleAddScorer}
                      className="p-2 bg-[#374df5] text-white rounded-xl hover:bg-[#2c3ec4] font-black shadow-md transition"
                      title="Thêm vào danh sách ghi bàn"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Assister Dropdown */}
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={selectedAssister}
                      onChange={(e) => setSelectedAssister(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#374df5]"
                    >
                      <option value="">-- Cầu thủ kiến tạo (Tùy chọn) --</option>
                      {memberList.map((user) => (
                        <option key={user._id} value={user.name}>
                          👟 {user.name} ({user.position || 'Cầu thủ'})
                        </option>
                      ))}
                      <option value="CUSTOM">➕ Nhập tên khác...</option>
                    </select>
                  </div>

                  {/* Custom Name Inputs if CUSTOM is chosen */}
                  <div className="flex flex-col gap-2 mt-2">
                    {selectedMember === 'CUSTOM' && (
                      <input
                        type="text"
                        placeholder="Nhập tên người ghi bàn ngoài danh sách..."
                        value={customPlayerName}
                        onChange={(e) => setCustomPlayerName(e.target.value)}
                        className="w-full bg-amber-50 border border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none"
                      />
                    )}
                    {selectedAssister === 'CUSTOM' && (
                      <input
                        type="text"
                        placeholder="Nhập tên người kiến tạo ngoài danh sách..."
                        value={customAssisterName}
                        onChange={(e) => setCustomAssisterName(e.target.value)}
                        className="w-full bg-cyan-50 border border-cyan-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Current Scorers List */}
              {resultForm.scorers.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto border-t border-slate-100 pt-2">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Danh sách đã thêm:</div>
                  {resultForm.scorers.map((sc, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5">
                          <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px]">⚽ Ghi bàn</span>
                          <span className="font-black text-slate-900">{sc.playerName}</span>
                          {sc.minute && <span className="text-slate-500">({sc.minute})</span>}
                          {sc.count > 1 && <span className="text-rose-600 font-black px-1.5 py-0.5 rounded-full bg-rose-100 text-[10px]">x{sc.count}</span>}
                        </span>
                        {sc.assisterName && (
                          <span className="text-[10px] text-slate-500 mt-0.5 ml-1">
                            👟 Kiến tạo: <span className="font-bold text-slate-700">{sc.assisterName}</span>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveScorer(i)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* MOTM Selector */}
              <div className="border-t border-slate-200 pt-3">
                <label className="block text-xs font-black text-slate-800 mb-2">⭐ Cầu thủ xuất sắc nhất trận (MOTM):</label>
                <select
                  value={resultForm.motm}
                  onChange={(e) => setResultForm({ ...resultForm, motm: e.target.value })}
                  className="w-full bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Không bình chọn --</option>
                  {memberList.map((user) => (
                    <option key={user._id} value={user.name}>
                      ⭐ {user.name} ({user.position || 'Cầu thủ'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowResultModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-full bg-[#2c3ec4] text-white font-black text-xs shadow-md">
                  Lưu Tỉ Số & Cầu Thủ Ghi Bàn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 🛑 CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-sm glass-modal rounded-3xl p-6 relative bg-white border border-rose-500 shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>
            
            <h3 className="text-xl font-black text-slate-900 mb-2">Xác nhận xóa trận đấu</h3>
            <p className="text-sm text-slate-600 font-bold mb-6">
              Bạn có chắc chắn muốn xóa trận đấu ngày <span className="text-rose-600">{match.date}</span> này không? Hành động này không thể hoàn tác!
            </p>

            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }} 
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Hủy
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(match._id);
                  setShowDeleteModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md transition"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 📧 CUSTOM NOTIFY CONFIRMATION MODAL */}
      {showNotifyModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-sm glass-modal rounded-3xl p-6 relative bg-white border border-emerald-500 shadow-2xl text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-emerald-600" />
            </div>
            
            <h3 className="text-xl font-black text-slate-900 mb-2">Gửi Email Thông Báo</h3>
            <p className="text-sm text-slate-600 font-bold mb-6">
              Bạn có muốn gửi Email thông báo trận đấu ngày <span className="text-emerald-600">{match.date}</span> tới toàn thể thành viên đội không? Hành động này chỉ thực hiện được 1 lần cho mỗi trận!
            </p>

            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowNotifyModal(false); }} 
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Hủy
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNotify(match._id);
                  setShowNotifyModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition"
              >
                Gửi Email Ngay
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🏆 CUSTOM MVP DETAILS & VOTING MODAL */}
      {showMvpModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-lg glass-modal rounded-3xl p-5 sm:p-7 relative bg-white border-2 border-amber-400 shadow-2xl flex flex-col max-h-[88vh]">
            
            {/* Close Button */}
            <button
              onClick={() => setShowMvpModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-black">
                <Trophy className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {t('mvp.modal_title')}
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-500 mb-3">
              Trận ngày {match.date} • FC Nhà Trẻ ({match.score?.homeScore ?? 0}) - ({match.score?.awayScore ?? 0}) {match.opponent?.teamName || 'Đối thủ'}
            </p>

            {/* If winner finalized */}
            {mvpStats?.motm && (
              <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 shadow-sm flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/90 text-amber-900 flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
                  👑
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                    🏆 {t('mvp.winner_badge')}
                  </div>
                  <div className="text-base font-black truncate">
                    {mvpStats.motm}
                  </div>
                  {mvpStats.motmReason && (
                    <div className="text-xs font-bold text-amber-950/80">
                      {mvpStats.motmReason}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Voting Progress Overview */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-3 text-xs font-bold">
              <div className="flex items-center justify-between text-slate-700 mb-1.5">
                <span>{t('mvp.voting_progress')}:</span>
                <span className="font-mono font-black text-[#2c3ec4]">
                  {mvpStats?.totalVotes || 0} / {mvpStats?.totalJoined || 0} {t('mvp.votes')} ({mvpStats?.totalJoined > 0 ? Math.round(((mvpStats.totalVotes || 0) / mvpStats.totalJoined) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${mvpStats?.totalJoined > 0 ? Math.min(100, Math.round(((mvpStats.totalVotes || 0) / mvpStats.totalJoined) * 100)) : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Candidates Leaderboard (Scrollable) */}
            <div className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              📊 Bảng xếp hạng phiếu bầu:
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-3">
              {(mvpStats?.candidates || []).sort((a, b) => (b.voteCount - a.voteCount) || ((b.goals + b.assists) - (a.goals + a.assists))).map((cand, idx) => {
                const isUserVotedThis = mvpStats?.userVotedCandidateId === cand._id;
                const isWinner = cand.isWinner;

                return (
                  <div
                    key={cand._id}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${
                      isWinner
                        ? 'border-amber-400 bg-amber-50/60 shadow-xs ring-1 ring-amber-300'
                        : isUserVotedThis
                        ? 'border-blue-400 bg-blue-50/50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className={`w-5 text-center font-black text-xs ${idx === 0 ? 'text-amber-600 text-sm' : 'text-slate-400'}`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>

                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-black text-xs text-slate-600">
                          {cand.avatar ? (
                            <img src={cand.avatar} alt={cand.name} className="w-full h-full object-cover" />
                          ) : (
                            cand.name?.charAt(0) || '⚽'
                          )}
                        </div>

                        <div className="overflow-hidden">
                          <div className="font-black text-xs text-slate-900 truncate flex items-center gap-1.5">
                            <span>{cand.name}</span>
                            {isWinner && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                                MVP
                              </span>
                            )}
                            {isUserVotedThis && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black">
                                Phiếu của bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <span>{cand.position || 'Cầu thủ'}</span>
                            {(cand.goals > 0 || cand.assists > 0) && (
                              <span className="text-amber-700 font-extrabold">
                                • {cand.goals > 0 ? `⚽ ${cand.goals}` : ''} {cand.assists > 0 ? `👟 ${cand.assists}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Vote Button if user hasn't voted yet and voting open */}
                        {!mvpStats?.hasUserVoted && !mvpStats?.isMvpFinalized && userStatus === 'joined' && (
                          <button
                            type="button"
                            onClick={() => voteMvpMutation.mutate(cand._id)}
                            disabled={voteMvpMutation.isPending}
                            className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] shadow-xs transition"
                          >
                            Bình chọn ⭐
                          </button>
                        )}

                        <div className="text-right">
                          <div className="font-mono font-black text-xs text-slate-900">
                            {cand.voteCount} <span className="text-[10px] text-slate-500 font-bold">{t('mvp.votes')}</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            {cand.votePercentage}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar for each candidate */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isWinner ? 'bg-amber-500' : 'bg-[#374df5]'
                        }`}
                        style={{ width: `${cand.votePercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold text-slate-500">
                💡 {t('mvp.tie_breaker_info')}
              </div>

              {isAdmin && !mvpStats?.isMvpFinalized && (
                <button
                  type="button"
                  onClick={() => setShowFinalizeConfirm(true)}
                  disabled={finalizeMvpMutation.isPending}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition shrink-0"
                >
                  👑 {t('matchcard.mvp_finalize_early')}
                </button>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 👑 CUSTOM MODAL: CONFIRM FINALIZE MVP EARLY (Admin) */}
      {showFinalizeConfirm && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-sm glass-modal rounded-3xl p-6 relative bg-white border border-amber-500 shadow-2xl text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              👑
            </div>
            
            <h3 className="text-xl font-black text-slate-900 mb-2">Chốt kết quả MVP sớm?</h3>
            <p className="text-sm text-slate-600 font-bold mb-6">
              Hệ thống sẽ tính toán MVP ngay dựa trên số phiếu hiện tại (kèm xét bàn thắng/kiến tạo và random nếu hòa phiếu) và gửi thông báo vinh danh tới toàn đội!
            </p>

            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setShowFinalizeConfirm(false)} 
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Hủy
              </button>
              <button 
                type="button"
                onClick={() => finalizeMvpMutation.mutate()}
                disabled={finalizeMvpMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-500 shadow-md transition disabled:opacity-50"
              >
                {finalizeMvpMutation.isPending ? 'Đang tính...' : 'Chốt MVP Ngay'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
