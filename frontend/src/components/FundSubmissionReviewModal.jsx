import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { X, CheckCircle2, XCircle, Calendar, CreditCard, User, Maximize2, ShieldCheck, Clock } from 'lucide-react';

export default function FundSubmissionReviewModal({ submission, isOpen, onClose }) {
  const { isManager } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const approveMutation = useMutation({
    mutationFn: () => api.put(`/fund-submissions/${submission?._id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-grid'] });
      toast.success(`Đã xác nhận đóng quỹ cho ${submission?.memberName}!`, 'Thành công');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Không thể phê duyệt yêu cầu này', 'Lỗi');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => api.put(`/fund-submissions/${submission?._id}/reject`, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-submissions'] });
      toast.info('Đã từ chối yêu cầu đóng quỹ.', 'Thông báo');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Không thể từ chối yêu cầu này', 'Lỗi');
    }
  });

  if (!isOpen || !submission) return null;

  const isPending = submission.status === 'pending';
  const formattedDate = new Date(submission.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="tactile-btn absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 flex items-start gap-4">
          <img
            src={submission.userId?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={submission.memberName}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-sm shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {submission.memberName}
              </h3>
              {submission.status === 'pending' && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase font-mono">
                  ⏳ Chờ xác nhận
                </span>
              )}
              {submission.status === 'approved' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase font-mono">
                  ✅ Đã xác nhận
                </span>
              )}
              {submission.status === 'rejected' && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase font-mono">
                  ❌ Đã từ chối
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              Gửi lúc: {formattedDate} • Vị trí: {submission.userId?.position || 'Thành viên'}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          
          {/* Left: Info */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Các tháng đóng quỹ</span>
              <div className="flex flex-wrap gap-1.5">
                {submission.months?.map(m => (
                  <span key={m} className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-black font-mono">
                    Tháng {m.split('-')[1]}/{m.split('-')[0]}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Số tiền chuyển khoản</span>
              <div className="text-xl font-black text-emerald-600 font-mono-numbers">
                {Number(submission.amount).toLocaleString('vi-VN')} đ
              </div>
            </div>

            {submission.note && (
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Lời nhắn của thành viên</span>
                <p className="text-xs text-slate-700 font-bold italic bg-white p-2 rounded-lg border border-slate-200">
                  "{submission.note}"
                </p>
              </div>
            )}

            {submission.status === 'rejected' && submission.rejectionReason && (
              <div>
                <span className="text-[10px] font-black uppercase text-rose-500 block mb-0.5">Lý do từ chối</span>
                <p className="text-xs text-rose-700 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {submission.rejectionReason}
                </p>
              </div>
            )}
          </div>

          {/* Right: Bill Preview */}
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 flex flex-col items-center justify-center p-2 min-h-[160px]">
            {submission.proofImage ? (
              <>
                <img
                  src={submission.proofImage}
                  alt="Bill chuyển khoản"
                  className="max-h-52 w-auto object-contain rounded-lg cursor-zoom-in hover:opacity-90 transition"
                  onClick={() => setIsImageZoomed(true)}
                />
                <button
                  type="button"
                  onClick={() => setIsImageZoomed(true)}
                  className="tactile-btn absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[10px] font-black backdrop-blur-md flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" /> Phóng to
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-bold">Không có ảnh bill</span>
            )}
          </div>
        </div>

        {/* Zoom Lightbox */}
        {isImageZoomed && (
          <div
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsImageZoomed(false)}
          >
            <img
              src={submission.proofImage}
              alt="Bill chuyển khoản phóng to"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setIsImageZoomed(false)}
              className="tactile-btn absolute top-6 right-6 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Reject Reason Form if toggled */}
        {showRejectForm && isPending && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-fade-in">
            <label className="block text-xs font-black text-rose-800 uppercase tracking-wider">
              Lý do từ chối yêu cầu đóng quỹ
            </label>
            <input
              type="text"
              placeholder="VD: Không tìm thấy giao dịch chuyển khoản trên sao kê..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-white border border-rose-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="tactile-btn px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => rejectMutation.mutate(rejectionReason)}
                disabled={rejectMutation.isPending}
                className="tactile-btn px-4 py-1.5 rounded-xl bg-rose-600 text-white font-black text-xs shadow-sm hover:bg-rose-700"
              >
                {rejectMutation.isPending ? 'Đang gửi...' : 'Xác Nhận Từ Chối'}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons (For Treasurer / Admin) */}
        {isManager && isPending && !showRejectForm && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowRejectForm(true)}
              className="tactile-btn w-full sm:w-auto px-5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-black text-xs transition"
            >
              ✕ Từ Chối Yêu Cầu
            </button>
            <button
              type="button"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="tactile-btn w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{approveMutation.isPending ? 'Đang duyệt...' : '✓ Xác Nhận Đã Nhận Tiền (Duyệt)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
