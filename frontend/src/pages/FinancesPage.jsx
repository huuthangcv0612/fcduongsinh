import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmModalContext';
import StatCard from '../components/StatCard';
import DataGridTable from '../components/DataGridTable';
import MonthlyFundGrid from '../components/MonthlyFundGrid';
import SendFundEmailModal from '../components/SendFundEmailModal';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, X, Table, ListFilter, Mail } from 'lucide-react';

export default function FinancesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [activeTab, setActiveTab] = useState('monthly_grid'); // 'monthly_grid' | 'transactions'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

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
    queryFn: () => api.get('/finances/balance')
  });

  // Finances list query
  const { data: financesRes } = useQuery({
    queryKey: ['finances'],
    queryFn: () => api.get('/finances')
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/finances', {
      ...data,
      amount: Number(data.amount)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success('Đã thêm phiếu thu/chi thành công vào Quỹ Đội!', 'Ghi nhận thu chi');
      setShowAddModal(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Tạo giao dịch thất bại', 'Lỗi');
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (updates) => api.put('/finances/bulk-update', { updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success('Đã cập nhật hàng loạt dữ liệu Data Grid thành công!', 'Lưu hàng loạt');
    },
    onError: (err) => {
      toast.error(err.message || 'Cập nhật Data Grid thất bại', 'Lỗi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/finances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success('Đã xóa phiếu thu/chi thành công!', 'Đã xóa');
    },
    onError: (err) => {
      toast.error(err.message || 'Xóa giao dịch thất bại', 'Lỗi');
    }
  });

  const handleDeleteFinance = async (id) => {
    const isConfirmed = await confirm({
      title: 'Xóa Giao Dịch Thu/Chi',
      message: 'Bạn có chắc chắn muốn xóa phiếu thu/chi này khỏi hệ thống Quỹ Đội?',
      confirmText: 'Xóa Ngay',
      cancelText: 'Hủy Bỏ',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            💰 Quản Lý Tài Chính & Quỹ Đội Bóng
          </h2>
          <p className="text-xs font-bold text-slate-600">
            Bảng ma trận quản lý quỹ theo chuẩn Google Sheets & Data Grid thu chi trực quan
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-black text-sm shadow-md shadow-slate-800/30 transition"
            >
              <Mail className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Gửi Email Báo Quỹ</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Phiếu Thu/Chi</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Tổng Số Dư Quỹ"
          value={`${balanceData.balance?.toLocaleString('vi-VN')} đ`}
          subtext="Tính tự động qua Aggregation Pipeline"
          icon={Wallet}
          color="emerald"
        />

        <StatCard
          title="Tổng Khoản Thu (+)"
          value={`${balanceData.totalIn?.toLocaleString('vi-VN')} đ`}
          subtext="Tiền nộp quỹ tháng, tài trợ, phạt"
          icon={ArrowUpRight}
          color="cyan"
        />

        <StatCard
          title="Tổng Khoản Chi (-)"
          value={`${balanceData.totalOut?.toLocaleString('vi-VN')} đ`}
          subtext="Tiền sân, nước uống, trang phục"
          icon={ArrowDownRight}
          color="rose"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 pb-2">
        <button
          onClick={() => setActiveTab('monthly_grid')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 ${
            activeTab === 'monthly_grid'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-300'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>📊 Bảng Quỹ Đội Theo Tháng (Google Sheets)</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-300'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>📝 Lịch Sử Giao Dịch Thu/Chi ({finances.length})</span>
        </button>
      </div>

      {/* Main Tab Contents */}
      {activeTab === 'monthly_grid' ? (
        <MonthlyFundGrid isAdmin={isAdmin} />
      ) : (
        <DataGridTable
          data={finances}
          onBulkSave={(updates) => bulkUpdateMutation.mutateAsync(updates)}
          onDelete={handleDeleteFinance}
          isAdmin={isAdmin}
        />
      )}

      {/* Add Single Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 relative bg-white border border-emerald-400 shadow-2xl">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1">➕ Thêm Phiếu Thu/Chi Mới</h3>
            <p className="text-xs text-slate-500 font-bold mb-6">Ghi nhận giao dịch tài chính vào Quỹ Đội</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại giao dịch:</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="IN">+ THU (Cộng tiền)</option>
                    <option value="OUT">- CHI (Trừ tiền)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hạng mục:</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="quy_thang">Quỹ tháng</option>
                    <option value="tien_san">Tiền sân</option>
                    <option value="nuoc_uong">Nước uống</option>
                    <option value="dong_phuc">Đồng phục</option>
                    <option value="phat">Phạt trễ/vắng</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số tiền (VNĐ):</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết:</label>
                <input
                  type="text"
                  required
                  placeholder="Mô tả lý do thu chi..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tháng quỹ (nếu có):</label>
                <input
                  type="text"
                  placeholder="YYYY-MM (VD: 2025-03)"
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
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md"
                >
                  Tạo Giao Dịch
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
    </div>
  );
}
