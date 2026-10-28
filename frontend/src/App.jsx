import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import api from './services/api';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import ForceCheckInModal from './components/ForceCheckInModal';
import ForceMvpVoteModal from './components/ForceMvpVoteModal';
import PushNotificationPrompt from './components/PushNotificationPrompt';
import UnpaidFundPromptModal from './components/UnpaidFundPromptModal';
import Loading3D from './components/Loading3D';
import { useTranslation } from 'react-i18next';

import LoginPage from './pages/LoginPage';
import PendingApprovalPage from './pages/PendingApprovalPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const FinancesPage = lazy(() => import('./pages/FinancesPage'));
const MatchmakingPage = lazy(() => import('./pages/MatchmakingPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));
const AdminNotificationsPage = lazy(() => import('./pages/AdminNotificationsPage'));

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    if (user && user.role !== 'pending' && 'serviceWorker' in navigator && 'PushManager' in window) {
      const subscribePush = async () => {
        try {
          if (Notification.permission !== 'granted') return;

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

          // Send subscription to backend
          await api.post('/notifications/subscribe', { subscription });
        } catch (error) {
          console.error('Push subscription failed:', error);
        }
      };
      
      subscribePush();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading3D variant="fullscreen" text={t('app.loading')} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'pending') {
    return <PendingApprovalPage />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <UnpaidFundPromptModal />
      <ForceCheckInModal />
      <ForceMvpVoteModal />
      <PushNotificationPrompt />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 pt-20 pb-28 md:pt-28 md:pb-12 lg:px-8 lg:pt-32 lg:pb-12">
        <Suspense fallback={<Loading3D variant="section" text={t('app.loading')} />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/finances" element={<FinancesPage />} />
            <Route path="/matchmaking" element={<MatchmakingPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <MobileNav />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/loading-preview" element={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl space-y-8">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black text-white tracking-wide">3Dviz Pro Max Loading Preview</h1>
              <p className="text-sm text-slate-400">Kiểm thử hiệu ứng 3D Loading Soccer Ball của FC Dưỡng Sinh</p>
            </div>
            
            {/* Fullscreen style preview */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
              <Loading3D variant="fullscreen" text="Đang đồng bộ dữ liệu FC Dưỡng Sinh..." subtext="Chiến thuật 7 người • Đội hình ra sân" />
            </div>

            {/* Section & Card previews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center">
                <h3 className="text-sm font-bold text-slate-400 mb-2">Section Variant (Trong Bảng Xếp Hạng)</h3>
                <Loading3D variant="section" text="Đang tải danh sách cầu thủ..." />
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center">
                <h3 className="text-sm font-bold text-slate-400 mb-2">Card Variant (Trong Modal / Thẻ trận)</h3>
                <Loading3D variant="card" text="Đang tính điểm MVP..." />
              </div>
            </div>
          </div>
        </div>
      } />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
