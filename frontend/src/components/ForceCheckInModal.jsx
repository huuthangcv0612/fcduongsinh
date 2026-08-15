import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { AlertTriangle, CheckCircle, XCircle, HelpCircle, Calendar, MapPin, Clock, DollarSign } from 'lucide-react';

export default function ForceCheckInModal() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState(null); // 'uncertain' | 'absent'
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: forceMatchRes, isLoading } = useQuery({
    queryKey: ['forceCheckInMatch'],
    queryFn: () => api.get('/matches/force-checkin'),
    refetchInterval: 30000
  });

  const pendingMatch = forceMatchRes?.data;

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
      setErrorMsg(err.message || 'Lỗi khi lưu kết quả điểm danh');
    }
  });

  if (isLoading || !pendingMatch) {
    return null;
  }

  const handleSubmit = (status) => {
    if ((status === 'uncertain' || status === 'absent') && !reason.trim()) {
      setErrorMsg(`Vui lòng nhập lý do cụ thể cho trạng thái ${status === 'uncertain' ? 'chưa chắc chắn' : 'báo nghỉ'}.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-lg glass-modal rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden bg-white border-2 border-emerald-400 shadow-2xl">
        
        {/* Top Warning Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-black uppercase tracking-wider mb-6">
          <AlertTriangle className="w-4 h-4 animate-bounce text-amber-600" />
          YÊU CẦU ĐIỂM DANH TRẬN SẮP ĐẾN
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          ⚽ Bạn có tham gia trận tới không?
        </h2>
        <p className="text-slate-600 text-xs sm:text-sm font-bold mb-6">
          FC Nhà Trẻ bắt buộc thành viên điểm danh trước để chuẩn bị đội hình & chốt kèo sân!
        </p>

        {/* Match Info Details Card */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200 text-left space-y-3 font-bold text-xs">
          <div className="flex items-center gap-3 text-slate-800 text-sm">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Ngày: {pendingMatch.date}</span>
            <Clock className="w-4 h-4 text-cyan-600 ml-2" />
            <span>{pendingMatch.time}</span>
          </div>

          <div className="flex items-start gap-3 text-slate-800 text-sm">
            <MapPin className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span>Sân: <b>{pendingMatch.stadium}</b></span>
          </div>

          <div className="flex items-center gap-3 text-slate-800 text-sm">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span>Keo: <b>{pendingMatch.pitchCost?.toLocaleString('vi-VN')} VNĐ ({pendingMatch.deal})</b></span>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-600">
            <span>Đối thủ: <strong className="text-slate-900">{pendingMatch.opponent?.teamName || 'Đang chốt'}</strong></span>
            <span className="text-emerald-700 font-extrabold font-mono">
              Đã chốt: {pendingMatch.checkInSummary?.joined || 0} có mặt
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Reason Input Box for uncertain & absent */}
        {(selectedStatus === 'uncertain' || selectedStatus === 'absent') && (
          <div className="mb-5 text-left">
            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${selectedStatus === 'uncertain' ? 'text-amber-700' : 'text-rose-700'}`}>
              Lý do {selectedStatus === 'uncertain' ? 'chưa chắc chắn' : 'xin nghỉ'} (Bắt buộc):
            </label>
            <input
              type="text"
              autoFocus
              placeholder={selectedStatus === 'uncertain' ? 'VD: Đang bị sốt nhẹ / Chờ xếp lịch ca làm...' : 'VD: Bận công tác xa / Chấn thương nhẹ...'}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setErrorMsg('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {/* Option 1: Joined */}
          <button
            onClick={() => handleSubmit('joined')}
            disabled={checkInMutation.isPending}
            className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            THAM GIA
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
            className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition disabled:opacity-50"
          >
            <HelpCircle className="w-4 h-4" />
            {selectedStatus === 'uncertain' ? 'XÁC NHẬN' : 'CHƯA CHẮC'}
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
            className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            {selectedStatus === 'absent' ? 'XÁC NHẬN' : 'XIN NGHỈ'}
          </button>
        </div>
      </div>
    </div>
  );
}
