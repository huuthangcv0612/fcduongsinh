import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { X, Save, Settings, Landmark, CreditCard, DollarSign, QrCode, UploadCloud, Check } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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

  useBodyScrollLock(isOpen);

  const { data: configRes, isLoading } = useQuery({
    queryKey: ['fund-config'],
    queryFn: () => api.get('/config/fund'),
    enabled: isOpen
  });

  const config = configRes?.data;

  const [formData, setFormData] = useState({
    bankName: 'Techcombank',
    bankCode: 'TCB',
    accountNumber: '4645199999',
    accountName: 'NGUYEN HUU THANG',
    monthlyFee: 200000,
    customQrUrl: '',
    transferPrefix: 'FCDUONGSINH',
    note: ''
  });

  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        bankName: config.bankName || 'Techcombank',
        bankCode: config.bankCode || 'TCB',
        accountNumber: config.accountNumber || '',
        accountName: config.accountName || '',
        monthlyFee: config.monthlyFee || 200000,
        customQrUrl: config.customQrUrl || '',
        transferPrefix: config.transferPrefix || 'FCDUONGSINH',
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

  const previewQrUrl = formData.customQrUrl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4 bg-slate-900/65 backdrop-blur-md animate-fade-in">
      <div className="min-h-full flex items-center justify-center py-4">
        <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl relative">
          
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base text-slate-900 font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
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
                  placeholder="VD: 4645199999"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base text-slate-900 font-black font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
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
                  placeholder="VD: NGUYEN HUU THANG"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base text-slate-900 font-black uppercase focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>

            {/* Transfer Prefix */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Cú pháp chuyển khoản (Tiền tố)
              </label>
              <input
                type="text"
                required
                value={formData.transferPrefix}
                onChange={(e) => setFormData({ ...formData, transferPrefix: e.target.value.toUpperCase() })}
                placeholder="VD: FCDUONGSINH"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base text-slate-900 font-black font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
              <span className="text-[11px] text-slate-500 font-bold block mt-1">
                * Quỹ được tính tự động chia đều theo chi phí từng trận đấu (sân + dịch vụ) cho các thành viên tham gia.
              </span>
            </div>

            {/* QR Image Upload & Preview */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Ảnh Mã QR Chuyển Khoản Của Đội
              </label>

              {formData.customQrUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
                  <img
                    src={formData.customQrUrl}
                    alt="Ảnh QR của đội"
                    className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg border border-slate-100 shadow-xs"
                  />
                  <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                    <span className="text-xs font-bold text-emerald-600 block">
                      ✅ Đang sử dụng ảnh mã QR của đội
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Thành viên sẽ quét trực tiếp ảnh mã QR này khi nộp quỹ hoặc xem mã QR nhanh.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 cursor-pointer transition">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Đổi ảnh QR khác</span>
                        <input type="file" accept="image/*" onChange={handleCustomQrUpload} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, customQrUrl: '' })}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-2xl p-6 text-center transition bg-white space-y-2">
                  <UploadCloud className="w-8 h-8 text-purple-600 mx-auto" />
                  <p className="text-xs font-black text-slate-700">Tải lên ảnh mã QR chuyển khoản của đội</p>
                  <p className="text-[11px] text-slate-400">Hỗ trợ PNG, JPG, JPEG (Tối đa 5MB)</p>
                  <label className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-700 cursor-pointer shadow-md transition">
                    <span>Chọn ảnh từ máy</span>
                    <input type="file" accept="image/*" onChange={handleCustomQrUpload} className="hidden" />
                  </label>
                </div>
              )}
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
  </div>
  );
}
