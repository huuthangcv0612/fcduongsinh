import React from 'react';
import { NavLink } from 'react-router-dom';
import { Trophy, Calendar, Wallet, Search, Users, Award, Image as ImageIcon } from 'lucide-react';

import { useTranslation } from 'react-i18next';

export default function MobileNav() {
  const { t } = useTranslation();
  const navItems = [
    { path: '/', label: t('navbar.overview'), icon: Trophy },
    { path: '/matches', label: t('navbar.matches'), icon: Calendar },
    { path: '/media', label: t('navbar.media'), icon: ImageIcon },
    { path: '/stats', label: t('navbar.stats'), icon: Award },
    { path: '/finances', label: t('navbar.finances'), icon: Wallet },
    { path: '/matchmaking', label: t('navbar.matchmaking'), icon: Search },
    { path: '/members', label: t('navbar.members'), icon: Users },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-2xl border-t border-slate-200/80 px-1.5 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),8px)] shadow-[0_-4px_24px_rgba(15,23,42,0.08)]">
      <div className="grid grid-cols-7 items-stretch gap-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `tactile-btn flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 px-0.5 transition-all duration-200 min-h-[44px] ${
                  isActive
                    ? 'text-[#2c3ec4] bg-blue-50/90 shadow-sm border border-blue-200/50 font-black scale-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[8.5px] leading-tight tracking-tight text-center truncate max-w-full">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
