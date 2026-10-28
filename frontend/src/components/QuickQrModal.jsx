import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { X, QrCode, Download, Copy, Check, Landmark, Sparkles } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function QuickQrModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const toast = useToast();

  useBodyScrollLock(isOpen);

  const { data: configRes, isLoading } = useQuery({
    queryKey: ['fund-config'],
    queryFn: () => api.get('/config/fund'),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000
  });

  const config = configRes?.data || {};
  const fee = config.monthlyFee || 200000;
  const bankName = config.bankName || 'Techcombank';
  const bankCode = config.bankCode || 'TCB';
  const accountNumber = config.accountNumber || '4645199999';
  const accountName = config.accountName || 'NGUYEN HUU THANG';
  const transferPrefix = config.transferPrefix || 'FCDUONGSINH';
  const customQrUrl = config.customQrUrl || '';

  const safeUserName = user?.name
    ? user.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    : 'MEM';
  const transferSyntax = `${transferPrefix} ${safeUserName}`;
  const qrUrl = customQrUrl || (bankCode && accountNumber ? `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?addInfo=${encodeURIComponent(transferSyntax)}&accountName=${encodeURIComponent(accountName)}` : '');

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}: ${text}`, 'Đã sao chép');
  };

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `FCDuongSinh_QR_${bankCode}_${accountNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải ảnh mã QR về máy!', 'Tải thành công');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overscroll-contain"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl relative text-center space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="tactile-btn absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider mb-2">
            <QrCode className="w-3.5 h-3.5" /> Mã QR Đóng Quỹ Đội
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            📲 Quét Mã QR Chuyển Khoản
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            {bankName} • {accountName}
          </p>
        </div>

        {/* QR Frame */}
        <div className="p-3.5 bg-gradient-to-b from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-200 inline-block shadow-inner w-full flex items-center justify-center min-h-[260px]">
          {isLoading ? (
            <div className="w-60 h-60 rounded-xl bg-slate-200 animate-pulse flex flex-col items-center justify-center text-slate-400 gap-2">
              <QrCode className="w-8 h-8 animate-bounce text-slate-400" />
              <span className="text-xs font-bold">Đang tải mã QR...</span>
            </div>
          ) : qrUrl ? (
            <img
              src={qrUrl}
              alt="Mã QR Chuyển Khoản"
              className="w-60 h-60 sm:w-68 sm:h-68 object-contain rounded-xl mx-auto"
            />
          ) : (
            <div className="w-60 h-60 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center">
              <QrCode className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-600">Chưa có ảnh mã QR</p>
              <p className="text-[10px] text-slate-400 mt-1">Vui lòng chuyển khoản theo thông tin số tài khoản bên dưới</p>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left space-y-1.5 font-mono text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">STK:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900">{accountNumber}</span>
              <button
                type="button"
                onClick={() => handleCopy(accountNumber, 'Số tài khoản')}
                className="text-[10px] text-blue-600 font-sans font-bold hover:underline"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Mức quỹ/tháng:</span>
            <span className="font-black text-emerald-600">{(fee).toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Cú pháp:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-blue-600 truncate max-w-[150px]">{transferSyntax}</span>
              <button
                type="button"
                onClick={() => handleCopy(transferSyntax, 'Cú pháp')}
                className="text-[10px] text-blue-600 font-sans font-bold hover:underline"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="tactile-btn flex-1 py-2.5 rounded-xl bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white text-xs font-black shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải Ảnh QR</span>
          </button>
          <button
            type="button"
            onClick={() => handleCopy(accountNumber, 'Số tài khoản')}
            className="tactile-btn px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sao Chép STK</span>
          </button>
        </div>
      </div>
    </div>
  );
}
