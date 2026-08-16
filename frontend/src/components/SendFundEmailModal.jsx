import React, { useState, useRef } from 'react';
import { Mail, Upload, X, Check, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function SendFundEmailModal({ isOpen, onClose }) {
  const currentMonth = new Date().getMonth() + 1;
  const [month, setMonth] = useState(`Tháng ${currentMonth}`);
  const [message, setMessage] = useState('');
  const [qrImage, setQrImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sendEmail, setSendEmail] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Kích thước ảnh quá lớn (Tối đa 5MB)');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrImage(reader.result);
        setPreviewUrl(reader.result);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await api.post('/finances/send-notification', {
        month,
        message,
        qrImage,
        sendEmail
      });
      
      setSuccess(sendEmail ? 'Đã gửi Email và Push thông báo thành công!' : 'Đã gửi Push thông báo thành công!');
      setTimeout(() => {
        onClose();
        setSuccess('');
        setMonth(`Tháng ${currentMonth}`);
        setMessage('');
        setQrImage(null);
        setPreviewUrl(null);
        setSendEmail(true);
      }, 2500);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi khi gửi email. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Gửi Thông Báo Đóng Quỹ
            </h2>
            <p className="text-emerald-50 text-sm mt-1 opacity-90">
              Hệ thống sẽ gửi email đồng loạt đến tất cả các thành viên.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-semibold border border-rose-200">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
              Tháng thu quỹ
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-semibold text-slate-700"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={`Tháng ${m}`}>Tháng {m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
              Lời nhắn (Tùy chọn)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập lời nhắn đến đội..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium text-slate-900 h-24 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
              Ảnh QR Ngân hàng
            </label>
            
            {!previewUrl ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600 group-hover:text-emerald-600">
                  Nhấn để tải lên mã QR
                </p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG tối đa 5MB</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                <img 
                  src={previewUrl} 
                  alt="QR Preview" 
                  className="w-full h-48 object-contain"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => {
                      setPreviewUrl(null);
                      setQrImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="bg-white text-slate-800 font-semibold px-4 py-2 rounded-full text-sm shadow-lg hover:scale-105 transition-transform"
                  >
                    Đổi ảnh khác
                  </button>
                </div>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <input 
              type="checkbox" 
              id="sendEmail" 
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-5 h-5 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 cursor-pointer"
            />
            <label htmlFor="sendEmail" className="text-sm font-bold text-slate-700 cursor-pointer select-none leading-tight">
              Đồng thời gửi Email đến toàn đội <br/>
              <span className="text-xs text-slate-500 font-medium">(Nếu tắt, sẽ chỉ gửi thông báo Push Notification)</span>
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-3xl">
          <button 
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={handleSend}
            disabled={loading || !qrImage}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {loading ? 'Đang gửi...' : 'Gửi Thông Báo'}
          </button>
        </div>
      </div>
    </div>
  );
}
