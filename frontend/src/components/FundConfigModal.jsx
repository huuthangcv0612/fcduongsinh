import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { X, Save, Settings, Landmark, CreditCard, DollarSign, QrCode, UploadCloud, Check } from 'lucide-react';

const POPULAR_BANKS = [
  { code: 'MB', name: 'MB Bank (Quân Đội)' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'ICB', name: 'VietinBank' },
  { code: 'ACB', name: 'ACB (Á Châu)' },
  { code: 'TPB', name: 'TPBank (Tiên Phong)' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'OCB', name: 'OCB (Phương Đông)' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'MSB', name: 'MSB (Hàng Hải)' }
];

export default function FundConfigModal({ isOpen, onClose }) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: configRes, isLoading } = useQuery({
    queryKey: ['fund-config'],
    queryFn: () => api.get('/config/fund'),
    enabled: isOpen
  });

  const config = configRes?.data;

  const [formData, setFormData] = useState({
    bankName: 'MB Bank',
    bankCode: 'MB',
    accountNumber: '0352526868',
    accountName: 'TRAN DUC HOANG',
    monthlyFee: 100000,
    customQrUrl: '',
    transferPrefix: 'FCNHATRE',
    note: ''
  });

  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        bankName: config.bankName || 'MB Bank',
        bankCode: config.bankCode || 'MB',
        accountNumber: config.accountNumber || '',
        accountName: config.accountName || '',
        monthlyFee: config.monthlyFee || 100000,
        customQrUrl: config.customQrUrl || '',
        transferPrefix: config.transferPrefix || 'FCNHATRE',
        note: config.note || ''
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/config/fund', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-config'] });
      toast.success('Đã lưu cấu hình tài khoản và quỹ thành công!', 'Thành công');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi lưu cấu hình', 'Lỗi');
    }
  });

  const handleBankChange = (bankCode) => {
    const matched = POPULAR_BANKS.find(b => b.code === bankCode);
    setFormData({
      ...formData,
      bankCode,
      bankName: matched ? matched.name : bankCode
    });
  };

  const handleCustomQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB', 'Lỗi');
      return;
    }

    setUploadingQr(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, customQrUrl: event.target?.result });
      setUploadingQr(false);
    };
    reader.onerror = () => {
      toast.error('Lỗi khi đọc file ảnh', 'Lỗi');
      setUploadingQr(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!isOpen) return null;

  const previewQrUrl = formData.customQrUrl || `https://img.vietqr.io/image/${formData.bankCode}-${formData.accountNumber}-compact2.png?amount=${formData.monthlyFee}&addInfo=${encodeURIComponent(formData.transferPrefix + ' TEST T08')}&accountName=${encodeURIComponent(formData.accountName)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md animate-fade-in overflow-y-auto">
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-[11px] font-black uppercase tracking-wider mb-2">
            <Settings className="w-3.5 h-3.5" /> Quản Trị Quỹ & Tài Khoản
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ⚙️ Cấu Hình Thu Quỹ & Mã QR
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-1">
            Cấu hình thông tin tài khoản thụ hưởng và số tiền quỹ định kỳ 1 tháng cho toàn đội.
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 font-bold">Đang tải cấu hình...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Bank Select */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Ngân hàng thụ hưởng
              </label>
              <select
                value={formData.bankCode}
                onChange={(e) => handleBankChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                {POPULAR_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Account Number & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  required
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="VD: 0352526868"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-black font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên chủ tài khoản (In hoa)
                </label>
                <input
                  type="text"
                  required
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value.toUpperCase() })}
                  placeholder="VD: TRAN DUC HOANG"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-black uppercase focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>

            {/* Monthly Fee & Transfer Prefix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Số tiền đóng 1 tháng (VNĐ)
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="10000"
                  value={formData.monthlyFee}
                  onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-black font-mono-numbers focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Cú pháp chuyển khoản (Tiền tố)
                </label>
                <input
                  type="text"
                  required
                  value={formData.transferPrefix}
                  onChange={(e) => setFormData({ ...formData, transferPrefix: e.target.value.toUpperCase() })}
                  placeholder="VD: FCNHATRE"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-black font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>

            {/* QR Preview & Custom QR */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-white p-2 rounded-xl shadow-xs shrink-0 border border-slate-200">
                <img
                  src={previewQrUrl}
                  alt="Xem trước QR"
                  className="w-24 h-24 object-contain rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                <span className="text-xs font-black text-slate-800 block">Mã QR VietQR Tự Động</span>
                <p className="text-[11px] text-slate-500 font-bold">
                  Mã QR sẽ tự động hiển thị số tiền và cú pháp chính xác khi thành viên bấm chọn tháng đóng quỹ.
                </p>
                {formData.customQrUrl ? (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customQrUrl: '' })}
                    className="text-[11px] font-black text-rose-600 hover:underline"
                  >
                    Dùng lại VietQR tự động (Xóa ảnh QR tĩnh)
                  </button>
                ) : (
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-black text-purple-600 hover:text-purple-800 cursor-pointer">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Tải ảnh QR tĩnh tùy chỉnh (nếu có)</span>
                    <input type="file" accept="image/*" onChange={handleCustomQrUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="tactile-btn px-4 py-2 text-xs font-black text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="tactile-btn px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/25 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{updateMutation.isPending ? 'Đang lưu...' : 'Lưu Cấu Hình'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
