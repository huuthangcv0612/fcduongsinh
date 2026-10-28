import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from '../context/PWAContext';
import NotificationBell from './NotificationBell';
import teamLogo from '../asset/logo.png';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, 
  Calendar, 
  Wallet, 
  Search, 
  Users, 
  LogOut, 
  ShieldAlert, 
  UserCheck,
  Zap,
  Activity,
  Star,
  Globe,
  Award,
  Image as ImageIcon
} from 'lucide-react';

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { path: '/', label: 'Tổng quan', icon: Trophy },
    { path: '/matches', label: 'Trận đấu', icon: Calendar },
    { path: '/finances', label: 'Tài chính', icon: Wallet },
    { path: '/stats', label: 'Thống kê', icon: Award },
    { path: '/members', label: 'Thành viên', icon: Users },
    { path: '/matchmaking', label: 'Tìm kèo', icon: Search },
    { path: '/media', label: 'Media', icon: ImageIcon },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 w-full bg-[#2c3ec4] pt-[env(safe-area-inset-top,0px)] shadow-md">
        {/* Main Indigo Header */}
        <header className="bg-[#2c3ec4] text-white px-4 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <Link to="/" className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md transform hover:scale-105 transition overflow-hidden p-0.5 shrink-0">
                <img src={teamLogo} alt="FC Dưỡng Sinh" className="w-full h-full object-cover rounded-xl" />
              </Link>
              <div className="shrink-0">
                <Link to="/" className="font-black text-base sm:text-lg text-white tracking-tight leading-none whitespace-nowrap flex items-center gap-2">
                  FC DƯỠNG SINH
                </Link>
              </div>
            </div>

            {/* Desktop & Tablet Navigation Pill Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-black/15 p-1 rounded-full border border-white/10 overflow-hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full text-[11px] lg:text-xs font-black tracking-wide transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-[#2c3ec4] shadow-md'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <NotificationBell />
            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* User Profile Pill */}
            <Link
              to="/profile"
              title={t('navbar.profile_title')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-1 sm:px-2.5 sm:py-1 rounded-full border border-white/20 text-white shadow-sm transition shrink-0"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-7 h-7 rounded-full object-cover border-2 border-white/40 shadow-sm shrink-0"
              />
              <div className="text-left hidden xl:block">
                <div className="text-xs font-black text-white line-clamp-1 max-w-[100px]">{user?.name}</div>
                <div className="text-[9px] text-white/80 capitalize flex items-center gap-1 font-bold">
                  {isAdmin ? (
                    <span className="text-amber-300 flex items-center gap-0.5">
                      <ShieldAlert className="w-3 h-3" /> {t('navbar.admin')}
                    </span>
                  ) : (
                    <span className="text-emerald-300 flex items-center gap-0.5">
                      <UserCheck className="w-3 h-3" /> {t('navbar.member')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>

        {/* Category & Sub-navigation Ticker Bar */}
        <div className="hidden md:block bg-[#1f2ca3] text-white px-4 lg:px-8 py-1.5 border-t border-white/10 text-xs font-bold">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-4 shrink-0">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[11px] animate-pulse">
                <Zap className="w-3 h-3 fill-white" /> {t('navbar.live')}
              </span>
              <NavLink to="/matches" className={({isActive}) => `flex items-center gap-1 ${isActive ? 'text-white' : 'text-white/90 hover:text-white'} font-black`}>
                ⚽ {t('navbar.football')}
              </NavLink>
              <NavLink to="/stats" className={({isActive}) => `flex items-center gap-1 ${isActive ? 'text-white' : 'text-white/90 hover:text-white'} font-black`}>
                <Trophy className="w-3.5 h-3.5" /> {t('navbar.standings')}
              </NavLink>
              <Link to="/matchmaking" className="flex items-center gap-1 text-amber-300 hover:text-amber-200 font-black">
                <Star className="w-3.5 h-3.5 fill-amber-300" /> {t('navbar.find_partners')}
              </Link>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-[11px] text-white/80 font-bold shrink-0">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-300" /> {t('navbar.location')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
