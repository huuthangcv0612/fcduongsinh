import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Trophy, Flame, Star, Activity, Award } from 'lucide-react';

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState('goals'); // goals, assists, motm, appearances

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users')
  });

  const users = Array.isArray(usersRes?.data) ? usersRes.data : [];

  const getSortedUsers = () => {
    return [...users].sort((a, b) => {
      const aVal = a.stats?.[activeTab] || 0;
      const bVal = b.stats?.[activeTab] || 0;
      return bVal - aVal;
    }).filter(u => (u.stats?.[activeTab] || 0) > 0);
  };

  const sortedUsers = getSortedUsers();

  const tabs = [
    { id: 'goals', label: 'Vua phá lưới', icon: Trophy, color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200' },
    { id: 'assists', label: 'Kiến tạo', icon: Flame, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
    { id: 'motm', label: 'MOTM', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100', border: 'border-yellow-200' },
    { id: 'appearances', label: 'Ra sân', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' }
  ];

  if (isLoading) return <div className="text-center p-8 text-slate-500 font-bold animate-pulse">Đang tải bảng vàng...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-28 md:pb-0">
      <div className="glass-card p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black tracking-wider uppercase mb-3 border border-white/30 text-white">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>BẢNG PHONG THẦN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">Trung Tâm Thống Kê 🏆</h1>
          <p className="text-white/80 text-xs sm:text-sm font-bold max-w-lg">
            Nơi vinh danh những cá nhân xuất sắc nhất của FC Nhà Trẻ qua từng trận đấu.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-0 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl transition-all duration-300 border-2 font-black text-[11px] sm:text-sm shadow-sm text-center leading-tight ${
                isActive 
                  ? `${tab.bg} ${tab.color} ${tab.border} ring-2 ring-offset-2`
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-slate-400'}`} />
              <span className="min-w-0">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Leaderboard List */}
      <div className="space-y-3">
        {sortedUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500">Chưa có dữ liệu cho hạng mục này.</p>
          </div>
        ) : (
          sortedUsers.map((user, index) => {
            const val = user.stats?.[activeTab] || 0;
            const activeTabData = tabs.find(t => t.id === activeTab);
            const Icon = activeTabData.icon;

            return (
              <div 
                key={user._id} 
                className="flex items-center justify-between gap-2 sm:gap-3 bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm sm:text-lg ${
                    index === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-lg shadow-amber-500/30' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md' :
                    index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-md' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {index + 1}
                  </div>

                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base truncate max-w-full">{user.name}</h3>
                      {user.position && (
                        <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold whitespace-nowrap">
                          {user.position}
                        </span>
                      )}
                    </div>
                    {index === 0 && (
                      <div className="text-[10px] font-black text-amber-500 mt-0.5 uppercase tracking-wider">
                        Đang dẫn đầu 🔥
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center shrink-0 pl-2 border-l border-slate-100">
                  <div className={`text-xl sm:text-2xl font-black ${activeTabData.color} leading-none`}>
                    {val}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                    {activeTab === 'appearances' ? 'Trận' : 
                     activeTab === 'motm' ? 'Lần' : 
                     activeTab === 'assists' ? 'Kiến tạo' : 'Bàn'}
                  </div>
                </div>

                {/* Decor */}
                {index === 0 && (
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-400/10 rounded-full blur-xl pointer-events-none"></div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
