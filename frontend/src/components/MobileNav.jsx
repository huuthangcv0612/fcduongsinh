import React from 'react';
import { NavLink } from 'react-router-dom';
import { Trophy, Calendar, Wallet, Search, Users, Award, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MobileNav() {
  const { t } = useTranslation();
  const navItems = [
    { path: '/', label: 'Home', icon: Trophy },
    { path: '/matches', label: 'Trận', icon: Calendar },
    { path: '/finances', label: 'Quỹ', icon: Wallet },
    { path: '/stats', label: 'BXH', icon: Award },
    { path: '/members', label: 'Đội', icon: Users },
    { path: '/matchmaking', label: 'Kèo', icon: Search },
    { path: '/media', label: 'Ảnh', icon: ImageIcon },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),8px)] shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-7 items-center gap-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `tactile-btn flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 px-1 transition-all duration-200 min-h-[46px] ${
                  isActive
                    ? 'text-[#2c3ec4] bg-blue-50/90 font-black shadow-2xs border border-blue-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] leading-none tracking-tight text-center font-bold truncate max-w-full">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
