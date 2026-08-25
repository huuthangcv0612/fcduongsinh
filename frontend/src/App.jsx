import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import api from './services/api';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import ForceCheckInModal from './components/ForceCheckInModal';
import ForceMvpVoteModal from './components/ForceMvpVoteModal';
import PushNotificationPrompt from './components/PushNotificationPrompt';
import UnpaidFundPromptModal from './components/UnpaidFundPromptModal';
import { useTranslation } from 'react-i18next';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MatchesPage from './pages/MatchesPage';
import FinancesPage from './pages/FinancesPage';
import MatchmakingPage from './pages/MatchmakingPage';
import MembersPage from './pages/MembersPage';
import ProfilePage from './pages/ProfilePage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import StatsPage from './pages/StatsPage';
import MediaPage from './pages/MediaPage';
import AdminNotificationsPage from './pages/AdminNotificationsPage';

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
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        {t('app.loading')}
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
      </main>
      <MobileNav />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
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
