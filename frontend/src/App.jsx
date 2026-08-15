import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import ForceCheckInModal from './components/ForceCheckInModal';

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

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Đang tải dữ liệu FC Nhà Trẻ...
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
      <ForceCheckInModal />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 pt-32 pb-36 sm:px-4 sm:pt-28 sm:pb-8 lg:px-8 lg:pt-32 lg:pb-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/finances" element={<FinancesPage />} />
          <Route path="/matchmaking" element={<MatchmakingPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
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
