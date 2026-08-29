import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { AlertTriangle, CheckCircle, XCircle, HelpCircle, Calendar, MapPin, Clock, DollarSign, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function ForceCheckInModal() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState(null); // 'uncertain' | 'absent'
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: forceMatchRes, isLoading } = useQuery({
    queryKey: ['forceCheckInMatch'],
    queryFn: () => api.get('/matches/force-checkin'),
    refetchInterval: 30000
  });

  const pendingMatch = forceMatchRes?.data;

  const isOpen = !isLoading && Boolean(pendingMatch) && !isDismissed;
  useBodyScrollLock(isOpen);

  const checkInMutation = useMutation({
    mutationFn: ({ matchId, status, reason }) =>
      api.put(`/matches/${matchId}/checkin`, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forceCheckInMatch'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setSelectedStatus(null);
      setReason('');
      setErrorMsg('');
    },
    onError: (err) => {
      toast.error(err.message || 'Error saving check-in');
    }
  });

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (status) => {
    if ((status === 'uncertain' || status === 'absent') && !reason.trim()) {
      const statusText = status === 'uncertain' ? t('force_checkin.status_uncertain_text') : t('force_checkin.status_absent_text');
      setErrorMsg(t('force_checkin.reason_error', { status: statusText }));
      setSelectedStatus(status);
      return;
    }
    setErrorMsg('');
    checkInMutation.mutate({
      matchId: pendingMatch._id,
      status,
      reason: status !== 'joined' ? reason.trim() : ''
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xl animate-fade-in select-none overscroll-contain">
      <div className="w-full max-w-lg glass-modal rounded-3xl p-5 sm:p-7 text-center relative overflow-y-auto max-h-[90dvh] overscroll-contain bg-white border-2 border-emerald-400 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="tactile-btn absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          title={t('force_checkin.dismiss_tooltip')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Warning Banner */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-black uppercase tracking-wider mb-4 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 animate-bounce text-amber-600" />
          {t('force_checkin.badge')}
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5">
          {t('force_checkin.title')}
        </h2>
        <p className="text-slate-600 text-xs sm:text-sm font-bold mb-4 leading-relaxed">
          {t('force_checkin.subtitle')}
        </p>

        {/* Match Info Details Card */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-200 text-left space-y-2.5 font-bold text-xs">
          <div className="flex items-center gap-2 text-slate-800 text-xs sm:text-sm flex-wrap">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('force_checkin.date')} {pendingMatch.date}</span>
            <Clock className="w-4 h-4 text-cyan-600 ml-2 shrink-0" />
            <span>{pendingMatch.time}</span>
          </div>

          <div className="flex items-start gap-2 text-slate-800 text-xs sm:text-sm">
            <MapPin className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span>{t('force_checkin.stadium')} <b>{pendingMatch.stadium}</b></span>
          </div>

          <div className="flex items-center gap-2 text-slate-800 text-xs sm:text-sm">
            <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{t('force_checkin.deal')} <b>{pendingMatch.pitchCost?.toLocaleString('vi-VN')} VNĐ ({pendingMatch.deal})</b></span>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-600 text-xs">
            <span>{t('force_checkin.opponent')} <strong className="text-slate-900">{pendingMatch.opponent?.teamName || t('force_checkin.awaiting_opponent')}</strong></span>
            <span className="text-emerald-700 font-extrabold font-mono">
              {t('force_checkin.joined_count', { count: pendingMatch.checkInSummary?.joined || 0 })}
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-3 text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Reason Input Box for uncertain & absent */}
        {(selectedStatus === 'uncertain' || selectedStatus === 'absent') && (
          <div className="mb-4 text-left">
            <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${selectedStatus === 'uncertain' ? 'text-amber-700' : 'text-rose-700'}`}>
              {t('force_checkin.reason_required', { status: selectedStatus === 'uncertain' ? t('force_checkin.status_uncertain_text') : t('force_checkin.status_absent_text') })}
            </label>
            <input
              type="text"
              autoFocus
              placeholder={selectedStatus === 'uncertain' ? t('force_checkin.reason_uncertain_placeholder') : t('force_checkin.reason_absent_placeholder')}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setErrorMsg('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-base sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {/* Option 1: Joined */}
          <button
            onClick={() => handleSubmit('joined')}
            disabled={checkInMutation.isPending}
            className="flex items-center justify-center gap-1 py-3 px-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition active:scale-95 disabled:opacity-50 min-h-[44px]"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{t('force_checkin.btn_join')}</span>
          </button>

          {/* Option 2: Uncertain */}
          <button
            onClick={() => {
              if (selectedStatus !== 'uncertain') {
                setSelectedStatus('uncertain');
                setErrorMsg('');
              } else {
                handleSubmit('uncertain');
              }
            }}
            disabled={checkInMutation.isPending}
            className="flex items-center justify-center gap-1 py-3 px-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition active:scale-95 disabled:opacity-50 min-h-[44px]"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>{selectedStatus === 'uncertain' ? t('force_checkin.btn_confirm') : t('force_checkin.btn_uncertain')}</span>
          </button>

          {/* Option 3: Absent */}
          <button
            onClick={() => {
              if (selectedStatus !== 'absent') {
                setSelectedStatus('absent');
                setErrorMsg('');
              } else {
                handleSubmit('absent');
              }
            }}
            disabled={checkInMutation.isPending}
            className="flex items-center justify-center gap-1 py-3 px-1.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition active:scale-95 disabled:opacity-50 min-h-[44px]"
          >
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{selectedStatus === 'absent' ? t('force_checkin.btn_confirm') : t('force_checkin.btn_absent')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
