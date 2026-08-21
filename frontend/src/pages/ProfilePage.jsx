import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { User, Phone, Save, CheckCircle2, Sparkles, Upload, RefreshCw, LogOut, Bell, BellRing, BellOff, Globe } from 'lucide-react';

export default function ProfilePage() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pushStatus, setPushStatus] = useState(Notification.permission);

  const handleSubscribePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error(t('profile.not_supported'), t('profile.unsupported_title'));
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission !== 'granted') {
        toast.warning(t('profile.permission_denied'), t('profile.no_permission_title'));
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
      toast.success(t('profile.push_success'), t('profile.success_title'));
    } catch (error) {
      console.error('Push subscription failed:', error);
      toast.error(t('profile.push_fail') + error.message, t('profile.error_title'));
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
      toast.success(t('profile.update_success'), t('profile.success_title'));
      setTimeout(() => setSavedSuccess(false), 3000);
    },
    onError: (err) => {
      toast.error(err.message || t('profile.update_fail'), t('profile.error_title'));
    }
  });

  // Tự động resize ảnh xuống dưới 2MB trước khi upload
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB target
      const MAX_DIMENSION = 1200; // Max width/height px

      // Nếu ảnh đã nhỏ hơn 2MB thì không cần compress
      if (file.size <= MAX_SIZE_BYTES) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;

        // Scale down nếu kích thước quá lớn
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
        ctx.drawImage(img, 0, 0, width, height);

        // Thử compress với quality giảm dần cho đến khi đạt mục tiêu
        let quality = 0.85;
        let base64 = canvas.toDataURL('image/jpeg', quality);
        while (base64.length > MAX_SIZE_BYTES * 1.37 && quality > 0.3) {
          quality -= 0.1;
          base64 = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(base64);
      };
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.warning(t('profile.image_too_large'), t('profile.image_too_large_title'));
      return;
    }

    setUploading(true);
    try {
      toast.info(t('profile.processing_image'), t('profile.wait_title'));
      const base64Str = await compressImage(file);
      const res = await api.post('/upload/avatar', { image: base64Str });
      if (res.success && res.data?.url) {
        setFormData(prev => ({ ...prev, avatar: res.data.url }));
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success(t('profile.upload_success'), t('profile.upload_complete_title'));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || t('profile.upload_fail'), t('profile.upload_fail_title'));
    } finally {
      setUploading(false);
    }
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

      toast.info(t('profile.reload_app'), t('profile.reload_app_title'));
      window.location.replace('/');
    } catch (error) {
      console.error(error);
      toast.error(t('profile.reload_fail'), t('profile.reload_fail_title'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20 md:pb-0">
      {/* High-Contrast Hero Banner */}
      <div className="rounded-3xl p-6 sm:p-8 border border-blue-400/30 relative overflow-hidden bg-gradient-to-br from-[#1e2b99] via-[#2c3ec4] to-[#121966] text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-400/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="relative group">
            <img
              src={formData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={formData.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white/80 shadow-2xl shadow-blue-950/40"
            />
            
            {/* Instant Cloudinary Upload Button */}
            <label className="absolute inset-0 bg-slate-900/75 rounded-3xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer backdrop-blur-xs">
              {uploading ? (
                <RefreshCw className="w-6 h-6 animate-spin text-amber-300" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mb-1 text-white" />
                  <span className="text-[10px] font-black uppercase tracking-wide">{t('profile.change_photo')}</span>
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> {t('profile.personal_info')}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2 drop-shadow-md">
              {user?.name}
              {isAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-xs uppercase font-mono shadow-sm">
                  {t('profile.admin')}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-black text-xs uppercase font-mono shadow-sm">
                  {t('profile.member')}
                </span>
              )}
            </h2>

            <p className="text-xs sm:text-sm text-white/80 font-bold font-mono">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-sm font-black flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{t('profile.update_success')}</span>
        </div>
      )}

      {/* Main Profile Form Card */}
      <div className="rounded-3xl p-6 sm:p-8 border border-slate-200/80 bg-white shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-[#2c3ec4]" />
          <span>{t('profile.edit_profile')}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                {t('profile.full_name')}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                {t('profile.phone')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="0901234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 pl-10"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                {t('profile.position')}
              </label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Thủ môn" className="bg-white text-slate-900">{t('profile.pos_gk')}</option>
                <option value="Hậu vệ" className="bg-white text-slate-900">{t('profile.pos_df')}</option>
                <option value="Tiền vệ" className="bg-white text-slate-900">{t('profile.pos_mf')}</option>
                <option value="Tiền đạo" className="bg-white text-slate-900">{t('profile.pos_fw')}</option>
                <option value="Tự do" className="bg-white text-slate-900">{t('profile.pos_free')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>{t('profile.avatar')}</span>
                {uploading && <span className="text-blue-600 font-bold animate-pulse">{t('profile.uploading')}</span>}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <label className="tactile-btn px-4 py-3 rounded-xl bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm">
                  <Upload className="w-4 h-4" />
                  <span>{t('profile.choose_image')}</span>
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
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>{t('profile.receive_notification')}</span>
              </label>
              <div className="flex items-center gap-3">
                {pushStatus === 'granted' ? (
                  <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200 w-full shadow-xs">
                    <BellRing className="w-5 h-5 text-emerald-600" />
                    {t('profile.notification_on')}
                  </div>
                ) : pushStatus === 'denied' ? (
                  <div className="flex items-center gap-2 text-rose-700 font-bold bg-rose-50 px-4 py-3 rounded-xl border border-rose-200 w-full shadow-xs">
                    <BellOff className="w-5 h-5 text-rose-600" />
                    {t('profile.notification_off')}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubscribePush}
                    className="tactile-btn w-full bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 rounded-xl px-4 py-3 text-sm font-black flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Bell className="w-5 h-5" />
                    {t('profile.turn_on_notification')}
                  </button>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 mt-2 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#2c3ec4]" />
                {t('profile.language_settings')}
              </h4>
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">{t('profile.language')}</span>
                <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-xs gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      i18n.changeLanguage('vi');
                      localStorage.setItem('appLanguage', 'vi');
                    }}
                    className={`tactile-btn px-3.5 py-1.5 rounded-lg text-xs font-black transition ${i18n.language === 'vi' ? 'bg-[#2c3ec4] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    🇻🇳 Tiếng Việt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      i18n.changeLanguage('en');
                      localStorage.setItem('appLanguage', 'en');
                    }}
                    className={`tactile-btn px-3.5 py-1.5 rounded-lg text-xs font-black transition ${i18n.language === 'en' ? 'bg-[#2c3ec4] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-stretch sm:justify-end">
            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/admin/notifications')}
                  className="tactile-btn w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('profile.admin_notification')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="tactile-btn w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('profile.logout')}</span>
              </button>

              <button
                type="button"
                onClick={handleReloadLatest}
                className="tactile-btn w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('profile.load_latest')}</span>
              </button>

              <button
                type="submit"
                disabled={updateProfileMutation.isPending || uploading}
                className="tactile-btn w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white font-black text-xs shadow-md shadow-blue-600/20 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{updateProfileMutation.isPending ? t('profile.saving') : t('profile.save_changes')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
