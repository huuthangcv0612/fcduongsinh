import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/MatchCard';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, ArrowRight, Activity, Zap, Clock, CheckCircle2, Award, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import coverImage from '../asset/IMG_0922.JPG';
import { useTranslation } from 'react-i18next';

// ⏱️ STADIUM COUNTDOWN COMPONENT
function MatchCountdown({ targetDate, targetTime }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    if (!targetDate) return;
    const calculateTime = () => {
      try {
        const matchDateTime = new Date(`${targetDate}T${targetTime || '19:15'}:00`);
        const now = new Date();
        const diff = matchDateTime - now;

        if (diff <= 0) {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / 1000 / 60) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          setTimeLeft({ days, hours, minutes, seconds, isPast: false });
        }
      } catch {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetDate, targetTime]);

  if (!targetDate) return null;

  if (timeLeft.isPast) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-black border border-rose-500/40 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
        <span>⚽ SẮP BÓNG LĂN / LIVE</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-black/40 border border-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-mono-numbers text-[11px] shadow-inner">
      <Clock className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-white/80 font-bold">Trận tới sau:</span>
      <span className="font-black text-amber-300">
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {String(timeLeft.hours).padStart(2, '0')}h:{String(timeLeft.minutes).padStart(2, '0')}m:{String(timeLeft.seconds).padStart(2, '0')}s
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [carouselReady, setCarouselReady] = useState(false);

  // Balance query
  const { data: balanceRes } = useQuery({
    queryKey: ['financeBalance'],
    queryFn: () => api.get('/finances/balance'),
    staleTime: 60000
  });

  // Upcoming matches query
  const { data: matchesRes } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get('/matches'),
    staleTime: 15000
  });

  // Recent finances query
  const { data: financesRes } = useQuery({
    queryKey: ['finances'],
    queryFn: () => api.get('/finances'),
    staleTime: 60000
  });

  // Members query
  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
    staleTime: 60000
  });

  // Media query for dashboard carousel
  const { data: mediaRes } = useQuery({
    queryKey: ['media'],
    queryFn: () => api.get('/media'),
    staleTime: 60000
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
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/matches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    }
  });

  const notifyMutation = useMutation({
    mutationFn: (id) => api.post(`/matches/${id}/notify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
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
      title: item.title || 'FC Dưỡng Sinh'
    }));

  useEffect(() => {
    let isMounted = true;
    if (carouselImages.length === 0) {
      setCarouselReady(true);
      return undefined;
    }

    const preloadImages = carouselImages.slice(0, 3).map((item) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = item.url;
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
    });

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
  const activeHeroTitle = carouselImages[heroImageIndex]?.title || 'FC Dưỡng Sinh';

  const upcomingMatches = React.useMemo(() => {
    return matches
      .filter(m => m.status === 'upcoming' || m.status === 'live')
      .sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (b.status === 'live' && a.status !== 'live') return 1;
        const dateComp = (a.date || '').localeCompare(b.date || '');
        if (dateComp !== 0) return dateComp;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [matches]);

  const recentFinances = finances.slice(0, 5);

  const nextUpcomingMatch = upcomingMatches[0];
  const isUserPending = nextUpcomingMatch && (nextUpcomingMatch.userCheckInStatus === 'pending');

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      {/* Stadium Welcome Hero Banner */}
      <div className="glass-card p-5 sm:p-7 lg:p-8 rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#1e2b99] via-[#2c3ec4] to-[#121966] text-white shadow-2xl border border-blue-400/30">
        {/* Faint Stadium Atmosphere */}
        <img src={coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-overlay pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] items-center">
          <div className="space-y-4 text-center lg:text-left max-w-2xl">
            
            {/* Top Eyebrow & Countdown */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-black tracking-wider uppercase border border-white/25 text-white">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>FC DƯỠNG SINH MATCH CENTER</span>
              </div>

              {nextUpcomingMatch && (
                <MatchCountdown targetDate={nextUpcomingMatch.date} targetTime={nextUpcomingMatch.time} />
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
                {t('dashboard.hello')}, {user?.name || t('dashboard.player')}! ⚽
              </h1>
              <p className="text-white/85 text-xs sm:text-sm font-semibold leading-relaxed max-w-xl mx-auto lg:mx-0">
                {t('dashboard.welcome_msg')}
              </p>
            </div>

            {/* Quick 1-Tap Attendance Widget for Mobile/Desktop */}
            {nextUpcomingMatch && isUserPending && (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {t('dashboard.quick_checkin_title')} ({nextUpcomingMatch.date})
                  </span>
                  <span className="text-white/70 text-[11px] font-bold">{nextUpcomingMatch.time} @ {nextUpcomingMatch.stadium}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => checkInMutation.mutate({ matchId: nextUpcomingMatch._id, status: 'joined', reason: '' })}
                    className="tactile-btn py-2 px-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md text-center flex items-center justify-center gap-1 min-h-[38px] active:scale-95"
                  >
                    ✓ {t('matchcard.play')}
                  </button>
                  <button
                    onClick={() => checkInMutation.mutate({ matchId: nextUpcomingMatch._id, status: 'uncertain', reason: t('dashboard.reason_uncertain_default') })}
                    className="tactile-btn py-2 px-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md text-center flex items-center justify-center gap-1 min-h-[38px] active:scale-95"
                  >
                    ? {t('matchcard.uncertain_btn')}
                  </button>
                  <button
                    onClick={() => checkInMutation.mutate({ matchId: nextUpcomingMatch._id, status: 'absent', reason: t('dashboard.reason_absent_default') })}
                    className="tactile-btn py-2 px-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md text-center flex items-center justify-center gap-1 min-h-[38px] active:scale-95"
                  >
                    ✕ {t('matchcard.absent_btn')}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5 pt-1">
              <Link
                to="/matches"
                className="tactile-btn w-full sm:w-auto px-5 py-2.5 rounded-full bg-white text-[#2c3ec4] hover:bg-slate-100 font-black text-xs shadow-lg transition text-center"
              >
                {t('dashboard.schedule_attendance')}
              </Link>

              <Link
                to="/finances"
                className="tactile-btn w-full sm:w-auto px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/30 font-black text-xs backdrop-blur-md transition text-center"
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

      {/* Stats Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Balance Stat */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-slate-200/80 bg-white flex items-center justify-between shadow-xs hover:shadow-md transition-shadow overflow-hidden gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5 truncate">{t('dashboard.current_fund')}</span>
            <span className={`text-base sm:text-2xl font-black font-mono-numbers block truncate ${balanceData.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {balanceData.balance?.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Month In */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-slate-200/80 bg-white flex items-center justify-between shadow-xs hover:shadow-md transition-shadow overflow-hidden gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5 truncate">
              {t('dashboard.month_in', { month: balanceData.currentMonth || (new Date().getMonth() + 1) })}
            </span>
            <span className="text-base sm:text-2xl font-black font-mono-numbers text-emerald-600 block truncate">
              +{(balanceData.monthIn ?? balanceData.totalIn)?.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Month Out */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-slate-200/80 bg-white flex items-center justify-between shadow-xs hover:shadow-md transition-shadow overflow-hidden gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5 truncate">
              {t('dashboard.month_out', { month: balanceData.currentMonth || (new Date().getMonth() + 1) })}
            </span>
            <span className="text-base sm:text-2xl font-black font-mono-numbers text-rose-600 block truncate">
              -{(balanceData.monthOut ?? balanceData.totalOut)?.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Team Members Count */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-slate-200/80 bg-white flex items-center justify-between shadow-xs hover:shadow-md transition-shadow overflow-hidden gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5 truncate">{t('dashboard.team_members')}</span>
            <span className="text-base sm:text-2xl font-black font-mono-numbers text-slate-900 block truncate">
              {users.length} <span className="text-[11px] sm:text-xs font-bold text-slate-500">{t('dashboard.players_count')}</span>
            </span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
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
