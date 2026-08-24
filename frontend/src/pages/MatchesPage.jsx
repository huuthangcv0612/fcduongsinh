import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MatchCard from '../components/MatchCard';
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
    notes: ''
  });

  useEffect(() => {
    if (location.state?.createMatchFromOpponent) {
      const opp = location.state.createMatchFromOpponent;
      setFormData(prev => ({
        ...prev,
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
    queryFn: () => api.get('/matches')
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/matches', {
      date: data.date,
      time: data.time,
      stadium: data.stadium,
      stadiumLink: data.stadiumLink,
      pitchCost: Number(data.pitchCost),
      deal: data.deal,
      kitColor: data.kitColor,
      opponent: {
        teamName: data.opponentTeamName,
        phone: data.opponentPhone,
        fbLink: data.opponentFbLink
      },
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

  const matches = matchesRes?.data || [];
  const filteredMatches = matches.filter(m => activeTab === 'upcoming' ? m.status === 'upcoming' : m.status !== 'upcoming');

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
              {matches.filter(m => m.status === 'upcoming').length}
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
              {matches.filter(m => m.status !== 'upcoming').length}
            </span>
          </button>
        </div>
      </div>

      {/* Match Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMatches.map(match => (
          <MatchCard
            key={match._id}
            match={match}
            onCheckIn={(matchId, status, reason) => checkInMutation.mutate({ matchId, status, reason })}
            onClone={(id) => cloneMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onNotify={(id) => notifyMutation.mutate(id)}
            onNotifyPush={(id) => notifyPushMutation.mutate(id)}
            isAdmin={isAdmin}
          />
        ))}

        {filteredMatches.length === 0 && (
          <div className="col-span-full rounded-3xl p-12 text-center text-slate-500 font-bold bg-white border border-slate-200/80 shadow-sm">
            {t('matches.no_matches')}
          </div>
        )}
      </div>

      {/* Create Match Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overscroll-contain">
          <div className="w-full max-w-lg max-h-[90vh] glass-modal rounded-3xl relative bg-white border border-emerald-400 shadow-2xl overflow-hidden flex flex-col overscroll-contain">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-black text-slate-900 mb-1">⚽ {t('matches.create_title')}</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold leading-tight">{t('matches.create_subtitle')}</p>
            </div>

            <form id="create-match-form" onSubmit={handleSubmit} className="space-y-4 px-5 sm:px-6 py-5 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.match_date')}</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.stadium')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('matches.stadium_placeholder')}
                    value={formData.stadium}
                    onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.maps_link')}</label>
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/..."
                    value={formData.stadiumLink}
                    onChange={(e) => setFormData({ ...formData, stadiumLink: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.pitch_cost')}</label>
                  <input
                    type="number"
                    required
                    step="100000"
                    value={formData.pitchCost}
                    onChange={(e) => setFormData({ ...formData, pitchCost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.deal')}</label>
                  <input
                    type="text"
                    placeholder="5-5 / 6-4"
                    value={formData.deal}
                    onChange={(e) => setFormData({ ...formData, deal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.select_old_opponent')}</label>
                  <select
                    onChange={handleSelectOldOpponent}
                    className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm text-blue-900 font-bold focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.kit_color')}</label>
                  <select
                    value={formData.kitColor}
                    onChange={(e) => setFormData({ ...formData, kitColor: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">{t('matches.kit_unselected')}</option>
                    <option value="xanh dương">{t('matches.kit_blue')}</option>
                    <option value="đỏ">{t('matches.kit_red')}</option>
                    <option value="đen">{t('matches.kit_black')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_phone')}</label>
                  <input
                    type="text"
                    placeholder="098..."
                    value={formData.opponentPhone}
                    onChange={(e) => setFormData({ ...formData, opponentPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('matches.opponent_fb')}</label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/..."
                    value={formData.opponentFbLink}
                    onChange={(e) => setFormData({ ...formData, opponentFbLink: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

            </form>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 text-sm font-bold w-full sm:w-auto transition"
              >
                {t('matches.cancel')}
              </button>
              <button
                type="submit"
                form="create-match-form"
                disabled={createMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md w-full sm:w-auto transition"
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
