import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Trophy, Star, CheckCircle2, Users, Calendar, MapPin, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import teamLogo from '../asset/logo.png';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function ForceMvpVoteModal() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: forceRes, isLoading } = useQuery({
    queryKey: ['forceMvpVoteMatch'],
    queryFn: () => api.get('/matches/force-mvp-vote'),
    refetchInterval: 30000
  });

  const pendingMatch = forceRes?.data;

  const isOpen = !isLoading && Boolean(pendingMatch) && !isDismissed;
  useBodyScrollLock(isOpen);

  const voteMutation = useMutation({
    mutationFn: ({ matchId, candidateId }) =>
      api.post(`/matches/${matchId}/vote-mvp`, { candidateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forceMvpVoteMatch'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['matchMvpStats'] });
      setSelectedCandidateId('');
      setErrorMsg('');
    },
    onError: (err) => {
      setErrorMsg(err.message || t('mvp.vote_fail'));
    }
  });

  if (!isOpen) {
    return null;
  }

  const candidates = pendingMatch.candidates || [];
  const totalVotes = pendingMatch.totalVotes || 0;
  const totalJoined = pendingMatch.totalJoined || candidates.length || 1;
  const voteProgressPct = Math.round((totalVotes / totalJoined) * 100);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCandidateId) {
      setErrorMsg(t('mvp.select_error'));
      return;
    }
    setErrorMsg('');
    voteMutation.mutate({
      matchId: pendingMatch._id,
      candidateId: selectedCandidateId
    });
  };

  const getPositionBadge = (pos) => {
    switch (pos) {
      case 'Thủ môn (GK)':
      case 'GK':
        return <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">🧤 GK</span>;
      case 'Hậu vệ (DF)':
      case 'DF':
        return <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">🛡️ DF</span>;
      case 'Tiền vệ (MF)':
      case 'MF':
        return <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">⚽ MF</span>;
      case 'Tiền đạo (FW)':
      case 'FW':
        return <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">🔥 FW</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">🏃 Free</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in select-none overscroll-contain">
      <div className="w-full max-w-xl glass-modal rounded-3xl p-5 sm:p-7 text-center relative overflow-hidden bg-white border-2 border-amber-400 shadow-2xl flex flex-col max-h-[90vh] overscroll-contain">
        
        {/* Close Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="tactile-btn absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          title="Tắt bình chọn MVP"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Gold Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 border border-amber-400 text-amber-900 text-xs font-black uppercase tracking-wider mx-auto mb-3 shadow-xs">
          <Trophy className="w-4 h-4 text-amber-600 animate-bounce" />
          <span>{t('mvp.modal_title')}</span>
        </div>

        {/* Header Title */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1 tracking-tight">
          {t('mvp.header_question')}
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-4">
          {t('mvp.modal_subtitle')}
        </p>

        {/* Match Result Preview Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-3 sm:p-4 mb-4 shadow-md text-left relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-white/80 font-bold mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{pendingMatch.date} ({pendingMatch.time})</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{pendingMatch.stadium}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
            <div className="flex items-center gap-2 flex-1">
              <img src={teamLogo} alt="FC Nhà Trẻ" className="w-7 h-7 rounded-lg bg-white p-0.5 object-cover" />
              <span className="font-black text-xs sm:text-sm truncate">FC Nhà Trẻ</span>
            </div>

            <div className="flex items-center gap-2 bg-amber-400 text-slate-950 px-3 py-1 rounded-xl font-mono font-black text-base sm:text-lg shadow-sm">
              <span>{pendingMatch.score?.homeScore ?? 0}</span>
              <span>-</span>
              <span>{pendingMatch.score?.awayScore ?? 0}</span>
            </div>

            <div className="flex items-center justify-end gap-2 flex-1 text-right">
              <span className="font-black text-xs sm:text-sm truncate">{pendingMatch.opponent?.teamName || 'Đối thủ'}</span>
              <div className="w-7 h-7 rounded-lg bg-rose-500 flex items-center justify-center text-xs font-black">
                ⚔️
              </div>
            </div>
          </div>

          {/* Goal Scorers Preview if any */}
          {pendingMatch.scorers && pendingMatch.scorers.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1.5 text-[11px] font-bold">
              {pendingMatch.scorers.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-white">
                  <span>⚽ {s.playerName}</span>
                  {s.assisterName && <span className="text-white/60">({s.assisterName})</span>}
                  {s.count > 1 && <span className="text-amber-400 font-black">x{s.count}</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Voting Progress Live Bar */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 mb-3 text-xs text-left">
          <div className="flex items-center justify-between font-bold text-amber-950 mb-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              {t('mvp.voting_progress')}:
            </span>
            <span className="font-mono font-extrabold text-amber-700">
              {totalVotes} / {totalJoined} {t('mvp.voting_ratio')} ({voteProgressPct}%)
            </span>
          </div>
          <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${voteProgressPct}%` }}
            />
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-3 text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-left">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Candidate Selection List (Scrollable) */}
        <div className="text-left mb-2">
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
            👉 {t('mvp.choose_candidate')}
          </label>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {candidates.map((player) => {
            const isSelected = selectedCandidateId === player._id;
            const hasContributions = player.goals > 0 || player.assists > 0;

            return (
              <div
                key={player._id}
                onClick={() => setSelectedCandidateId(player._id)}
                className={`flex items-center justify-between p-2.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-left relative ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400/50 scale-[1.01]'
                    : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center font-black text-slate-600">
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                      player.name?.charAt(0)?.toUpperCase() || '⚽'
                    )}
                  </div>

                  <div className="overflow-hidden">
                    <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                      {player.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {getPositionBadge(player.position)}
                      {hasContributions && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-700 bg-amber-100/80 px-1 rounded">
                          {player.goals > 0 && `⚽${player.goals}`}
                          {player.assists > 0 && ` 👟${player.assists}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'border-2 border-slate-300 text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tie-breaker Rule Subtext */}
        <div className="text-[11px] text-slate-500 font-semibold mb-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
          💡 <b>{t('mvp.tie_breaker_info')}</b>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={voteMutation.isPending || !selectedCandidateId}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Star className="w-4 h-4 fill-slate-950" />
          {voteMutation.isPending ? 'Đang gửi bình chọn...' : t('mvp.submit_vote')}
        </button>
      </div>
    </div>
  );
}
