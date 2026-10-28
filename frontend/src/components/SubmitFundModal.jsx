import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud, QrCode, Check, AlertCircle, Sparkles, CreditCard, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function SubmitFundModal({ isOpen, onClose, defaultMatchId = null }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useBodyScrollLock(isOpen);

  // Query live Fund & Bank configuration
  const { data: configRes, isLoading: isConfigLoading } = useQuery({
    queryKey: ['fund-config'],
    queryFn: () => api.get('/config/fund'),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000
  });

  // Query recent matches to pay for
  const { data: matchesRes, isLoading: isMatchesLoading } = useQuery({
    queryKey: ['matches-for-payment'],
    queryFn: () => api.get('/matches?limit=20'),
    enabled: isOpen,
    staleTime: 30000
  });

  const config = configRes?.data || {};
  const bankName = config.bankName || 'Techcombank';
  const bankCode = config.bankCode || 'TCB';
  const accountNumber = config.accountNumber || '4645199999';
  const accountName = config.accountName || 'NGUYEN HUU THANG';
  const transferPrefix = config.transferPrefix || 'FCDUONGSINH';

  const matchesList = useMemo(() => {
    return Array.isArray(matchesRes?.data) ? matchesRes.data : [];
  }, [matchesRes]);

  const [selectedMatchId, setSelectedMatchId] = useState(defaultMatchId || '');
  const [amount, setAmount] = useState(50000);
  const [proofImage, setProofImage] = useState('');
  const [imageSizeInfo, setImageSizeInfo] = useState('');
  const [note, setNote] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isQrZoomed, setIsQrZoomed] = useState(false);

  // When matches load or defaultMatchId changes, set selected match
  useEffect(() => {
    if (defaultMatchId) {
      setSelectedMatchId(defaultMatchId);
    } else if (!selectedMatchId && matchesList.length > 0) {
      // Pick the first unpaid match if available, or the latest completed match
      const unpaid = matchesList.find(m => m.userCheckInStatus === 'joined' && !m.fundSummary?.userIsPaid);
      if (unpaid) {
        setSelectedMatchId(unpaid._id);
      } else {
        setSelectedMatchId(matchesList[0]._id);
      }
    }
  }, [defaultMatchId, matchesList]);

  // Selected match object
  const selectedMatch = useMemo(() => {
    return matchesList.find(m => m._id === selectedMatchId) || null;
  }, [matchesList, selectedMatchId]);

  // Update amount when selected match changes
  useEffect(() => {
    if (selectedMatch) {
      const fee = selectedMatch.fundSummary?.userFeeToPay ?? selectedMatch.fundSummary?.feePerPerson ?? 0;
      if (fee > 0) {
        setAmount(fee);
      }
    }
  }, [selectedMatch]);

  // Helper to compress bill image using canvas before uploading
  const compressBillImage = (file) => {
    return new Promise((resolve, reject) => {
      const MAX_DIMENSION = 1400;
      const TARGET_MAX_BYTES = 700 * 1024;

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let base64 = canvas.toDataURL('image/jpeg', quality);

        while (base64.length > TARGET_MAX_BYTES * 1.37 && quality > 0.45) {
          quality -= 0.1;
          base64 = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(base64);
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 20MB', 'Ảnh quá lớn');
      return;
    }

    setUploadingImage(true);
    try {
      const compressedBase64 = await compressBillImage(file);
      setProofImage(compressedBase64);

      const originalMB = (file.size / (1024 * 1024)).toFixed(1);
      const compressedKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
      if (file.size > 800 * 1024) {
        setImageSizeInfo(`Đã tối ưu: ${originalMB}MB → ${compressedKB}KB`);
      } else {
        setImageSizeInfo(`Dung lượng tối ưu: ${compressedKB}KB`);
      }
    } catch (err) {
      toast.error('Lỗi khi đọc file ảnh. Vui lòng thử lại!', 'Lỗi');
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/fund-submissions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['match-funds'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['myFundStatus'] });
      toast.success('Đã gửi yêu cầu đóng tiền trận! Thủ quỹ sẽ xác nhận sớm.', 'Thành công');
      onClose();
      setProofImage('');
      setImageSizeInfo('');
      setNote('');
    },
    onError: (err) => {
      toast.error(err.message || 'Không thể gửi yêu cầu đóng quỹ', 'Lỗi');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedMatchId) {
      toast.warning('Vui lòng chọn trận đấu đóng tiền');
      return;
    }
    if (!amount || Number(amount) < 1000) {
      toast.warning('Vui lòng nhập số tiền hợp lệ (tối thiểu 1.000đ)');
      return;
    }
    if (!proofImage) {
      toast.warning('Vui lòng tải lên ảnh chụp màn hình bill chuyển khoản');
      return;
    }

    submitMutation.mutate({
      matchId: selectedMatchId,
      amount: Number(amount),
      proofImage,
      note
    });
  };

  // Build transfer syntax
  const safeUserName = user?.name
    ? user.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    : 'MEM';
  const matchDateCompact = selectedMatch?.date ? selectedMatch.date.replace(/-/g, '').slice(2) : 'TRAN';
  const transferSyntax = `${transferPrefix} ${safeUserName} ${matchDateCompact}`;

  // Generate dynamic VietQR URL with exact amount and syntax
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferSyntax)}&accountName=${encodeURIComponent(accountName)}`;

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}: ${text}`, 'Đã sao chép');
  };

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `FCDuongSinh_QR_${transferSyntax.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải ảnh mã QR về máy!', 'Tải thành công');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-black uppercase tracking-wider mb-2">
              <CreditCard className="w-3.5 h-3.5" /> Nộp Quỹ Trận Đấu
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ⚽ Chuyển Khoản & Báo Đóng Tiền Trận
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Chọn trận đấu bạn đã tham gia, chuyển khoản theo mã QR và tải ảnh bill để Thủ quỹ duyệt tự động.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bank Transfer Box */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md flex flex-col sm:flex-row items-center gap-4">
              <div 
                className="bg-white p-2 rounded-xl shrink-0 shadow-sm relative group cursor-pointer"
                onClick={() => qrUrl && setIsQrZoomed(true)}
                title="Nhấn để xem phóng to mã QR"
              >
                {isConfigLoading ? (
                  <div className="w-28 h-28 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-slate-400 animate-bounce" />
                  </div>
                ) : (
                  <>
                    <img
                      src={qrUrl}
                      alt="VietQR Mã Thanh Toán"
                      className="w-28 h-28 object-contain rounded-lg group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition text-[10px] font-black text-white backdrop-blur-[1px]">
                      Phóng to
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 w-full space-y-1.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                  <span className="text-slate-400 font-bold">Ngân hàng:</span>
                  <span className="font-black text-white">{bankName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                  <span className="text-slate-400 font-bold">Chủ tài khoản:</span>
                  <span className="font-black text-white uppercase">{accountName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                  <span className="text-slate-400 font-bold">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-cyan-400 text-sm tracking-wider">{accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(accountNumber, 'Số tài khoản')}
                      className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-200 transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-400 font-bold">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-amber-400 text-xs">{transferSyntax}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(transferSyntax, 'Cú pháp chuyển khoản')}
                      className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-200 transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Zoom Modal */}
            {isQrZoomed && (
              <div 
                className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
                onClick={() => setIsQrZoomed(false)}
              >
                <div 
                  className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-3 relative shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setIsQrZoomed(false)}
                    className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div>
                    <h4 className="text-base font-black text-slate-900">📲 Quét Mã QR Chuyển Khoản</h4>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">{bankName} • {accountName}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border-2 border-slate-200 inline-block shadow-inner">
                    <img
                      src={qrUrl}
                      alt="Mã QR Chuyển Khoản Phóng To"
                      className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-xl mx-auto"
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">STK:</span>
                      <span className="font-black text-slate-900">{accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số tiền:</span>
                      <span className="font-black text-emerald-600">{Number(amount).toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nội dung:</span>
                      <span className="font-black text-blue-600 truncate">{transferSyntax}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="tactile-btn flex-1 py-2.5 rounded-xl bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white text-xs font-black shadow-md transition"
                    >
                      📥 Tải Ảnh QR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(accountNumber, 'Số tài khoản')}
                      className="tactile-btn px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition"
                    >
                      Sao Chép STK
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Match Selection */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>1. Chọn trận đấu đóng tiền</span>
                {selectedMatch?.fundSummary?.feePerPerson ? (
                  <span className="text-[11px] text-emerald-700 font-bold">
                    Tiền trận: {selectedMatch.fundSummary.feePerPerson.toLocaleString('vi-VN')} đ
                  </span>
                ) : null}
              </label>

              {isMatchesLoading ? (
                <div className="text-xs text-slate-500 font-bold p-3 bg-slate-50 rounded-xl">Đang tải danh sách trận đấu...</div>
              ) : matchesList.length === 0 ? (
                <div className="text-xs text-slate-500 font-bold p-3 bg-slate-50 rounded-xl">Chưa có trận đấu nào trong hệ thống.</div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {matchesList.map((m) => {
                    const isSelected = selectedMatchId === m._id;
                    const fee = m.fundSummary?.userFeeToPay ?? m.fundSummary?.feePerPerson ?? 0;
                    const isPaid = m.fundSummary?.userIsPaid;
                    const didJoin = m.userCheckInStatus === 'joined';

                    return (
                      <div
                        key={m._id}
                        onClick={() => setSelectedMatchId(m._id)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-600 shadow-sm'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                          }`}>
                            {m.date?.split('-')[2] || '⚽'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 text-xs truncate flex items-center gap-1.5">
                              <span>{m.matchType === 'internal' ? `⚔️ Nội bộ: ${m.fundSummary?.breakdown?.teamA?.name || 'Team A'} vs ${m.fundSummary?.breakdown?.teamB?.name || 'Team B'}` : `⚔️ vs ${m.opponent?.teamName || 'Giao hữu'}`}</span>
                              {m.deal && (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
                                  {m.deal}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5 truncate">
                              <span>Ngày {m.date}</span>
                              <span>•</span>
                              <span>{m.stadium}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-emerald-700 font-mono">
                            {fee > 0 ? `${fee.toLocaleString('vi-VN')} đ` : 'Chưa tính'}
                          </div>
                          {isPaid ? (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              ✓ Đã đóng
                            </span>
                          ) : didJoin ? (
                            <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              Đã đá • Chưa nộp
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400">
                              Chưa điểm danh
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Amount Input */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                2. Số tiền chuyển khoản (VNĐ)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
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

            {/* 3. Proof Image Upload */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>3. Tải lên ảnh bill chuyển khoản (Bắt buộc)</span>
                {imageSizeInfo && (
                  <span className="text-[11px] text-emerald-600 font-bold lowercase">{imageSizeInfo}</span>
                )}
              </label>

              {proofImage ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-900 flex items-center justify-center max-h-56 group">
                  <img
                    src={proofImage}
                    alt="Bill preview"
                    className="w-full h-auto max-h-56 object-contain"
                  />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                    <label className="tactile-btn px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-black cursor-pointer shadow-md">
                      Đổi ảnh khác
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setProofImage('');
                        setImageSizeInfo('');
                      }}
                      className="tactile-btn px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black shadow-md"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              ) : (
                <label className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition ${
                  uploadingImage ? 'border-blue-400 bg-blue-50/50' : 'border-slate-300 hover:border-blue-500 bg-slate-50/50'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-slate-800 mb-0.5">
                    {uploadingImage ? 'Đang nén và tải ảnh lên...' : 'Nhấp để tải lên bill chuyển khoản'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-bold">
                    Hỗ trợ JPG, PNG, WEBP (Tự động tối ưu dung lượng)
                  </span>
                </label>
              )}
            </div>

            {/* 4. Member Note */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                4. Ghi chú thêm (Không bắt buộc)
              </label>
              <input
                type="text"
                placeholder="VD: Em nộp tiền sân + 20k nước hôm qua..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Submit Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitMutation.isPending || !proofImage}
                className="tactile-btn flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 transition disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Đang gửi...' : 'Gửi Xác Nhận Đóng Tiền'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
