import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MatchCard from '../components/MatchCard';
import { Plus, X, Bell } from 'lucide-react';

export default function MatchesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '19:15', // Default team prime time 19h-19h30!
    stadium: '',
    stadiumLink: '',
    pitchCost: 1000000,
    deal: '5-5',
    kitColor: '',
    opponentTeamName: '',
    opponentPhone: '',
    opponentFbLink: '',
    notes: ''
  });

  const { data: matchesRes } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get('/matches')
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/matches', {
      date: data.date,
      time: data.time,
      stadium: data.stadium,
      stadiumLink: data.stadiumLink,
      pitchCost: Number(data.pitchCost),
      deal: data.deal,
      kitColor: data.kitColor,
      opponent: {
        teamName: data.opponentTeamName,
        phone: data.opponentPhone,
        fbLink: data.opponentFbLink
      },
      notes: data.notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Đã tạo trận đấu mới (Khung 19h15). Nhớ gửi thông báo sau khi tạo xong!', 'Tạo trận thành công');
      setShowModal(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Tạo trận đấu thất bại', 'Lỗi');
    }
  });

  const cloneMutation = useMutation({
    mutationFn: (id) => api.post(`/matches/${id}/clone`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Đã nhân bản tạo trận đấu mới thành công!', 'Nhân bản trận');
    },
    onError: (err) => {
      toast.error(err.message || 'Nhân bản trận đấu thất bại', 'Lỗi');
    }
  });

  const checkInMutation = useMutation({
    mutationFn: ({ matchId, status, reason }) => api.put(`/matches/${matchId}/checkin`, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Đã cập nhật trạng thái điểm danh trận đấu!', 'Điểm Danh Thành Công');
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi điểm danh', 'Lỗi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/matches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Đã xóa trận đấu thành công!', 'Xóa trận');
    },
    onError: (err) => {
      toast.error(err.message || 'Xóa trận đấu thất bại', 'Lỗi');
    }
  });

  const notifyMutation = useMutation({
    mutationFn: (id) => api.post(`/matches/${id}/notify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Đã gửi email thông báo trận đấu cho toàn đội!', 'Gửi thông báo thành công');
    },
    onError: (err) => {
      toast.error(err.message || 'Gửi thông báo thất bại', 'Lỗi');
    }
  });

  const notifyPushMutation = useMutation({
    mutationFn: (id) => api.post(`/matches/${id}/notify-push`),
    onSuccess: () => {
      toast.success('Đã gửi push notification thành công!', 'Gửi Push thành công');
    },
    onError: (err) => {
      toast.error(err.message || 'Gửi push thất bại', 'Lỗi');
    }
  });

  const matches = matchesRes?.data || [];
  const filteredMatches = matches.filter(m => activeTab === 'upcoming' ? m.status === 'upcoming' : m.status !== 'upcoming');

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              ⚽ Quản Lý Trận Đấu
            </h2>
            <p className="text-xs font-bold text-slate-600">
              Ưu tiên Thứ 3 19h-19h30 • Điểm danh 3 trạng thái
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/30 transition w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Trận Mới</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl border border-slate-300 self-start">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'upcoming'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Sắp diễn ra ({matches.filter(m => m.status === 'upcoming').length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'past'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Lịch sử ({matches.filter(m => m.status !== 'upcoming').length})
          </button>
        </div>
      </div>

      {/* Match Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMatches.map(match => (
          <MatchCard
            key={match._id}
            match={match}
            onCheckIn={(matchId, status, reason) => checkInMutation.mutate({ matchId, status, reason })}
            onClone={(id) => cloneMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onNotify={(id) => notifyMutation.mutate(id)}
            onNotifyPush={(id) => notifyPushMutation.mutate(id)}
            isAdmin={isAdmin}
          />
        ))}

        {filteredMatches.length === 0 && (
          <div className="col-span-full glass-card-white rounded-3xl p-12 text-center text-slate-600 font-bold bg-white">
            Không có trận đấu nào trong danh mục này.
          </div>
        )}
      </div>

      {/* Create Match Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-lg max-h-[90vh] glass-modal rounded-3xl relative bg-white border border-emerald-400 shadow-2xl overflow-hidden flex flex-col">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-black text-slate-900 mb-1">⚽ Tạo Trận Đấu Mới</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold leading-tight">Mở danh sách điểm danh cho toàn đội.</p>
            </div>

            <form id="create-match-form" onSubmit={handleSubmit} className="space-y-4 px-5 sm:px-6 py-5 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày thi đấu:</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giờ thi đấu (Khung 19h - 19h30):</label>
                  <input
                    type="text"
                    required
                    placeholder="19:15"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sân bóng (Hà Nội):</label>
                  <input
                    type="text"
                    required
                    placeholder="Sân Thượng Đình, Q. Thanh Xuân..."
                    value={formData.stadium}
                    onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link Google Maps:</label>
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/..."
                    value={formData.stadiumLink}
                    onChange={(e) => setFormData({ ...formData, stadiumLink: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiền sân (VNĐ):</label>
                  <input
                    type="number"
                    required
                    step="100000"
                    value={formData.pitchCost}
                    onChange={(e) => setFormData({ ...formData, pitchCost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Keo sân (Deal):</label>
                  <input
                    type="text"
                    placeholder="5-5 / 6-4"
                    value={formData.deal}
                    onChange={(e) => setFormData({ ...formData, deal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên đội đối thủ:</label>
                  <input
                    type="text"
                    placeholder="FC Thăng Long"
                    value={formData.opponentTeamName}
                    onChange={(e) => setFormData({ ...formData, opponentTeamName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Màu áo thi đấu:</label>
                  <select
                    value={formData.kitColor}
                    onChange={(e) => setFormData({ ...formData, kitColor: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Chưa chốt / Tự chọn --</option>
                    <option value="xanh dương">Xanh dương</option>
                    <option value="đỏ">Đỏ</option>
                    <option value="đen">Đen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SĐT đối thủ:</label>
                  <input
                    type="text"
                    placeholder="098..."
                    value={formData.opponentPhone}
                    onChange={(e) => setFormData({ ...formData, opponentPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link Facebook Đội bạn:</label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/..."
                    value={formData.opponentFbLink}
                    onChange={(e) => setFormData({ ...formData, opponentFbLink: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

            </form>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 text-sm font-bold w-full sm:w-auto transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                form="create-match-form"
                disabled={createMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md w-full sm:w-auto transition"
              >
                Tạo Trận Đấu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
