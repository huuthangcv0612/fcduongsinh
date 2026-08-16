import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Phone, Save, CheckCircle2, Sparkles, Upload, RefreshCw, LogOut, Bell, BellRing, BellOff } from 'lucide-react';

export default function ProfilePage() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pushStatus, setPushStatus] = useState(Notification.permission);

  const handleSubscribePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Trình duyệt của bạn không hỗ trợ thông báo Push.', 'Không hỗ trợ');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission !== 'granted') {
        toast.warning('Bạn đã từ chối nhận thông báo. Vui lòng mở cài đặt trình duyệt để cấp quyền lại.', 'Chưa cấp quyền');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const urlBase64ToUint8Array = (base64String) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      await api.post('/notifications/subscribe', { subscription });
      toast.success('Đã bật thông báo thiết bị thành công!', 'Thành công');
    } catch (error) {
      console.error('Push subscription failed:', error);
      toast.error('Bật thông báo thất bại: ' + error.message, 'Lỗi');
    }
  };

  const handleDebugPush = async () => {
    try {
      toast.info('Đang chẩn đoán kết nối...', 'Chờ chút');
      let log = "1. Trình duyệt cho phép: " + Notification.permission + "\n";
      
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      log += "2. Có sẵn Subscription: " + (subscription ? "CÓ" : "KHÔNG") + "\n";
      
      if (!subscription) {
        const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        log += "-> VITE_VAPID_PUBLIC_KEY: " + (vapid ? "ĐÃ CẤU HÌNH" : "THIẾU!") + "\n";
        
        try {
          log += "-> Đang thử Subscribe lại...\n";
          const urlBase64ToUint8Array = (base64String) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
          };
          
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid)
          });
          log += "-> KẾT QUẢ: Thành công tạo Subscription!\n";
          await api.post('/notifications/subscribe', { subscription });
        } catch (subErr) {
          log += "-> LỖI KHI SUBSCRIBE: " + subErr.name + " - " + subErr.message + "\n";
        }
      }

      const res = await api.post('/notifications/debug-push');
      log += "\n3. Database (MongoDB):\n" + JSON.stringify(res, null, 2);
      
      alert(log);
    } catch (err) {
      alert("Lỗi chẩn đoán hệ thống: " + err.message);
    }
  };

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    position: user?.position || 'Tự do',
    avatar: user?.avatar || ''
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.put('/auth/profile', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      localStorage.setItem('user', JSON.stringify(res.data));
      setSavedSuccess(true);
      toast.success('Hồ sơ cá nhân đã được cập nhật thành công!', 'Thành công');
      setTimeout(() => setSavedSuccess(false), 3000);
    },
    onError: (err) => {
      toast.error(err.message || 'Cập nhật hồ sơ thất bại', 'Lỗi');
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.warning('Vui lòng chọn file ảnh dung lượng dưới 5MB', 'Ảnh quá lớn');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Str = reader.result;
        const res = await api.post('/upload/avatar', { image: base64Str });
        if (res.success && res.data?.url) {
          setFormData(prev => ({ ...prev, avatar: res.data.url }));
          if (res.data.user) {
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
          queryClient.invalidateQueries({ queryKey: ['users'] });
          toast.success('Đã tải ảnh đại diện lên Cloudinary thành công!', 'Upload hoàn tất');
        }
      } catch (err) {
        console.error(err);
        toast.error(err.message || 'Upload ảnh lên Cloudinary thất bại', 'Lỗi Upload');
      } finally {
        setUploading(false);
      }
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleReloadLatest = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
      }

      toast.info('Đang tải lại phiên bản mới nhất...', 'Cập nhật ứng dụng');
      window.location.replace('/');
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải lại ứng dụng ngay bây giờ', 'Lỗi cập nhật');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20 md:pb-0">
      {/* High-Contrast Hero Banner */}
      <div className="rounded-3xl p-6 sm:p-8 border-2 border-emerald-600 relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="relative group">
            <img
              src={formData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={formData.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-2xl shadow-emerald-900/30"
            />
            
            {/* Instant Cloudinary Upload Button */}
            <label className="absolute inset-0 bg-slate-900/70 rounded-3xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer">
              {uploading ? (
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-black uppercase">Đổi ảnh</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" /> THÔNG TIN CÁ NHÂN
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2 drop-shadow-md">
              {user?.name}
              {isAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-xs uppercase font-mono shadow-sm">
                  Admin
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-300 text-emerald-950 font-black text-xs uppercase font-mono shadow-sm">
                  Member
                </span>
              )}
            </h2>

            <p className="text-xs sm:text-sm text-slate-100 font-bold font-mono">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-sm font-black flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span>Cập nhật hồ sơ cá nhân thành công!</span>
        </div>
      )}

      {/* Main Profile Form Card */}
      <div className="glass-card-white rounded-3xl p-6 sm:p-8 border border-slate-300 bg-white shadow-md">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-700" />
          <span>Chỉnh Sửa Hồ Sơ Đội Bóng</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                Họ và Tên:
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                Số Điện Thoại (Liên hệ đá bóng):
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="0901234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500 pl-10"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                Vị Trí Thi Đấu Yêu Thích:
              </label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="Thủ môn" className="bg-white text-slate-900">🧤 Thủ môn (GK)</option>
                <option value="Hậu vệ" className="bg-white text-slate-900">🛡️ Hậu vệ (DF)</option>
                <option value="Tiền vệ" className="bg-white text-slate-900">⚽ Tiền vệ (MF)</option>
                <option value="Tiền đạo" className="bg-white text-slate-900">🔥 Tiền đạo (FW)</option>
                <option value="Tự do" className="bg-white text-slate-900">🏃 Tự do / Đa năng</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Ảnh Đại Diện (Upload Cloudinary):</span>
                {uploading && <span className="text-emerald-700 font-bold animate-pulse">Đang tải lên...</span>}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
                <label className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm">
                  <Upload className="w-4 h-4" />
                  <span>Chọn Ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Nhận Thông Báo Thiết Bị:</span>
              </label>
              <div className="flex items-center gap-3">
                {pushStatus === 'granted' ? (
                  <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200 w-full shadow-sm">
                    <BellRing className="w-5 h-5" />
                    Đã bật thông báo thiết bị (Sẽ nhận được thông báo như App)
                  </div>
                ) : pushStatus === 'denied' ? (
                  <div className="flex items-center gap-2 text-rose-700 font-bold bg-rose-50 px-4 py-3 rounded-xl border border-rose-200 w-full shadow-sm">
                    <BellOff className="w-5 h-5" />
                    Bạn đã chặn thông báo (Vui lòng mở cài đặt trình duyệt hoặc biểu tượng ổ khóa để bật lại)
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubscribePush}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 rounded-xl px-4 py-3 text-sm font-black flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Bell className="w-5 h-5" />
                    Bật Thông Báo Cho Thiết Bị Này
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-stretch sm:justify-end">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleDebugPush}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition transform hover:-translate-y-0.5"
                >
                  <BellRing className="w-4 h-4" />
                  <span>Test Lỗi Push</span>
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/admin/notifications')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md transition transform hover:-translate-y-0.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Gửi Thông Báo (Admin)</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-md transition transform hover:-translate-y-0.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>

              <button
                type="button"
                onClick={handleReloadLatest}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm shadow-md transition transform hover:-translate-y-0.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tải bản mới nhất</span>
              </button>

              <button
                type="submit"
                disabled={updateProfileMutation.isPending || uploading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/20 transition transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{updateProfileMutation.isPending ? 'Đang Lưu...' : 'Lưu Thay Đổi Hồ Sơ'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
