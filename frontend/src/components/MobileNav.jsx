import React from 'react';
import { NavLink } from 'react-router-dom';
import { Trophy, Calendar, Wallet, Search, Users, Award, Image as ImageIcon, Download, Smartphone } from 'lucide-react';
import { usePWA } from '../context/PWAContext';

export default function MobileNav() {
  const pwa = usePWA();

  const navItems = [
    { path: '/', label: 'Tổng quan', icon: Trophy },
    { path: '/matches', label: 'Trận đấu', icon: Calendar },
    { path: '/media', label: 'Media', icon: ImageIcon },
    { path: '/stats', label: 'Thống kê', icon: Award },
    { path: '/finances', label: 'Tài chính', icon: Wallet },
    { path: '/matchmaking', label: 'Tìm đối', icon: Search },
    { path: '/members', label: 'Thành viên', icon: Users },
  ];

  const handlePWAInstall = async () => {
    if (!pwa) return;
    if (pwa.isIOS || pwa.isChromeiOS) {
      pwa.setShowIOSGuide(true);
    } else if (pwa.deferredPrompt) {
      pwa.handleInstall();
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-2 py-2 shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-[#2c3ec4] scale-105'
                    : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[9px] font-black tracking-wide whitespace-nowrap">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* PWA Install button in mobile nav (only when installable) */}
        {pwa?.canInstall && (
          <button
            onClick={handlePWAInstall}
            className="flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-xl transition-all duration-200 text-emerald-600 hover:text-emerald-700"
            title="Cài ứng dụng"
          >
            {pwa.isIOS || pwa.isChromeiOS
              ? <Smartphone className="w-5 h-5" strokeWidth={2} />
              : <Download className="w-5 h-5" strokeWidth={2} />
            }
            <span className="text-[9px] font-black tracking-wide whitespace-nowrap">Cài app</span>
          </button>
        )}
      </div>
    </div>
  );
}
