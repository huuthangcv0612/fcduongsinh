import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from '../context/PWAContext';
import NotificationBell from './NotificationBell';
import teamLogo from '../asset/logo.png';
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

  const navItems = [
    { path: '/', label: 'TỔNG QUAN', icon: Trophy },
    { path: '/matches', label: 'TRẬN ĐẤU', icon: Calendar },
    { path: '/media', label: 'MEDIA', icon: ImageIcon },
    { path: '/stats', label: 'THỐNG KÊ', icon: Award },
    { path: '/finances', label: 'TÀI CHÍNH', icon: Wallet },
    { path: '/matchmaking', label: 'TÌM ĐỐI', icon: Search },
    { path: '/members', label: 'THÀNH VIÊN', icon: Users },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 w-full bg-[#2c3ec4] pt-[env(safe-area-inset-top,0px)] shadow-md">
        {/* Main Indigo Header */}
        <header className="bg-[#2c3ec4] text-white px-4 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <Link to="/" className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md transform hover:scale-105 transition overflow-hidden p-0.5">
                <img src={teamLogo} alt="FC Nhà Trẻ" className="w-full h-full object-cover rounded-xl" />
              </Link>
              <div>
                <Link to="/" className="font-black text-lg text-white tracking-tight leading-none flex items-center gap-2">
                  FC NHÀ TRẺ
                </Link>
              </div>
            </div>

            {/* Desktop Navigation Pill Tabs */}
            <nav className="hidden md:flex items-center gap-1.5 bg-black/15 p-1 rounded-full border border-white/10">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-black tracking-wider transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-[#2c3ec4] shadow-md'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* User Profile Pill */}
            <Link
              to="/profile"
              title="Xem & Chỉnh sửa trang cá nhân"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full border border-white/20 text-white shadow-sm transition"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-7 h-7 rounded-full object-cover border-2 border-white/40 shadow-sm"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-black text-white line-clamp-1">{user?.name}</div>
                <div className="text-[9px] text-white/80 capitalize flex items-center gap-1 font-bold">
                  {isAdmin ? (
                    <span className="text-amber-300 flex items-center gap-0.5">
                      <ShieldAlert className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="text-emerald-300 flex items-center gap-0.5">
                      <UserCheck className="w-3 h-3" /> Member
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
                <Zap className="w-3 h-3 fill-white" /> LIVE
              </span>
              <NavLink to="/matches" className={({isActive}) => `flex items-center gap-1 ${isActive ? 'text-white' : 'text-white/90 hover:text-white'} font-black`}>
                ⚽ Bóng đá
              </NavLink>
              <NavLink to="/stats" className={({isActive}) => `flex items-center gap-1 ${isActive ? 'text-white' : 'text-white/90 hover:text-white'} font-black`}>
                <Trophy className="w-3.5 h-3.5" /> BXH
              </NavLink>
              <Link to="/matchmaking" className="flex items-center gap-1 text-amber-300 hover:text-amber-200 font-black">
                <Star className="w-3.5 h-3.5 fill-amber-300" /> Tìm đối tác
              </Link>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-[11px] text-white/80 font-bold shrink-0">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-300" /> Hà Nội (VN)
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
