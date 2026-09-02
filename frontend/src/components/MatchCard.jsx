import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, MapPin, DollarSign, Users, Copy, CheckCircle2, XCircle, HelpCircle, Edit3, Trophy, Plus, Minus, Trash2, X, Zap, Send, Shirt, Bell, Star, Award, Crown, Flame, Shield, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import teamLogo from '../asset/logo.png';
import { useToast } from '../context/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import MatchLineupModal from './MatchLineupModal';

function MatchCard({ match, onCheckIn, onClone, onDelete, onNotify, onNotifyPush, isAdmin }) {
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

  const getErrorTypeLabel = (type) => {
    switch (type) {
      case 'mat_bong': return t('matchcard.error_mat_bong') || 'Mất bóng';
      case 'chuyen_hong': return t('matchcard.error_chuyen_hong') || 'Chuyền hỏng';
      case 'bat_hut': return t('matchcard.error_bat_hut') || 'Bắt hụt';
      case 'phan_luoi': return t('matchcard.error_phan_luoi') || 'Phản lưới (OG)';
      case 'kem_nguoi': return t('matchcard.error_kem_nguoi') || 'Bỏ vị trí/kèm người';
      case 'khong_loi': return t('matchcard.error_khong_loi') || 'Không lỗi cá nhân';
      case 'khac': return t('matchcard.error_khac') || 'Lỗi khác';
      default: return type;
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
  const [showLineupModal, setShowLineupModal] = useState(false);

  // Reason Modal State for 'uncertain' and 'absent'
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null); // 'uncertain' | 'absent'
  const [reasonInput, setReasonInput] = useState('');
  const [reasonError, setReasonError] = useState('');

  const isAnyModalOpen = Boolean(
    showMembers ||
    showEditModal ||
    showResultModal ||
    showMvpModal ||
    showFinalizeConfirm ||
    showDeleteModal ||
    showNotifyModal ||
    showReasonModal ||
    showLineupModal
  );
  useBodyScrollLock(isAnyModalOpen);

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
    concededGoals: match.concededGoals || [],
    motm: match.motm || ''
  });

  const [selectedMember, setSelectedMember] = useState('');
  const [customPlayerName, setCustomPlayerName] = useState('');
  const [selectedAssister, setSelectedAssister] = useState('');
  const [customAssisterName, setCustomAssisterName] = useState('');
  const [newScorer, setNewScorer] = useState({ minute: '', count: 1 });

  // Conceded Goal / Mistake State
  const [selectedMistakePlayer, setSelectedMistakePlayer] = useState('');
  const [customMistakePlayerName, setCustomMistakePlayerName] = useState('');
  const [selectedErrorType, setSelectedErrorType] = useState('mat_bong');
  const [mistakeMinute, setMistakeMinute] = useState('');
  const [mistakeNote, setMistakeNote] = useState('');

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
        concededGoals: resultForm.concededGoals || [],
        motm: resultForm.motm,
        status: resultForm.status
      });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Đã cập nhật tỉ số, danh sách ghi bàn & lỗi bàn thua!', 'Tỉ Số Realtime');
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

  // Add Conceded Goal / Mistake to list
  const handleAddConcededGoal = () => {
    let finalPlayerName = '';
    let foundUserId = null;

    if (selectedErrorType === 'khong_loi' || selectedMistakePlayer === 'NONE') {
      finalPlayerName = 'Không có lỗi cá nhân';
    } else if (selectedMistakePlayer === 'CUSTOM') {
      finalPlayerName = customMistakePlayerName.trim();
    } else if (selectedMistakePlayer) {
      finalPlayerName = selectedMistakePlayer.trim();
      const u = memberList.find(m => m.name === selectedMistakePlayer);
      if (u) foundUserId = u._id;
    }

    if (!finalPlayerName && selectedErrorType !== 'khong_loi') return;

    setResultForm({
      ...resultForm,
      concededGoals: [
        ...(resultForm.concededGoals || []),
        {
          playerName: finalPlayerName || 'Không rõ',
          userId: foundUserId,
          errorType: selectedErrorType,
          minute: mistakeMinute.trim(),
          note: mistakeNote.trim()
        }
      ]
    });
    setSelectedMistakePlayer('');
    setCustomMistakePlayerName('');
    setSelectedErrorType('mat_bong');
    setMistakeMinute('');
    setMistakeNote('');
  };

  // Remove Conceded Goal from list
  const handleRemoveConcededGoal = (index) => {
    const updated = [...(resultForm.concededGoals || [])];
    updated.splice(index, 1);
    setResultForm({ ...resultForm, concededGoals: updated });
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

          {/* Conceded Goals / Mistakes List */}
          {match.concededGoals && match.concededGoals.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-xs">
              <div className="text-[11px] font-extrabold text-amber-700 mb-1.5 flex items-center gap-1">
                ⚠️ {t('matchcard.conceded_goals_title')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {match.concededGoals.map((cg, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold text-[11px] shadow-2xs ${
                      cg.errorType === 'khong_loi'
                        ? 'bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    <span>{cg.errorType === 'khong_loi' ? '🛡️' : '⚠️'}</span>
                    <span>{cg.playerName || 'Không rõ'}</span>
                    {cg.errorType && cg.errorType !== 'khong_loi' && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded-md">
                        {getErrorTypeLabel(cg.errorType)}
                      </span>
                    )}
                    {cg.minute && <span className="text-slate-500 font-normal">({cg.minute})</span>}
                    {cg.note && <span className="text-slate-500 italic font-normal text-[10px]">"{cg.note}"</span>}
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

        {/* Action Buttons: Lineup & Attendance */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
          <button
            type="button"
            onClick={() => setShowLineupModal(true)}
            className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-2xs group"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>Đội hình ra sân</span>
            {match.lineup?.isPublished && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Đã có đội hình" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowMembers(true)}
            className="py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('matchcard.view_details')}</span>
          </button>
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 relative bg-white border border-[#374df5] shadow-2xl flex flex-col max-h-[80vh] overscroll-contain">
            <button onClick={() => setShowMembers(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
              📋 {t('matchcard.attendance_list')}
            </h3>
            <p className="text-xs text-slate-500 font-bold mb-4">
              {t('matchcard.attendance_date')} {match.date}
            </p>
            
            <div className="overflow-y-auto space-y-2 pr-1 text-xs overscroll-contain">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 relative bg-white border-2 border-amber-400 shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-md glass-modal rounded-3xl p-5 sm:p-6 relative bg-white border border-[#374df5] shadow-2xl flex flex-col max-h-[90dvh] overscroll-contain">
            <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition">
              <X className="w-4 h-4" />
            </button>

            <div className="shrink-0 mb-3 pr-8">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1 flex items-center gap-1.5">
                ✏️ {t('matchcard.edit_modal_title')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold leading-tight">
                {t('matchcard.edit_modal_subtitle')}
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 overflow-y-auto flex-1 min-h-0 overscroll-contain pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.match_date')}</label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.match_time')}</label>
                  <input
                    type="time"
                    required
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.stadium')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('matches.stadium_placeholder')}
                    value={editForm.stadium}
                    onChange={(e) => setEditForm({ ...editForm, stadium: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.maps_link')}</label>
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/..."
                    value={editForm.stadiumLink}
                    onChange={(e) => setEditForm({ ...editForm, stadiumLink: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_name')}</label>
                  <input
                    type="text"
                    placeholder="VD: FC Thăng Long"
                    value={editForm.opponentName}
                    onChange={(e) => setEditForm({ ...editForm, opponentName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_phone')}</label>
                  <input
                    type="text"
                    placeholder="0987654321"
                    value={editForm.opponentPhone}
                    onChange={(e) => setEditForm({ ...editForm, opponentPhone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_fb')}</label>
                <input
                  type="text"
                  placeholder="https://facebook.com/..."
                  value={editForm.opponentFbLink || ''}
                  onChange={(e) => setEditForm({ ...editForm, opponentFbLink: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.pitch_cost')}</label>
                  <input
                    type="number"
                    value={editForm.pitchCost}
                    onChange={(e) => setEditForm({ ...editForm, pitchCost: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-950 focus:outline-none focus:border-[#374df5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.deal')}</label>
                  <select
                    value={editForm.deal}
                    onChange={(e) => setEditForm({ ...editForm, deal: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                  >
                    <option value="5-5">5 - 5 (Chia đôi)</option>
                    <option value="6-4">6 - 4</option>
                    <option value="7-3">7 - 3</option>
                    <option value="Thua đóng tất">Thua đóng tất</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.kit_color')}</label>
                  <input
                    type="text"
                    placeholder="VD: Xanh dương, Đỏ..."
                    value={editForm.kitColor}
                    onChange={(e) => setEditForm({ ...editForm, kitColor: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matchcard.match_status')}</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                  >
                    <option value="upcoming">{t('matchcard.status_upcoming')}</option>
                    <option value="live">{t('matchcard.status_live')}</option>
                    <option value="completed">{t('matchcard.status_completed')}</option>
                    <option value="cancelled">{t('matchcard.status_cancelled')}</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition min-h-[40px] text-center"
                >
                  {t('matches.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#374df5] hover:bg-[#2c3ec4] active:scale-95 text-white font-black text-xs shadow-md transition min-h-[40px] text-center"
                >
                  {t('matchcard.save_changes_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚽ MODAL 2: UPDATE RESULT & SCORERS */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-lg glass-modal rounded-3xl p-5 sm:p-6 relative bg-white border border-[#2c3ec4] shadow-2xl flex flex-col max-h-[90dvh] overscroll-contain">
            <button onClick={() => setShowResultModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition">
              <X className="w-4 h-4" />
            </button>

            <div className="shrink-0 mb-3 pr-8">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1 flex items-center gap-1.5">
                ⚽ {t('matchcard.score_modal_title')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold leading-tight">
                {t('matchcard.score_modal_subtitle')}
              </p>
            </div>

            <form onSubmit={handleSaveResult} className="space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain pr-1">
              {/* Ultra High-Contrast Score Input Box with Stepper Buttons */}
              <div className="bg-[#1f2ca3] text-white p-3.5 sm:p-4 rounded-2xl border border-[#2c3ec4] flex items-center justify-between sm:justify-around shadow-lg gap-2">
                {/* Home Team (FC Nhà Trẻ) */}
                <div className="flex flex-col items-center min-w-0">
                  <div className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1 truncate">
                    🏠 FC Nhà Trẻ
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setResultForm({ ...resultForm, homeScore: Math.max(0, Number(resultForm.homeScore) - 1) })}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-black text-lg sm:text-xl flex items-center justify-center transition active:scale-95 shrink-0"
                      title="Giảm 1 bàn"
                    >
                      -
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={resultForm.homeScore}
                      onChange={(e) => setResultForm({ ...resultForm, homeScore: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-12 sm:w-16 h-11 sm:h-14 text-center text-xl sm:text-3xl font-black text-slate-950 bg-white border-2 border-emerald-400 rounded-2xl shadow-inner focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
                    />

                    <button
                      type="button"
                      onClick={() => setResultForm({ ...resultForm, homeScore: Number(resultForm.homeScore) + 1 })}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg sm:text-xl flex items-center justify-center transition active:scale-95 shadow-md shrink-0"
                      title="Tăng 1 bàn"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* VS Divider */}
                <div className="text-xl sm:text-2xl font-black text-white/40 tracking-widest px-1 shrink-0">
                  VS
                </div>

                {/* Away Team (Opponent) */}
                <div className="flex flex-col items-center min-w-0">
                  <div className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider mb-2 truncate max-w-[100px] sm:max-w-[130px]" title={match.opponent?.teamName || t('matchcard.opponent')}>
                    🛡️ {match.opponent?.teamName || t('matchcard.opponent')}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setResultForm({ ...resultForm, awayScore: Math.max(0, Number(resultForm.awayScore) - 1) })}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-black text-lg sm:text-xl flex items-center justify-center transition active:scale-95 shrink-0"
                      title="Giảm 1 bàn"
                    >
                      -
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={resultForm.awayScore}
                      onChange={(e) => setResultForm({ ...resultForm, awayScore: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-12 sm:w-16 h-11 sm:h-14 text-center text-xl sm:text-3xl font-black text-slate-950 bg-white border-2 border-rose-400 rounded-2xl shadow-inner focus:outline-none focus:ring-4 focus:ring-rose-400/40"
                    />

                    <button
                      type="button"
                      onClick={() => setResultForm({ ...resultForm, awayScore: Number(resultForm.awayScore) + 1 })}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-black text-lg sm:text-xl flex items-center justify-center transition active:scale-95 shadow-md shrink-0"
                      title="Tăng 1 bàn"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Match Status Selector */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">{t('matchcard.match_status')}</label>
                <select
                  value={resultForm.status}
                  onChange={(e) => setResultForm({ ...resultForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                >
                  <option value="upcoming">{t('matchcard.status_upcoming')}</option>
                  <option value="live">{t('matchcard.status_live')}</option>
                  <option value="completed">{t('matchcard.status_completed')}</option>
                  <option value="cancelled">{t('matchcard.status_cancelled')}</option>
                </select>
              </div>

              {/* Goal Scorers Box */}
              <div className="border-t border-slate-200 pt-3">
                <label className="block text-xs font-black text-slate-800 mb-2">⚽ {t('matchcard.select_scorer_title')}</label>
                
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Member Dropdown */}
                    <div className="sm:col-span-6">
                      <select
                        value={selectedMember}
                        onChange={(e) => setSelectedMember(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                      >
                        <option value="">{t('matchcard.select_member_placeholder')}</option>
                        {memberList.map((user) => (
                          <option key={user._id} value={user.name}>
                            👤 {user.name} ({user.position || 'Cầu thủ'})
                          </option>
                        ))}
                        <option value="CUSTOM">{t('matchcard.custom_scorer_option')}</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-12 sm:col-span-6 gap-2">
                      <input
                        type="text"
                        placeholder={t('matchcard.minute_placeholder')}
                        value={newScorer.minute}
                        onChange={(e) => setNewScorer({ ...newScorer, minute: e.target.value })}
                        className="col-span-5 bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 font-bold rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-[#374df5]"
                      />

                      <input
                        type="number"
                        min="1"
                        value={newScorer.count}
                        onChange={(e) => setNewScorer({ ...newScorer, count: e.target.value })}
                        className="col-span-4 bg-white border border-slate-300 text-slate-950 font-black rounded-xl px-1.5 py-2 text-xs text-center focus:outline-none focus:border-[#374df5]"
                        title={t('matchcard.goal_count_tooltip')}
                      />

                      <button
                        type="button"
                        onClick={handleAddScorer}
                        className="col-span-3 min-h-[36px] bg-[#374df5] text-white rounded-xl hover:bg-[#2c3ec4] font-black shadow-md transition flex items-center justify-center active:scale-95"
                        title={t('matchcard.add_scorer_tooltip')}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Assister Dropdown */}
                  <div>
                    <select
                      value={selectedAssister}
                      onChange={(e) => setSelectedAssister(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                    >
                      <option value="">{t('matchcard.select_assister_placeholder')}</option>
                      {memberList.map((user) => (
                        <option key={user._id} value={user.name}>
                          👟 {user.name} ({user.position || 'Cầu thủ'})
                        </option>
                      ))}
                      <option value="CUSTOM">{t('matchcard.custom_assister_option')}</option>
                    </select>
                  </div>

                  {/* Custom Name Input if Selected */}
                  {(selectedMember === 'CUSTOM' || selectedAssister === 'CUSTOM') && (
                    <div className="space-y-2 pt-1">
                      {selectedMember === 'CUSTOM' && (
                        <input
                          type="text"
                          placeholder={t('matchcard.custom_scorer_placeholder')}
                          value={customPlayerName}
                          onChange={(e) => setCustomPlayerName(e.target.value)}
                          className="w-full bg-emerald-50 border border-emerald-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none"
                        />
                      )}
                      {selectedAssister === 'CUSTOM' && (
                        <input
                          type="text"
                          placeholder={t('matchcard.custom_assister_placeholder')}
                          value={customAssisterName}
                          onChange={(e) => setCustomAssisterName(e.target.value)}
                          className="w-full bg-cyan-50 border border-cyan-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Current Scorers List */}
              {resultForm.scorers.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto border-t border-slate-100 pt-2 overscroll-contain">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">{t('matchcard.scorers_list_title')}</div>
                  {resultForm.scorers.map((sc, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] shrink-0">⚽ {t('matchcard.goal_badge')}</span>
                          <span className="font-black text-slate-900 truncate">{sc.playerName}</span>
                          {sc.minute && <span className="text-slate-500">({sc.minute})</span>}
                          {sc.count > 1 && <span className="text-rose-600 font-black px-1.5 py-0.5 rounded-full bg-rose-100 text-[10px]">x{sc.count}</span>}
                        </span>
                        {sc.assisterName && (
                          <span className="text-[10px] text-slate-500 mt-0.5 ml-1 truncate">
                            👟 {t('matchcard.assist_label')} <span className="font-bold text-slate-700">{sc.assisterName}</span>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveScorer(i)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition shrink-0"
                        title={t('matchcard.delete_scorer_tooltip')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Conceded Goals & Mistakes Box */}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-slate-800 flex items-center gap-1">
                    ⚠️ {t('matchcard.conceded_modal_title')}
                  </label>
                  <span className="text-[10px] font-bold text-slate-500">
                    ({t('matchcard.opponent')}: {resultForm.awayScore} bàn)
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Member Dropdown */}
                    <div className="sm:col-span-6">
                      <select
                        value={selectedMistakePlayer}
                        onChange={(e) => setSelectedMistakePlayer(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                      >
                        <option value="">{t('matchcard.select_mistake_player_placeholder')}</option>
                        <option value="NONE">{t('matchcard.no_individual_mistake')}</option>
                        {memberList.map((u) => (
                          <option key={u._id} value={u.name}>
                            👤 {u.name} ({u.position || 'Cầu thủ'})
                          </option>
                        ))}
                        <option value="CUSTOM">{t('matchcard.custom_mistake_player')}</option>
                      </select>
                    </div>

                    {/* Error Type Selector */}
                    <div className="sm:col-span-6">
                      <select
                        value={selectedErrorType}
                        onChange={(e) => setSelectedErrorType(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#374df5]"
                      >
                        <option value="mat_bong">⚡ {t('matchcard.error_mat_bong')}</option>
                        <option value="chuyen_hong">👟 {t('matchcard.error_chuyen_hong')}</option>
                        <option value="bat_hut">🧤 {t('matchcard.error_bat_hut')}</option>
                        <option value="phan_luoi">💥 {t('matchcard.error_phan_luoi')}</option>
                        <option value="kem_nguoi">🏃 {t('matchcard.error_kem_nguoi')}</option>
                        <option value="khong_loi">🛡️ {t('matchcard.error_khong_loi')}</option>
                        <option value="khac">❓ {t('matchcard.error_khac')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Player Name if selected */}
                  {selectedMistakePlayer === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder={t('matchcard.custom_mistake_placeholder')}
                      value={customMistakePlayerName}
                      onChange={(e) => setCustomMistakePlayerName(e.target.value)}
                      className="w-full bg-amber-50 border border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none"
                    />
                  )}

                  {/* Minute & Note row */}
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder={t('matchcard.minute_placeholder')}
                      value={mistakeMinute}
                      onChange={(e) => setMistakeMinute(e.target.value)}
                      className="col-span-3 sm:col-span-3 bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 font-bold rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-[#374df5]"
                    />

                    <input
                      type="text"
                      placeholder={t('matchcard.mistake_note_placeholder')}
                      value={mistakeNote}
                      onChange={(e) => setMistakeNote(e.target.value)}
                      className="col-span-6 sm:col-span-6 bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 font-bold rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-[#374df5]"
                    />

                    <button
                      type="button"
                      onClick={handleAddConcededGoal}
                      className="col-span-3 sm:col-span-3 min-h-[36px] bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs shadow-md transition flex items-center justify-center gap-1 active:scale-95"
                      title={t('matchcard.add_conceded_goal_btn')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('matchcard.add_conceded_goal_btn')}</span>
                      <span className="sm:hidden">+ Thêm</span>
                    </button>
                  </div>
                </div>

                {/* List of Conceded Goals Added */}
                {resultForm.concededGoals && resultForm.concededGoals.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border-t border-slate-100 pt-2 mt-2.5 overscroll-contain">
                    <div className="text-[11px] font-bold text-slate-500 mb-1">
                      {t('matchcard.conceded_list_title')}
                    </div>
                    {resultForm.concededGoals.map((cg, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span className="p-1 rounded-lg bg-amber-100 text-amber-900 text-[10px] shrink-0">
                              {cg.errorType === 'khong_loi' ? '🛡️' : '⚠️'} {getErrorTypeLabel(cg.errorType)}
                            </span>
                            <span className="font-black text-slate-900 truncate">
                              {cg.playerName || 'Không có lỗi cá nhân'}
                            </span>
                            {cg.minute && <span className="text-slate-500">({cg.minute})</span>}
                          </span>
                          {cg.note && (
                            <span className="text-[10px] text-slate-500 mt-0.5 ml-1 italic truncate">
                              "{cg.note}"
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveConcededGoal(i)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition shrink-0"
                          title={t('matchcard.delete_conceded_tooltip')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MOTM Selector */}
              <div className="border-t border-slate-200 pt-3">
                <label className="block text-xs font-black text-slate-800 mb-1.5">⭐ {t('matchcard.motm_title')}</label>
                <select
                  value={resultForm.motm}
                  onChange={(e) => setResultForm({ ...resultForm, motm: e.target.value })}
                  className="w-full bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="">{t('matchcard.no_motm_option')}</option>
                  {memberList.map((user) => (
                    <option key={user._id} value={user.name}>
                      ⭐ {user.name} ({user.position || 'Cầu thủ'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition min-h-[40px] text-center"
                >
                  {t('matches.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2c3ec4] hover:bg-[#23319e] active:scale-95 text-white font-black text-xs shadow-md transition min-h-[40px] text-center"
                >
                  {t('matchcard.save_score_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛑 CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-sm glass-modal rounded-3xl p-5 sm:p-6 relative bg-white border border-rose-500 shadow-2xl text-center max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Trash2 className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600" />
            </div>
            
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5">{t('matchcard.delete_match_modal_title')}</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-bold mb-5 leading-relaxed">
              {t('matchcard.delete_match_confirm_text')} <span className="text-rose-600 font-black">{match.date}</span>? {t('matchcard.delete_match_modal_warning')}
            </p>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }} 
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition min-h-[40px]"
              >
                {t('matches.cancel')}
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(match._id);
                  setShowDeleteModal(false);
                }} 
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md transition active:scale-95 min-h-[40px]"
              >
                {t('matchcard.delete_match_btn')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 📧 CUSTOM NOTIFY CONFIRMATION MODAL */}
      {showNotifyModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-sm glass-modal rounded-3xl p-5 sm:p-6 relative bg-white border border-emerald-500 shadow-2xl text-center max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Send className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
            </div>
            
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5">{t('matchcard.notify_email_action')}</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-bold mb-5 leading-relaxed">
              Bạn có muốn gửi Email thông báo trận đấu ngày <span className="text-emerald-600 font-black">{match.date}</span> tới toàn thể thành viên đội không?
            </p>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowNotifyModal(false); }} 
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition min-h-[40px]"
              >
                {t('matches.cancel')}
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNotify(match._id);
                  setShowNotifyModal(false);
                }} 
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition active:scale-95 min-h-[40px]"
              >
                {t('matchcard.notify_email_action')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🏆 CUSTOM MVP DETAILS & VOTING MODAL */}
      {showMvpModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none overscroll-contain">
          <div className="w-full max-w-lg glass-modal rounded-3xl p-5 sm:p-7 relative bg-white border-2 border-amber-400 shadow-2xl flex flex-col max-h-[88vh] overscroll-contain">
            
            {/* Close Button */}
            <button
              onClick={() => setShowMvpModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-1 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-black">
                <Trophy className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {t('mvp.modal_title')}
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-500 mb-3 shrink-0">
              Trận ngày {match.date} • FC Nhà Trẻ ({match.score?.homeScore ?? 0}) - ({match.score?.awayScore ?? 0}) {match.opponent?.teamName || 'Đối thủ'}
            </p>

            {/* If winner finalized */}
            {mvpStats?.motm && (
              <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 shadow-sm flex items-center gap-3 shrink-0">
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
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-3 text-xs font-bold shrink-0">
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
            <div className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 shrink-0">
              📊 Bảng xếp hạng phiếu bầu:
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-3 overscroll-contain">
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                          idx === 0 ? 'bg-amber-400 text-slate-950 font-extrabold' :
                          idx === 1 ? 'bg-slate-300 text-slate-800' :
                          idx === 2 ? 'bg-amber-700/20 text-amber-900' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                          {cand.avatar ? (
                            <img src={cand.avatar} alt={cand.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-500">
                              {cand.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Name & Match contribution */}
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 flex items-center gap-1.5 truncate">
                            <span className="truncate">{cand.name}</span>
                            {isWinner && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                            {isUserVotedThis && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0">
                                {t('mvp.voted_badge')}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2">
                            <span>{cand.position || 'Cầu thủ'}</span>
                            {(cand.goals > 0 || cand.assists > 0) && (
                              <span className="text-amber-600 font-black">
                                • {cand.goals > 0 ? `⚽ ${cand.goals}` : ''} {cand.assists > 0 ? `👟 ${cand.assists}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Vote Count & Action Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-black text-sm text-slate-900">
                            {cand.voteCount} <span className="text-[10px] font-bold text-slate-500">{t('mvp.votes')}</span>
                          </div>
                        </div>

                        {/* If MVP not finalized yet, show Vote button */}
                        {!mvpStats?.isFinalized && (
                          <button
                            type="button"
                            onClick={() => voteMvpMutation.mutate(cand._id)}
                            disabled={voteMvpMutation.isPending}
                            className={`p-2 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                              isUserVotedThis
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800'
                            }`}
                            title={isUserVotedThis ? 'Đã bỏ phiếu cho cầu thủ này' : 'Bình chọn MVP cho cầu thủ này'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isUserVotedThis ? 'fill-white' : ''}`} />
                            <span className="hidden sm:inline">{isUserVotedThis ? t('mvp.voted_badge') : t('mvp.vote_action')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions for Admin (Chốt MVP thủ công sớm) */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowMvpModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Đóng
              </button>

              {isAdmin && !mvpStats?.isFinalized && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMvpModal(false);
                    setShowFinalizeConfirm(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95"
                >
                  <Crown className="w-4 h-4" />
                  <span>Chốt Kết Quả MVP Sớm</span>
                </button>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 👑 CUSTOM MODAL: CONFIRM FINALIZE MVP EARLY (Admin) */}
      {showFinalizeConfirm && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-sm glass-modal rounded-3xl p-6 relative bg-white border border-amber-500 shadow-2xl text-center max-h-[90vh] overflow-y-auto overscroll-contain">
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

      {/* 📋 MODAL: MATCH LINEUP (Sa bàn chiến thuật & Đội hình ra sân) */}
      <MatchLineupModal
        match={match}
        isOpen={showLineupModal}
        onClose={() => setShowLineupModal(false)}
        isAdmin={isAdmin}
      />

    </div>
  );
}

export default React.memo(MatchCard);
