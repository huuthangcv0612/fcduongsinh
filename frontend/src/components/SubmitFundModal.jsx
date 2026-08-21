import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud, QrCode, Check, AlertCircle, Sparkles, CreditCard, ChevronRight } from 'lucide-react';

export default function SubmitFundModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Query live Fund & Bank configuration
  const { data: configRes } = useQuery({
    queryKey: ['fund-config'],
    queryFn: () => api.get('/config/fund'),
    enabled: isOpen
  });

  const config = configRes?.data || {};
  const standardFeePerMonth = config.monthlyFee || user?.monthlyFund || 100000;
  const bankName = config.bankName || 'MB Bank';
  const bankCode = config.bankCode || 'MB';
  const accountNumber = config.accountNumber || '0352526868';
  const accountName = config.accountName || 'TRAN DUC HOANG';
  const transferPrefix = config.transferPrefix || 'FCNHATRE';
  const customQrUrl = config.customQrUrl || '';

  // Generate available months (previous month, current month, and next 4 months)
  const now = new Date();
  const generateMonthOptions = () => {
    const options = [];
    for (let i = -1; i <= 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthStr = `${year}-${monthNum < 10 ? '0' + monthNum : monthNum}`;
      const label = `Tháng ${monthNum}/${year}`;
      options.push({ value: monthStr, label, isCurrent: i === 0 });
    }
    return options;
  };

  const monthOptions = generateMonthOptions();
  const currentMonthStr = `${now.getFullYear()}-${now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1}`;

  const [selectedMonths, setSelectedMonths] = useState([currentMonthStr]);
  const [amount, setAmount] = useState(standardFeePerMonth);
  const [proofImage, setProofImage] = useState('');
  const [note, setNote] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (config.monthlyFee && selectedMonths.length > 0) {
      setAmount(selectedMonths.length * config.monthlyFee);
    }
  }, [config.monthlyFee, selectedMonths.length]);

  // Toggle month selection
  const toggleMonth = (monthValue) => {
    let newMonths;
    if (selectedMonths.includes(monthValue)) {
      if (selectedMonths.length === 1) {
        toast.warning('Bạn phải chọn ít nhất 1 tháng đóng quỹ', 'Lưu ý');
        return;
      }
      newMonths = selectedMonths.filter((m) => m !== monthValue);
    } else {
      newMonths = [...selectedMonths, monthValue].sort();
    }
    setSelectedMonths(newMonths);
    setAmount(newMonths.length * standardFeePerMonth);
  };

  // Handle bill image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 8MB', 'Ảnh quá lớn');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setProofImage(event.target?.result);
      setUploadingImage(false);
    };
    reader.onerror = () => {
      toast.error('Lỗi khi đọc file ảnh', 'Lỗi');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/fund-submissions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      toast.success('Đã gửi yêu cầu đóng quỹ! Thủ quỹ sẽ xác nhận sớm.', 'Thành công');
      onClose();
      // Reset form
      setSelectedMonths([currentMonthStr]);
      setAmount(standardFeePerMonth);
      setProofImage('');
      setNote('');
    },
    onError: (err) => {
      toast.error(err.message || 'Không thể gửi yêu cầu đóng quỹ', 'Lỗi');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedMonths.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 tháng đóng quỹ');
      return;
    }
    if (!amount || Number(amount) < 1000) {
      toast.warning('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (!proofImage) {
      toast.warning('Vui lòng tải lên ảnh chụp màn hình bill chuyển khoản');
      return;
    }

    submitMutation.mutate({
      months: selectedMonths,
      amount: Number(amount),
      proofImage,
      note
    });
  };

  if (!isOpen) return null;

  // Build VietQR description
  const monthLabelsForQR = selectedMonths.map(m => m.split('-')[1]).join('-');
  const safeUserName = user?.name
    ? user.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    : 'MEM';
  const transferSyntax = `${transferPrefix} ${safeUserName} T${monthLabelsForQR}`;
  const qrUrl = customQrUrl || `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferSyntax)}&accountName=${encodeURIComponent(accountName)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="tactile-btn absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-black uppercase tracking-wider mb-2">
            <CreditCard className="w-3.5 h-3.5" /> Nộp Quỹ Đội Bóng
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            💳 Chuyển Khoản & Báo Đóng Quỹ
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-1">
            Chọn các tháng cần đóng, chuyển khoản theo mã QR và tải ảnh bill để Thủ quỹ duyệt tự động.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* VietQR Bank Box */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white p-2 rounded-xl shrink-0 shadow-sm">
              <img
                src={qrUrl}
                alt="QR Đóng Quỹ"
                className="w-28 h-28 object-contain rounded-lg"
              />
            </div>
            <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Thông Tin Thụ Hưởng {bankName}</span>
              <div className="font-mono text-base font-black text-white tracking-tight">{accountNumber}</div>
              <div className="text-xs font-bold text-slate-300 uppercase">{accountName}</div>
              <div className="text-[11px] text-slate-300 font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 font-mono truncate">
                Cú pháp: <span className="text-emerald-400 font-black">{transferSyntax}</span>
              </div>
            </div>
          </div>

          {/* Month Multi-Select */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>1. Chọn các tháng đóng quỹ ({selectedMonths.length} tháng đã chọn)</span>
              <span className="text-[11px] text-blue-600 font-bold">{(standardFeePerMonth).toLocaleString('vi-VN')}đ / tháng</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {monthOptions.map((opt) => {
                const isSelected = selectedMonths.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMonth(opt.value)}
                    className={`tactile-btn p-2.5 rounded-xl border text-xs font-black flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : opt.isCurrent ? (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Nay</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              2. Tổng số tiền nộp (VNĐ)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="10000"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 font-black font-mono-numbers focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                {amount ? `${Number(amount).toLocaleString('vi-VN')} đ` : ''}
              </span>
            </div>
          </div>

          {/* Upload Proof Image */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>3. Ảnh chụp bill chuyển khoản <span className="text-rose-500">*</span></span>
              {uploadingImage && <span className="text-blue-600 text-xs font-bold animate-pulse">Đang tải ảnh...</span>}
            </label>

            {proofImage ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 max-h-48 group flex items-center justify-center">
                <img src={proofImage} alt="Bill chuyển khoản" className="max-h-48 w-auto object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <label className="tactile-btn px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-black cursor-pointer shadow-md">
                    Đổi ảnh khác
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setProofImage('')}
                    className="tactile-btn px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-black shadow-md"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ) : (
              <label className="tactile-btn border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center">
                <UploadCloud className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-xs font-black text-slate-800">Nhấn để chọn hoặc kéo thả ảnh bill</span>
                <span className="text-[10px] text-slate-400 font-bold mt-1">Hỗ trợ JPG, PNG, WEBP (Tối đa 8MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              4. Ghi chú thêm (không bắt buộc)
            </label>
            <input
              type="text"
              placeholder="VD: Em chuyển khoản từ Vietcombank tên Nguyễn Văn A"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="tactile-btn px-5 py-2.5 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending || uploadingImage || !proofImage}
              className="tactile-btn px-6 py-2.5 rounded-xl bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white font-black text-xs shadow-md shadow-blue-600/25 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Đang gửi...' : 'Gửi Biên Lai Xác Nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
