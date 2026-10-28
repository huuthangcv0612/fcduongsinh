import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { 
  AlertCircle, 
  CreditCard, 
  ArrowRight, 
  X, 
  CheckCircle2, 
  Sparkles,
  Wallet,
  Calendar
} from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function UnpaidFundPromptModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: statusRes, isLoading } = useQuery({
    queryKey: ['myFundStatus'],
    queryFn: () => api.get('/finances/my-fund-status'),
    staleTime: 60000,
    retry: 1
  });

  const fundData = statusRes?.data;
  const unpaidCount = fundData?.unpaidCount || (fundData?.unpaidMatches?.length || 0);
  const sessionKey = `dismissed_match_fund_prompt_${unpaidCount}`;

  const isSessionDismissed = Boolean(sessionStorage.getItem(sessionKey));
  const shouldShow = !isLoading && fundData?.isUnpaid && unpaidCount > 0 && !isDismissed && !isSessionDismissed;

  useBodyScrollLock(shouldShow);

  if (!shouldShow) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(sessionKey, 'true');
  };

  const handleGoToFinances = () => {
    handleDismiss();
    navigate('/finances');
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none overscroll-contain">
      <div className="w-full max-w-md glass-modal rounded-3xl p-5 sm:p-6 text-left relative overflow-y-auto max-h-[90dvh] overscroll-contain bg-white border border-emerald-400 shadow-2xl flex flex-col">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          title={t('fund_prompt.remind_later')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-black uppercase tracking-wider shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
            Nhắc Nhở Đóng Quỹ Trận
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black">
            <Sparkles className="w-3 h-3" />
            {unpaidCount} trận chưa nộp
          </span>
        </div>

        {/* Modal Title */}
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-1.5">
          Bạn có {unpaidCount} trận đấu chưa đóng quỹ
        </h3>
        <p className="text-xs text-slate-600 font-bold leading-relaxed mb-4">
          Chi phí sân và dịch vụ sau trận đấu đã được cập nhật và chia đều cho các thành viên tham gia.
        </p>

        {/* Financial Status Breakdown Card */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200 p-4 mb-4 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Tổng số tiền cần đóng:
            </span>
            <span className="text-base font-black text-emerald-700 font-mono">
              {formatCurrency(fundData.totalUnpaidAmount)}
            </span>
          </div>

          {/* List of unpaid matches */}
          <div className="pt-2 border-t border-emerald-200/80 space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {fundData.unpaidMatches?.map((m) => (
              <div key={m.matchId} className="flex items-center justify-between bg-white/80 p-2 rounded-xl text-xs font-bold border border-emerald-100">
                <div className="min-w-0">
                  <div className="text-slate-900 font-black truncate">
                    ⚽ {m.date} • {m.opponent}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{m.stadium}</div>
                </div>
                <div className="text-right text-emerald-700 font-black shrink-0 font-mono">
                  {formatCurrency(m.feePerPerson)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition text-center"
          >
            {t('fund_prompt.remind_later')}
          </button>
          <button
            onClick={handleGoToFinances}
            className="tactile-btn flex-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 text-center"
          >
            <span>Vào Đóng Tiền Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
