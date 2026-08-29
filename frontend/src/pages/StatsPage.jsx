import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Trophy, Flame, Star, Activity, Award, Crown, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function StatsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('goals'); // goals, assists, motm, appearances

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
    staleTime: 60000
  });

  const users = Array.isArray(usersRes?.data) ? usersRes.data : [];

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aVal = a.stats?.[activeTab] || 0;
      const bVal = b.stats?.[activeTab] || 0;
      return bVal - aVal;
    }).filter(u => (u.stats?.[activeTab] || 0) > 0);
  }, [users, activeTab]);

  const tabs = [
    { id: 'goals', label: t('stats.goals'), icon: Trophy, color: 'text-rose-600', activeBg: 'bg-rose-50 border-rose-500 text-rose-700', badgeColor: 'bg-rose-500' },
    { id: 'assists', label: t('stats.assists'), icon: Flame, color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-500 text-amber-700', badgeColor: 'bg-amber-500' },
    { id: 'motm', label: t('stats.motm'), icon: Star, color: 'text-yellow-600', activeBg: 'bg-yellow-50 border-yellow-500 text-yellow-700', badgeColor: 'bg-yellow-500' },
    { id: 'appearances', label: t('stats.appearances'), icon: Activity, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-500 text-blue-700', badgeColor: 'bg-blue-500' }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];
  const top1 = sortedUsers[0];
  const top2 = sortedUsers[1];
  const top3 = sortedUsers[2];
  const restUsers = sortedUsers.slice(3);

  const getUnitLabel = () => {
    switch (activeTab) {
      case 'appearances': return t('stats.unit_match');
      case 'motm': return t('stats.unit_times');
      case 'assists': return t('stats.unit_assists');
      default: return t('stats.unit_goals');
    }
  };

  if (isLoading) return <div className="text-center p-8 text-slate-500 font-bold animate-pulse">{t('stats.loading')}</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-28 md:pb-0">
      {/* Header Banner */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#1e2b99] via-[#2c3ec4] to-[#121966] text-white shadow-xl border border-blue-400/20">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-black tracking-wider uppercase mb-2.5 border border-white/20 text-white">
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('stats.hall_of_fame')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-1.5 tracking-tight">{t('stats.title')}</h1>
          <p className="text-white/80 text-xs sm:text-sm font-semibold max-w-lg">
            {t('stats.subtitle')}
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      </div>

      {/* Modern Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tactile-btn min-w-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl transition-all border font-black text-xs sm:text-sm shadow-sm text-center leading-tight ${
                isActive 
                  ? `${tab.activeBg} border-2 shadow-md`
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-slate-400'}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Top 3 Podium (Display if at least 3 players have stats) */}
      {sortedUsers.length >= 3 && (
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 p-4 sm:p-6 rounded-3xl text-white shadow-xl border border-slate-800">
          <div className="text-center mb-4 sm:mb-6">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              TOP 3 CAO THỦ {activeTabData.label.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-lg mx-auto pt-4">
            
            {/* Rank 2 (Silver - Left) */}
            {top2 && (
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-gradient-to-tr from-slate-400 to-slate-200 shadow-md">
                    <img src={top2.avatar} alt={top2.name} className="w-full h-full object-cover rounded-full bg-slate-800" />
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-slate-300 text-slate-900 font-black text-[11px] flex items-center justify-center shadow">
                    2
                  </span>
                </div>
                <div className="font-black text-xs sm:text-sm text-white truncate max-w-[90px] sm:max-w-[120px]">{top2.name}</div>
                <div className="text-sm sm:text-lg font-black font-mono-numbers text-slate-300">{top2.stats?.[activeTab] || 0}</div>
                <div className="w-full h-16 sm:h-20 bg-slate-800/80 border border-slate-700/80 rounded-t-2xl mt-2 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-400">SILVER</span>
                </div>
              </div>
            )}

            {/* Rank 1 (Gold - Center - Highest) */}
            {top1 && (
              <div className="flex flex-col items-center text-center -mt-4">
                <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 mb-1 animate-bounce" />
                <div className="relative mb-2">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-lg shadow-amber-500/30 ring-4 ring-amber-400/20">
                    <img src={top1.avatar} alt={top1.name} className="w-full h-full object-cover rounded-full bg-slate-800" />
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg">
                    1
                  </span>
                </div>
                <div className="font-black text-xs sm:text-base text-amber-300 truncate max-w-[100px] sm:max-w-[140px]">{top1.name}</div>
                <div className="text-lg sm:text-2xl font-black font-mono-numbers text-amber-400">{top1.stats?.[activeTab] || 0} <span className="text-[10px] font-bold text-amber-300/80">{getUnitLabel()}</span></div>
                <div className="w-full h-22 sm:h-28 bg-gradient-to-b from-amber-500/20 to-amber-600/10 border border-amber-400/40 rounded-t-2xl mt-2 flex flex-col items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400 mb-0.5" />
                  <span className="text-xs font-black text-amber-300">GOLD</span>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze - Right) */}
            {top3 && (
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-gradient-to-tr from-amber-700 to-amber-600 shadow-md">
                    <img src={top3.avatar} alt={top3.name} className="w-full h-full object-cover rounded-full bg-slate-800" />
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[11px] flex items-center justify-center shadow">
                    3
                  </span>
                </div>
                <div className="font-black text-xs sm:text-sm text-white truncate max-w-[90px] sm:max-w-[120px]">{top3.name}</div>
                <div className="text-sm sm:text-lg font-black font-mono-numbers text-amber-600">{top3.stats?.[activeTab] || 0}</div>
                <div className="w-full h-12 sm:h-14 bg-slate-800/80 border border-slate-700/80 rounded-t-2xl mt-2 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-600">BRONZE</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Full / Rest List */}
      <div className="space-y-2.5">
        {sortedUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500">{t('stats.no_data')}</p>
          </div>
        ) : (
          (sortedUsers.length >= 3 ? restUsers : sortedUsers).map((user, index) => {
            const val = user.stats?.[activeTab] || 0;
            const actualRank = sortedUsers.length >= 3 ? index + 4 : index + 1;

            return (
              <div 
                key={user._id} 
                className="tactile-btn flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Rank Number Badge */}
                  <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black font-mono-numbers text-xs sm:text-sm">
                    {actualRank}
                  </div>

                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                  />

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-black text-slate-900 text-xs sm:text-sm truncate max-w-full">{user.name}</h3>
                      {user.position && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold whitespace-nowrap">
                          {user.position}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center shrink-0">
                  <div className={`text-lg sm:text-xl font-black font-mono-numbers ${activeTabData.color} flex items-center gap-1`}>
                    {val}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {getUnitLabel()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
