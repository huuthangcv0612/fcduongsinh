import React, { useState, useEffect } from 'react';
import { BellRing, X } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const toast = useToast();

  useBodyScrollLock(show);

  useEffect(() => {
    // Only show if the browser supports notifications and we haven't asked yet
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    
    // If already granted or denied, don't show
    if (Notification.permission !== 'default') return;

    // Check if the user previously dismissed this prompt on this specific device
    const dismissed = localStorage.getItem('hidePushPrompt');
    if (!dismissed) {
      // Small delay to make it feel natural after app loads
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('hidePushPrompt', 'true');
  };

  const handleSubscribe = async () => {
    try {
      // This is the USER GESTURE! It is safe to call requestPermission here.
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
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
        toast.success('Đã bật thông báo thành công!', 'Tuyệt vời');
      } else {
        toast.warning('Bạn đã từ chối nhận thông báo.', 'Chưa cấp quyền');
      }
    } catch (error) {
      console.error('Lỗi khi đăng ký thông báo:', error);
      toast.error('Bật thông báo thất bại', 'Lỗi');
    } finally {
      setShow(false);
      // Even if granted or denied, don't show this custom prompt again
      localStorage.setItem('hidePushPrompt', 'true');
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overscroll-contain">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto overscroll-contain">
        
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 flex flex-col items-center justify-center text-center relative">
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
            <BellRing className="w-8 h-8 text-emerald-500 animate-bounce" />
          </div>
          <h3 className="text-xl font-black text-white">Bật Thông Báo?</h3>
          <p className="text-emerald-50 text-sm font-medium mt-1">
            Nhận thông báo khi có lịch đá bóng và đóng quỹ mới nhất!
          </p>
        </div>

        <div className="p-6 space-y-3 bg-slate-50">
          <button
            onClick={handleSubscribe}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-500/30 transition transform hover:-translate-y-0.5"
          >
            Cho Phép Thông Báo
          </button>
          <button
            onClick={handleDismiss}
            className="w-full py-3.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm transition"
          >
            Để Lúc Khác
          </button>
        </div>

      </div>
    </div>
  );
}
