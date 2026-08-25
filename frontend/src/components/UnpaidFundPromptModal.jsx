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
  Clock, 
  Sparkles,
  Wallet
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
  const currentMonth = fundData?.currentMonth || (new Date().getMonth() + 1);
  const currentYear = fundData?.currentYear || new Date().getFullYear();
  const sessionKey = `dismissed_fund_prompt_${currentYear}_${currentMonth}`;

  const isSessionDismissed = Boolean(sessionStorage.getItem(sessionKey));
  const shouldShow = !isLoading && fundData?.isUnpaid && !isDismissed && !isSessionDismissed;

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
            {t('fund_prompt.badge')}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black">
            <Sparkles className="w-3 h-3" />
            Tháng {currentMonth}/{currentYear}
          </span>
        </div>

        {/* Modal Title */}
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-1.5">
          {t('fund_prompt.title', { month: currentMonth, year: currentYear })}
        </h3>
        <p className="text-xs text-slate-600 font-bold leading-relaxed mb-4">
          {t('fund_prompt.subtitle')}
        </p>

        {/* Financial Status Breakdown Card */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200 p-4 mb-4 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Wallet className="w-4 h-4 text-emerald-600" />
              {t('fund_prompt.amount_label')}
            </span>
            <span className="text-sm font-black text-slate-900">
              {formatCurrency(fundData.requiredAmount)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-cyan-600" />
              {t('fund_prompt.paid_label')}
            </span>
            <span className="font-mono font-black text-emerald-700">
              {formatCurrency(fundData.paidAmount)}
            </span>
          </div>

          <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between">
            <span className="text-xs font-black text-rose-600 uppercase tracking-wide">
              {t('fund_prompt.remaining_label')}
            </span>
            <span className="text-base sm:text-lg font-black text-rose-600 font-mono">
              {formatCurrency(fundData.remainingAmount)}
            </span>
          </div>
        </div>

        {/* Bank Details Snippet */}
        {fundData.fundConfig && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 mb-4 text-xs font-bold text-slate-700 space-y-1.5">
            <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              {t('fund_prompt.bank_info_title')}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{t('fund_prompt.bank_name')}</span>
              <span className="font-black text-slate-900">{fundData.fundConfig.bankName} ({fundData.fundConfig.bankCode})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{t('fund_prompt.account_number')}</span>
              <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">{fundData.fundConfig.accountNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{t('fund_prompt.account_name')}</span>
              <span className="font-black text-slate-900">{fundData.fundConfig.accountName}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 text-center min-h-[44px] flex items-center justify-center"
          >
            {t('fund_prompt.remind_later')}
          </button>
          <button
            type="button"
            onClick={handleGoToFinances}
            className="flex-1 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span>{t('fund_prompt.go_to_finances')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
