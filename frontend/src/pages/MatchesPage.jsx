import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MatchCard from '../components/MatchCard';
import Pagination from '../components/Pagination';
import { Plus, X, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function MatchesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  useBodyScrollLock(showModal);

  const [formData, setFormData] = useState({
    matchType: 'friendly', // 'friendly' | 'internal'
    date: new Date().toISOString().slice(0, 10),
    time: '19:15', // Default team prime time 19h-19h30!
    stadium: '',
    stadiumLink: '',
    pitchCost: 1000000,
    deal: '5-5',
    kitColor: '',
    opponentTeamName: '',
    opponentPhone: '',
    opponentFbLink: '',
    internalTeamAName: 'Đội Xanh',
    internalTeamAKit: 'xanh dương',
    internalTeamBName: 'Đội Cam',
    internalTeamBKit: 'cam',
    notes: ''
  });

  useEffect(() => {
    if (location.state?.createMatchFromOpponent) {
      const opp = location.state.createMatchFromOpponent;
      setFormData(prev => ({
        ...prev,
        matchType: 'friendly',
        opponentTeamName: opp.teamName || '',
        opponentPhone: opp.contactPhone || '',
        opponentFbLink: opp.sourceUrl || '',
        stadium: opp.stadiumName || '',
        time: opp.matchTime || '19:15',
      }));
      setShowModal(true);
      
      // Clear state so it doesn't reopen if user refreshes the page
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const { data: matchesRes } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get('/matches'),
    staleTime: 15000
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/matches', {
      matchType: data.matchType,
      date: data.date,
      time: data.time,
      stadium: data.stadium,
      stadiumLink: data.stadiumLink,
      pitchCost: Number(data.pitchCost),
      deal: data.deal,
      kitColor: data.kitColor,
      opponent: data.matchType === 'friendly' ? {
        teamName: data.opponentTeamName,
        phone: data.opponentPhone,
        fbLink: data.opponentFbLink
      } : undefined,
      internalTeams: data.matchType === 'internal' ? {
        teamA: {
          name: data.internalTeamAName || 'Đội Xanh',
          kitColor: data.internalTeamAKit || 'xanh dương',
          players: []
        },
        teamB: {
          name: data.internalTeamBName || 'Đội Cam',
          kitColor: data.internalTeamBKit || 'cam',
          players: []
        }
      } : undefined,
      notes: data.notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success(t('matches.create_success_msg'), t('matches.create_success_title'));
      setShowModal(false);
    },
    onError: (err) => {
      toast.error(err.message || t('matches.create_fail'), t('profile.error_title'));
    }
  });

  const cloneMutation = useMutation({
    mutationFn: (id) => api.post(`/matches/${id}/clone`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success(t('matches.clone_success_msg'), t('matches.clone_success_title'));
    },
    onError: (err) => {
      toast.error(err.message || t('matches.clone_fail'), t('profile.error_title'));
    }
  });

  const checkInMutation = useMutation({
    mutationFn: ({ matchId, status, reason }) => api.put(`/matches/${matchId}/checkin`, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success(t('matches.checkin_success_msg'), t('matches.checkin_success_title'));
    },
    onError: (err) => {
      toast.error(err.message || t('matches.checkin_fail'), t('profile.error_title'));
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

  const notifyPushMutation = useMutation({
    mutationFn: (id) => api.post(`/matches/${id}/notify-push`),
    onSuccess: () => {
      toast.success(t('matches.push_success_msg'), t('matches.push_success_title'));
    },
    onError: (err) => {
      toast.error(err.message || t('matches.push_fail'), t('profile.error_title'));
    }
  });

  const handleCheckIn = useCallback((matchId, status, reason) => checkInMutation.mutate({ matchId, status, reason }), [checkInMutation]);
  const handleClone = useCallback((id) => cloneMutation.mutate(id), [cloneMutation]);
  const handleDelete = useCallback((id) => deleteMutation.mutate(id), [deleteMutation]);
  const handleNotify = useCallback((id) => notifyMutation.mutate(id), [notifyMutation]);
  const handleNotifyPush = useCallback((id) => notifyPushMutation.mutate(id), [notifyPushMutation]);

  const matches = matchesRes?.data || [];

  // Upcoming matches: live matches first, then nearest upcoming date/time first
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

  const [pastCurrentPage, setPastCurrentPage] = useState(1);
  const [pastItemsPerPage, setPastItemsPerPage] = useState(6);

  useEffect(() => {
    setPastCurrentPage(1);
  }, [activeTab]);

  // Server-side paginated query for past / history matches
  const { data: pastMatchesRes } = useQuery({
    queryKey: ['matches', 'past', pastCurrentPage, pastItemsPerPage],
    queryFn: () => api.get('/matches', { params: { status: 'past', page: pastCurrentPage, limit: pastItemsPerPage } }),
    staleTime: 15000,
    keepPreviousData: true
  });

  const pastMatches = Array.isArray(pastMatchesRes?.data) ? pastMatchesRes.data : [];
  const allPastMatchesCount = React.useMemo(() => {
    return matches.filter(m => m.status !== 'upcoming' && m.status !== 'live').length;
  }, [matches]);

  const totalPastMatches = pastPagination.total !== undefined
    ? pastPagination.total
    : (allPastMatchesCount || pastMatches.length);
  const totalPastPages = pastPagination.totalPages || Math.ceil(totalPastMatches / pastItemsPerPage) || 1;
  const validPastPage = Math.min(Math.max(1, pastCurrentPage), totalPastPages);

  const displayedMatches = activeTab === 'upcoming' ? upcomingMatches : pastMatches;

  const uniqueOpponents = React.useMemo(() => {
    if (!matches) return [];
    const opps = {};
    matches.forEach(m => {
      if (m.opponent && m.opponent.teamName && !opps[m.opponent.teamName]) {
        opps[m.opponent.teamName] = {
          teamName: m.opponent.teamName,
          phone: m.opponent.phone || '',
          fbLink: m.opponent.fbLink || '',
        };
      }
    });
    return Object.values(opps);
  }, [matches]);

  const handleSelectOldOpponent = (e) => {
    const selectedTeam = e.target.value;
    if (!selectedTeam) return;
    
    const opp = uniqueOpponents.find(o => o.teamName === selectedTeam);
    if (opp) {
      setFormData(prev => ({
        ...prev,
        opponentTeamName: opp.teamName,
        opponentPhone: opp.phone,
        opponentFbLink: opp.fbLink
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              ⚽ {t('matches.title')}
            </h2>
            <p className="text-xs font-bold text-slate-600">
              {t('matches.subtitle')}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/30 transition w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>{t('matches.create_new')}</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-300/80 self-start">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`tactile-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'upcoming'
                ? 'bg-[#2c3ec4] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>{t('matches.upcoming')}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-numbers ${activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-slate-300/80 text-slate-700'}`}>
              {upcomingMatches.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('past')}
            className={`tactile-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'past'
                ? 'bg-[#2c3ec4] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>{t('matches.past')}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-numbers ${activeTab === 'past' ? 'bg-white/20 text-white' : 'bg-slate-300/80 text-slate-700'}`}>
              {totalPastMatches}
            </span>
          </button>
        </div>
      </div>

      {/* Match Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayedMatches.map(match => (
          <MatchCard
            key={match._id}
            match={match}
            onCheckIn={handleCheckIn}
            onClone={handleClone}
            onDelete={handleDelete}
            onNotify={handleNotify}
            onNotifyPush={handleNotifyPush}
            isAdmin={isAdmin}
          />
        ))}

        {displayedMatches.length === 0 && (
          <div className="col-span-full rounded-3xl p-12 text-center text-slate-500 font-bold bg-white border border-slate-200/80 shadow-sm">
            {t('matches.no_matches')}
          </div>
        )}
      </div>

      {/* History Matches Pagination */}
      {activeTab === 'past' && totalPastMatches > 0 && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <Pagination
            currentPage={validPastPage}
            totalPages={totalPastPages}
            onPageChange={(page) => {
              setPastCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            totalItems={totalPastMatches}
            itemsPerPage={pastItemsPerPage}
            onItemsPerPageChange={setPastItemsPerPage}
            itemsPerPageOptions={[6, 9, 12, 18]}
            itemLabel="trận"
          />
        </div>
      )}

      {/* Create Match Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-lg max-h-[92dvh] glass-modal rounded-3xl relative bg-white border border-emerald-400 shadow-2xl overflow-hidden flex flex-col overscroll-contain">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-slate-100 shrink-0 pr-10">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1 flex items-center gap-1.5">
                ⚽ {t('matches.create_title')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold leading-tight">
                {t('matches.create_subtitle')}
              </p>
            </div>

            <form id="create-match-form" onSubmit={handleSubmit} className="space-y-3.5 px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {/* Match Type Selector */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">{t('matches.match_type')}</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, matchType: 'friendly' })}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center text-center ${
                      formData.matchType === 'friendly'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('matches.type_friendly')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, matchType: 'internal' })}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center text-center ${
                      formData.matchType === 'internal'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('matches.type_internal')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.match_date')}</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.match_time')}</label>
                  <input
                    type="text"
                    required
                    placeholder="19:15"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.stadium')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('matches.stadium_placeholder')}
                    value={formData.stadium}
                    onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.maps_link')}</label>
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/..."
                    value={formData.stadiumLink}
                    onChange={(e) => setFormData({ ...formData, stadiumLink: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.pitch_cost')}</label>
                  <input
                    type="number"
                    required
                    step="100000"
                    value={formData.pitchCost}
                    onChange={(e) => setFormData({ ...formData, pitchCost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.deal')}</label>
                  <input
                    type="text"
                    placeholder="5-5 / 6-4"
                    value={formData.deal}
                    onChange={(e) => setFormData({ ...formData, deal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {formData.matchType === 'friendly' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.select_old_opponent')}</label>
                      <select
                        onChange={handleSelectOldOpponent}
                        className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-sm text-blue-900 font-bold focus:outline-none focus:border-blue-500"
                      >
                        <option value="">{t('matches.select_old_opponent_placeholder')}</option>
                        {uniqueOpponents.map((opp, idx) => (
                          <option key={idx} value={opp.teamName}>{opp.teamName}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_name')}</label>
                      <input
                        type="text"
                        placeholder="FC Thăng Long"
                        value={formData.opponentTeamName}
                        onChange={(e) => setFormData({ ...formData, opponentTeamName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.kit_color')}</label>
                      <select
                        value={formData.kitColor}
                        onChange={(e) => setFormData({ ...formData, kitColor: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">{t('matches.kit_unselected')}</option>
                        <option value="xanh dương">{t('matches.kit_blue')}</option>
                        <option value="đỏ">{t('matches.kit_red')}</option>
                        <option value="đen">{t('matches.kit_black')}</option>
                        <option value="cam">{t('matches.kit_orange')}</option>
                        <option value="trắng">{t('matches.kit_white')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_phone')}</label>
                      <input
                        type="text"
                        placeholder="098..."
                        value={formData.opponentPhone}
                        onChange={(e) => setFormData({ ...formData, opponentPhone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_fb')}</label>
                      <input
                        type="text"
                        placeholder="https://facebook.com/..."
                        value={formData.opponentFbLink}
                        onChange={(e) => setFormData({ ...formData, opponentFbLink: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Internal Match: Setup 2 Teams & Kits */
                <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-900 uppercase tracking-wider">
                    <span>⚔️</span> {t('matches.internal_teams_setup')}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Team A */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs space-y-2">
                      <div className="text-[11px] font-black text-blue-600 uppercase flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                        ĐỘI A
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">{t('matches.team_a_name')}</label>
                        <input
                          type="text"
                          value={formData.internalTeamAName}
                          onChange={(e) => setFormData({ ...formData, internalTeamAName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">{t('matches.team_a_kit')}</label>
                        <select
                          value={formData.internalTeamAKit}
                          onChange={(e) => setFormData({ ...formData, internalTeamAKit: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value="xanh dương">{t('matches.kit_blue')}</option>
                          <option value="đỏ">{t('matches.kit_red')}</option>
                          <option value="đen">{t('matches.kit_black')}</option>
                          <option value="cam">{t('matches.kit_orange')}</option>
                          <option value="trắng">{t('matches.kit_white')}</option>
                          <option value="vàng">{t('matches.kit_yellow')}</option>
                          <option value="xanh lá">{t('matches.kit_green')}</option>
                        </select>
                      </div>
                    </div>

                    {/* Team B */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs space-y-2">
                      <div className="text-[11px] font-black text-orange-600 uppercase flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                        ĐỘI B
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">{t('matches.team_b_name')}</label>
                        <input
                          type="text"
                          value={formData.internalTeamBName}
                          onChange={(e) => setFormData({ ...formData, internalTeamBName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">{t('matches.team_b_kit')}</label>
                        <select
                          value={formData.internalTeamBKit}
                          onChange={(e) => setFormData({ ...formData, internalTeamBKit: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                        >
                          <option value="cam">{t('matches.kit_orange')}</option>
                          <option value="đỏ">{t('matches.kit_red')}</option>
                          <option value="xanh dương">{t('matches.kit_blue')}</option>
                          <option value="đen">{t('matches.kit_black')}</option>
                          <option value="trắng">{t('matches.kit_white')}</option>
                          <option value="vàng">{t('matches.kit_yellow')}</option>
                          <option value="xanh lá">{t('matches.kit_green')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_phone')}</label>
                  <input
                    type="text"
                    placeholder="098..."
                    value={formData.opponentPhone}
                    onChange={(e) => setFormData({ ...formData, opponentPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_fb')}</label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/..."
                    value={formData.opponentFbLink}
                    onChange={(e) => setFormData({ ...formData, opponentFbLink: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

            </form>

            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-3 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 text-sm font-bold w-full sm:w-auto transition min-h-[44px]"
              >
                {t('matches.cancel')}
              </button>
              <button
                type="submit"
                form="create-match-form"
                disabled={createMutation.isPending}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm shadow-md w-full sm:w-auto transition min-h-[44px]"
              >
                {t('matches.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
