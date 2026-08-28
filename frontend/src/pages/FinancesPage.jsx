import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmModalContext';
import StatCard from '../components/StatCard';
import DataGridTable from '../components/DataGridTable';
import MonthlyFundGrid from '../components/MonthlyFundGrid';
import SendFundEmailModal from '../components/SendFundEmailModal';
import SubmitFundModal from '../components/SubmitFundModal';
import FundSubmissionReviewModal from '../components/FundSubmissionReviewModal';
import FundConfigModal from '../components/FundConfigModal';
import QuickQrModal from '../components/QuickQrModal';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, X, Table, ListFilter, Mail, CreditCard, Inbox, CheckCircle2, Clock, XCircle, Eye, Settings, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function FinancesPage() {
  const { user, isAdmin, isTreasurer, isManager } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('monthly_grid'); // 'monthly_grid' | 'submissions' | 'transactions'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSubmitFundModal, setShowSubmitFundModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showQuickQrModal, setShowQuickQrModal] = useState(false);
  const [selectedReviewSubmission, setSelectedReviewSubmission] = useState(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [showQRModal, setShowQRModal] = useState(false);
  const qrUrlFromParam = searchParams.get('qrUrl');
  const submissionIdParam = searchParams.get('submissionId');

  useBodyScrollLock(showAddModal || (showQRModal && Boolean(qrUrlFromParam)));

  useEffect(() => {
    if (qrUrlFromParam) {
      setShowQRModal(true);
    }
  }, [qrUrlFromParam]);

  const handleCloseQR = () => {
    setShowQRModal(false);
    searchParams.delete('qrUrl');
    setSearchParams(searchParams);
  };

  const [formData, setFormData] = useState({
    type: 'OUT',
    category: 'tien_san',
    amount: '',
    description: '',
    fundMonth: new Date().toISOString().slice(0, 7)
  });

  // Balance query
  const { data: balanceRes } = useQuery({
    queryKey: ['balance'],
    queryFn: () => api.get('/finances/balance'),
    staleTime: 60000
  });

  // Finances list query
  const { data: financesRes } = useQuery({
    queryKey: ['finances'],
    queryFn: () => api.get('/finances'),
    staleTime: 60000
  });

  // Fund Submissions query
  const { data: submissionsRes } = useQuery({
    queryKey: ['fund-submissions'],
    queryFn: () => api.get('/fund-submissions'),
    staleTime: 30000
  });

  const submissions = Array.isArray(submissionsRes?.data) ? submissionsRes.data : [];
  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  // Auto-open review modal if submissionId exists in URL from notification
  useEffect(() => {
    if (submissionIdParam && submissions.length > 0) {
      const match = submissions.find(s => s._id === submissionIdParam);
      if (match) {
        setSelectedReviewSubmission(match);
        setActiveTab('submissions');
      } else {
        // Fetch single submission directly
        api.get(`/fund-submissions/${submissionIdParam}`)
          .then(res => {
            if (res.data) {
              setSelectedReviewSubmission(res.data);
              setActiveTab('submissions');
            }
          })
          .catch(() => {});
      }
    }
  }, [submissionIdParam, submissions]);

  const handleCloseReviewModal = () => {
    setSelectedReviewSubmission(null);
    if (searchParams.get('submissionId')) {
      searchParams.delete('submissionId');
      setSearchParams(searchParams);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/finances', {
      ...data,
      amount: Number(data.amount)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success(t('finances.create_success_msg'), t('finances.create_success_title'));
      setShowAddModal(false);
    },
    onError: (err) => {
      toast.error(err.message || t('finances.create_fail'), t('profile.error_title'));
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (updates) => api.put('/finances/bulk-update', { updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success(t('finances.bulk_success_msg'), t('finances.bulk_success_title'));
    },
    onError: (err) => {
      toast.error(err.message || t('finances.bulk_fail'), t('profile.error_title'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/finances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success(t('finances.delete_success_msg'), t('finances.delete_success_title'));
    },
    onError: (err) => {
      toast.error(err.message || t('finances.delete_fail'), t('profile.error_title'));
    }
  });

  const handleDeleteFinance = async (id) => {
    const isConfirmed = await confirm({
      title: t('finances.delete_confirm_title'),
      message: t('finances.delete_confirm_msg'),
      confirmText: t('finances.delete_confirm_btn'),
      cancelText: t('finances.cancel_btn'),
      type: 'danger'
    });

    if (isConfirmed) {
      deleteMutation.mutate(id);
    }
  };

  const balanceData = balanceRes?.data || { balance: 0, totalIn: 0, totalOut: 0 };
  const finances = financesRes?.data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            💰 {t('finances.title')}
          </h2>
          <p className="text-xs font-bold text-slate-600">
            {t('finances.subtitle')}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Quick QR View Button */}
          <button
            onClick={() => setShowQuickQrModal(true)}
            className="tactile-btn flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm shadow-md transition"
            title="Xem mã QR đóng quỹ và thông tin chuyển khoản"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>Xem Mã QR</span>
          </button>

          {/* Member Submit Fund Button */}
          <button
            onClick={() => setShowSubmitFundModal(true)}
            className="tactile-btn flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition"
          >
            <CreditCard className="w-4 h-4" />
            <span>Nộp Tiền Quỹ / Báo Đóng</span>
          </button>

          {isManager && (
            <>
              <button
                onClick={() => setShowConfigModal(true)}
                className="tactile-btn flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm shadow-md shadow-purple-600/25 transition"
                title="Cấu hình tài khoản ngân hàng và mức đóng quỹ"
              >
                <Settings className="w-4 h-4" />
                <span>Cấu Hình Quỹ</span>
              </button>

              <button
                onClick={() => setShowEmailModal(true)}
                className="tactile-btn flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm shadow-md transition"
              >
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>{t('finances.send_email_btn')}</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="tactile-btn flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{t('finances.add_transaction_btn')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t('finances.total_balance')}
          value={`${balanceData.balance?.toLocaleString('vi-VN')} đ`}
          subtext={t('finances.total_balance_sub')}
          icon={Wallet}
          color="emerald"
        />

        <StatCard
          title={t('finances.total_in')}
          value={`${balanceData.totalIn?.toLocaleString('vi-VN')} đ`}
          subtext={t('finances.total_in_sub')}
          icon={ArrowUpRight}
          color="cyan"
        />

        <StatCard
          title={t('finances.total_out')}
          value={`${balanceData.totalOut?.toLocaleString('vi-VN')} đ`}
          subtext={t('finances.total_out_sub')}
          icon={ArrowDownRight}
          color="rose"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-300/80 self-start">
        <button
          onClick={() => setActiveTab('monthly_grid')}
          className={`tactile-btn px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'monthly_grid'
              ? 'bg-[#2c3ec4] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>📊 {t('finances.tab_monthly_grid')}</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`tactile-btn px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'submissions'
              ? 'bg-[#2c3ec4] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>📥 {isManager ? 'Duyệt Đóng Quỹ' : 'Lịch Sử Nộp Quỹ'}</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] ml-1">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`tactile-btn px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'bg-[#2c3ec4] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>📝 {t('finances.tab_transactions')} ({finances.length})</span>
        </button>
      </div>

      {/* Main Tab Contents */}
      {activeTab === 'monthly_grid' && (
        <MonthlyFundGrid isAdmin={isManager} />
      )}

      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Inbox className="w-4 h-4 text-blue-600" />
              <span>Danh Sách Yêu Cầu Đóng Quỹ ({submissions.length})</span>
            </h3>
            {pendingCount > 0 && (
              <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                ⏳ Đang có {pendingCount} yêu cầu chờ xác nhận
              </span>
            )}
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Inbox className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-500">Chưa có yêu cầu đóng quỹ nào.</p>
              <button
                onClick={() => setShowSubmitFundModal(true)}
                className="tactile-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black"
              >
                Tạo yêu cầu nộp quỹ ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissions.map((sub) => {
                const isPending = sub.status === 'pending';
                const isApproved = sub.status === 'approved';
                const isRejected = sub.status === 'rejected';

                return (
                  <div
                    key={sub._id}
                    className="tactile-btn bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={sub.userId?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={sub.memberName}
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-200"
                          />
                          <div>
                            <h4 className="text-sm font-black text-slate-900">{sub.memberName}</h4>
                            <span className="text-[11px] text-slate-400 font-bold">
                              {new Date(sub.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase font-mono">
                            ⏳ Chờ duyệt
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase font-mono">
                            ✅ Đã duyệt
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase font-mono">
                            ❌ Từ chối
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-bold">Tháng đóng:</span>
                          <div className="flex flex-wrap gap-1">
                            {sub.months?.map(m => (
                              <span key={m} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black font-mono">
                                T{m.split('-')[1]}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-bold">Số tiền:</span>
                          <span className="text-sm font-black text-emerald-600 font-mono-numbers">
                            {Number(sub.amount).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        {sub.note && (
                          <p className="text-[11px] text-slate-600 font-bold italic line-clamp-1">
                            "{sub.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {sub.proofImage ? (
                        <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                          📸 Có ảnh bill đính kèm
                        </span>
                      ) : <span />}

                      <button
                        onClick={() => setSelectedReviewSubmission(sub)}
                        className="tactile-btn px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isManager && isPending ? 'Kiểm tra & Duyệt' : 'Xem Chi Tiết'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <DataGridTable
          data={finances}
          onBulkSave={(updates) => bulkUpdateMutation.mutateAsync(updates)}
          onDelete={handleDeleteFinance}
          isAdmin={isManager}
        />
      )}

      {/* Submit Fund Modal for Members */}
      <SubmitFundModal
        isOpen={showSubmitFundModal}
        onClose={() => setShowSubmitFundModal(false)}
      />

      {/* Review Modal for Treasurer / Admin */}
      <FundSubmissionReviewModal
        submission={selectedReviewSubmission}
        isOpen={!!selectedReviewSubmission}
        onClose={handleCloseReviewModal}
      />

      {/* Fund Configuration Modal for Treasurer / Admin */}
      <FundConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      {/* Quick QR Viewer Modal for All Members */}
      <QuickQrModal
        isOpen={showQuickQrModal}
        onClose={() => setShowQuickQrModal(false)}
      />

      {/* Add Single Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 relative bg-white border border-emerald-400 shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1">➕ {t('finances.add_modal_title')}</h3>
            <p className="text-xs text-slate-500 font-bold mb-6">{t('finances.add_modal_sub')}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('finances.trans_type')}</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="IN">{t('finances.type_in')}</option>
                    <option value="OUT">{t('finances.type_out')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('finances.category')}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="quy_thang">{t('finances.cat_monthly')}</option>
                    <option value="tien_san">{t('finances.cat_pitch')}</option>
                    <option value="nuoc_uong">{t('finances.cat_water')}</option>
                    <option value="dong_phuc">{t('finances.cat_kit')}</option>
                    <option value="phat">{t('finances.cat_fine')}</option>
                    <option value="khac">{t('finances.cat_other')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('finances.amount')}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('finances.desc')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('finances.desc_placeholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('finances.fund_month')}</label>
                <input
                  type="text"
                  placeholder={t('finances.fund_month_placeholder')}
                  value={formData.fundMonth}
                  onChange={(e) => setFormData({ ...formData, fundMonth: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-sm font-bold"
                >
                  {t('finances.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md"
                >
                  {t('finances.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Fund Email Modal */}
      <SendFundEmailModal 
        isOpen={showEmailModal} 
        onClose={() => setShowEmailModal(false)} 
      />

      {/* QR Code Viewer Modal */}
      {showQRModal && qrUrlFromParam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-sm glass-modal rounded-3xl p-6 relative bg-white border border-emerald-400 shadow-2xl text-center max-h-[90vh] overflow-y-auto overscroll-contain">
            <button
              onClick={handleCloseQR}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-900 mb-4">📲 {t('finances.qr_title')}</h3>
            <img 
              src={qrUrlFromParam} 
              alt="QR Code" 
              className="w-full h-auto rounded-2xl border-2 border-slate-200 shadow-md"
            />
            <button
              onClick={handleCloseQR}
              className="mt-6 w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md transition"
            >
              {t('finances.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
