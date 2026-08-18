import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/MatchCard';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, ArrowRight, Activity, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import coverImage from '../asset/IMG_0922.JPG';
import { useTranslation } from 'react-i18next';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [carouselReady, setCarouselReady] = useState(false);

  // Balance query
  const { data: balanceRes } = useQuery({
    queryKey: ['financeBalance'],
    queryFn: () => api.get('/finances/balance')
  });

  // Upcoming matches query
  const { data: matchesRes } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get('/matches')
  });

  // Recent finances query
  const { data: financesRes } = useQuery({
    queryKey: ['finances'],
    queryFn: () => api.get('/finances')
  });

  // Members query
  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users')
  });

  // Media query for dashboard carousel
  const { data: mediaRes } = useQuery({
    queryKey: ['media'],
    queryFn: () => api.get('/media')
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: ({ matchId, status, reason }) => api.put(`/matches/${matchId}/checkin`, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['forceCheckInMatch'] });
    }
  });

  const cloneMutation = useMutation({
    mutationFn: (id) => api.post(`/matches/${id}/clone`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success(t('dashboard.clone_success'), t('profile.success_title'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/matches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success(t('dashboard.delete_success'), t('profile.success_title'));
    },
    onError: (err) => {
      toast.error(err.message || t('dashboard.delete_fail'), t('profile.error_title'));
    }
  });

  const notifyMutation = useMutation({
    mutationFn: (id) => api.post(`/matches/${id}/notify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success(t('dashboard.notify_success'), t('profile.success_title'));
    },
    onError: (err) => {
      toast.error(err.message || t('dashboard.notify_fail'), t('profile.error_title'));
    }
  });

  const balanceData = balanceRes?.data || { balance: 0, totalIn: 0, totalOut: 0 };
  const matches = matchesRes?.data || [];
  const finances = financesRes?.data || [];
  const users = usersRes?.data || [];
  const mediaItems = Array.isArray(mediaRes?.data) ? mediaRes.data : [];
  const carouselImages = mediaItems
    .filter(item => item?.type === 'image' && typeof item.url === 'string')
    .map(item => ({
      url: item.url,
      title: item.title || 'FC Nhà Trẻ'
    }));

  useEffect(() => {
    let isMounted = true;

    const imageSources = carouselImages.map(item => item.url);

    if (!imageSources.length) {
      setHeroImageIndex(0);
      setCarouselReady(false);
      return undefined;
    }

    setCarouselReady(false);
    setHeroImageIndex(0);

    const preloadImages = imageSources.map((src) => new Promise((resolve) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      image.src = src;
    }));

    Promise.all(preloadImages).then(() => {
      if (isMounted) {
        setCarouselReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [carouselImages.length]);

  useEffect(() => {
    if (!carouselReady || carouselImages.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [carouselReady, carouselImages.length]);

  const activeHeroImage = carouselImages[heroImageIndex]?.url || coverImage;
  const activeHeroTitle = carouselImages[heroImageIndex]?.title || 'FC Nhà Trẻ';

  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const recentFinances = finances.slice(0, 5);

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      {/* Welcome Banner */}
      <div className="glass-card p-5 sm:p-8 rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#2c3ec4] via-[#374df5] to-[#1f2ca3] text-white shadow-xl">
        {/* Faint Background Image */}
        <img src={coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none" />
        
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] items-center">
          <div className="space-y-4 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black tracking-wider uppercase border border-white/30 text-white mx-auto lg:mx-0">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>FC NHÀ TRẺ MATCH CENTER</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
                {t('dashboard.hello')}, {user?.name || t('dashboard.player')}! ⚽
              </h1>
              <p className="text-white/85 text-sm sm:text-base font-bold leading-relaxed max-w-xl mx-auto lg:mx-0">
                {t('dashboard.welcome_msg')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
              <Link
                to="/matches"
                className="w-full sm:w-auto px-5 py-3 rounded-full bg-white text-[#2c3ec4] hover:bg-slate-100 font-black text-xs shadow-lg transition transform hover:-translate-y-0.5 text-center"
              >
                {t('dashboard.schedule_attendance')}
              </Link>

              <Link
                to="/finances"
                className="w-full sm:w-auto px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/30 font-black text-xs backdrop-blur-md transition text-center"
              >
                {t('dashboard.fund_table')}
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex justify-end">
            <div className="relative w-full max-w-sm aspect-[4/3] rounded-[28px] overflow-hidden border border-white/20 bg-white/10 shadow-2xl backdrop-blur-sm">
              <img
                src={activeHeroImage}
                alt={activeHeroTitle}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${carouselReady ? 'opacity-60' : 'opacity-55'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#1f2ca3]/30 via-transparent to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                <div className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white text-[11px] font-black border border-white/20 backdrop-blur-md">
                  <Activity className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{t('dashboard.match_center')}</span>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/15 text-white text-[11px] font-black border border-white/20 backdrop-blur-md">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{t('dashboard.schedule_fund_stats')}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/15 text-white text-[11px] font-black border border-white/20 backdrop-blur-md ml-8">
                    <Users className="w-3.5 h-3.5" />
                    <span>{t('dashboard.attendance_squad')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  {carouselImages.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 backdrop-blur-md">
                      {carouselImages.map((_, index) => (
                        <span
                          key={index}
                          className={`block h-1.5 rounded-full transition-all duration-300 ${
                            index === heroImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/45'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Balance Stat */}
        <div className="glass-card-white p-4 sm:p-5 rounded-3xl border border-slate-200 bg-white flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">{t('dashboard.current_fund')}</span>
            <span className={`text-xl font-black ${balanceData.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {balanceData.balance?.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total In */}
        <div className="glass-card-white p-4 sm:p-5 rounded-3xl border border-slate-200 bg-white flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">{t('dashboard.total_in')}</span>
            <span className="text-xl font-black text-emerald-700">
              +{balanceData.totalIn?.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Out */}
        <div className="glass-card-white p-4 sm:p-5 rounded-3xl border border-slate-200 bg-white flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">{t('dashboard.total_out')}</span>
            <span className="text-xl font-black text-rose-700">
              -{balanceData.totalOut?.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Team Members Count */}
        <div className="glass-card-white p-4 sm:p-5 rounded-3xl border border-slate-200 bg-white flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">{t('dashboard.team_members')}</span>
            <span className="text-xl font-black text-slate-900">
              {users.length} {t('dashboard.players_count')}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Upcoming Match & Recent Finances Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Upcoming Match Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#374df5]" />
              <span>{t('dashboard.upcoming_matches')}</span>
            </h3>
            <Link to="/matches" className="text-xs font-black text-[#374df5] hover:underline flex items-center gap-1">
              <span>{t('dashboard.view_all')} ({matches.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMatches.slice(0, 2).map(match => (
                <MatchCard
                  key={match._id}
                  match={match}
                  onCheckIn={(matchId, status, reason) => checkInMutation.mutate({ matchId, status, reason })}
                  onClone={(id) => cloneMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onNotify={(id) => notifyMutation.mutate(id)}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card-white p-8 rounded-3xl text-center text-slate-600 font-bold bg-white border border-slate-200">
              {t('dashboard.no_upcoming_matches')}
            </div>
          )}
        </div>

        {/* Right 1 Col: Recent Finance Ticker */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-700" />
              <span>{t('dashboard.recent_transactions')}</span>
            </h3>
            <Link to="/finances" className="text-xs font-black text-[#374df5] hover:underline flex items-center gap-1">
              <span>{t('dashboard.details')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card-white p-4 rounded-3xl border border-slate-200 bg-white space-y-3 shadow-md">
            {recentFinances.map(f => (
              <div key={f._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition">
                <div className="truncate pr-2">
                  <div className="text-xs font-black text-slate-900 truncate">{f.description}</div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {new Date(f.createdAt).toLocaleDateString('vi-VN')} • {f.createdBy?.name || 'Admin'}
                  </div>
                </div>
                <div className={`text-xs font-black shrink-0 ${f.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {f.type === 'IN' ? '+' : '-'}{f.amount?.toLocaleString('vi-VN')} đ
                </div>
              </div>
            ))}

            {recentFinances.length === 0 && (
              <div className="text-center text-xs font-bold text-slate-600 py-6">
                {t('dashboard.no_recent_transactions')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
