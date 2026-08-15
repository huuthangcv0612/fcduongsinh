import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmModalContext';
import { useMatchmaking } from '../context/MatchmakingContext';
import { 
  Search, 
  Sparkles, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  BookmarkCheck, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  Link2, 
  CheckCircle2, 
  XCircle, 
  Globe,
  SlidersHorizontal,
  Landmark,
  Save,
  Star,
  Eye,
  Activity,
  Cpu,
  Zap
} from 'lucide-react';

export default function MatchmakingPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const {
    activeTab, setActiveTab,
    apifyLimit, setApifyLimit,
    scrapedList, setScrapedList,
    filterDay, setFilterDay,
    filterTime, setFilterTime,
    progress, setProgress,
    groupFormData, setGroupFormData,
    activeGroupsCount, setActiveGroupsCount,
    scrapeMutation,
    defaultGroupFormData
  } = useMatchmaking();

  // Query saved opponents from DB safely
  const { data: savedOpponentsRes } = useQuery({
    queryKey: ['savedOpponents'],
    queryFn: () => api.get('/opponents')
  });

  // Query Facebook Groups safely
  const { data: fbGroupsRes } = useQuery({
    queryKey: ['facebook-groups'],
    queryFn: () => api.get('/facebook-groups')
  });

  // Safely extract arrays
  const savedOpponents = Array.isArray(savedOpponentsRes?.data) 
    ? savedOpponentsRes.data 
    : (Array.isArray(savedOpponentsRes) ? savedOpponentsRes : []);

  const fbGroups = Array.isArray(fbGroupsRes?.data) 
    ? fbGroupsRes.data 
    : (Array.isArray(fbGroupsRes) ? fbGroupsRes : []);

  useEffect(() => {
    const count = Array.isArray(fbGroups) ? fbGroups.filter(g => g && g.isActive).length : 0;
    setActiveGroupsCount(count);
  }, [fbGroups, setActiveGroupsCount]);

  // Save specific opponent into DB
  const saveMutation = useMutation({
    mutationFn: (opponentData) => api.post('/opponents/save', opponentData),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['savedOpponents'] });
      toast.success(`Đã lưu kèo "${res?.data?.teamName || 'đối thủ'}" vào cơ sở dữ liệu!`, 'Đã lưu kèo');

      setScrapedList(prev =>
        prev.map(item => (item._tempId && res?.data?._tempId && item._tempId === res.data._tempId) || (item.sourceUrl && res?.data?.sourceUrl && item.sourceUrl === res.data.sourceUrl)
          ? { ...item, isSaved: true, _id: res.data._id }
          : item
        )
      );
    },
    onError: (err) => {
      toast.error(err.message || 'Không thể lưu kèo này', 'Lỗi');
    }
  });

  // Delete saved opponent from DB
  const deleteSavedOpponentMutation = useMutation({
    mutationFn: (id) => api.delete(`/opponents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedOpponents'] });
      toast.success('Đã xóa kèo đối thủ khỏi cơ sở dữ liệu!', 'Đã xóa');
    },
    onError: (err) => {
      toast.error(err.message || 'Xóa kèo đối thủ thất bại', 'Lỗi');
    }
  });

  // Facebook Group Mutations
  const createGroupMutation = useMutation({
    mutationFn: (data) => api.post('/facebook-groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-groups'] });
      toast.success('Đã thêm Facebook Group mới vào danh sách quét!', 'Thành công');
      setGroupFormData(defaultGroupFormData);
    },
    onError: (err) => {
      toast.error(err.message || 'Không thể thêm Facebook Group này', 'Lỗi');
    }
  });

  const toggleGroupActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/facebook-groups/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-groups'] });
      toast.info('Đã thay đổi trạng thái hoạt động của Group', 'Cập nhật');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id) => api.delete(`/facebook-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-groups'] });
      toast.success('Đã xóa Facebook Group khỏi danh sách!', 'Đã xóa');
    },
    onError: (err) => {
      toast.error(err.message || 'Xóa Facebook Group thất bại', 'Lỗi');
    }
  });

  const handleAddGroupSubmit = (e) => {
    e.preventDefault();
    createGroupMutation.mutate(groupFormData);
  };

  const clearMatchmakingCache = () => {
    if (typeof window === 'undefined') return;

    try {
      window.sessionStorage.removeItem(MATCHMAKING_CACHE_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  const handleDeleteGroup = async (id, name) => {
    const isConfirmed = await confirm({
      title: 'Xóa Facebook Group',
      message: `Bạn có chắc chắn muốn xóa Facebook Group "${name}" khỏi danh sách quét tự động?`,
      confirmText: 'Xóa Ngay',
      cancelText: 'Hủy Bỏ',
      type: 'danger'
    });

    if (isConfirmed) {
      deleteGroupMutation.mutate(id);
    }
  };

  const handleDeleteSavedOpponent = async (id, teamName) => {
    const isConfirmed = await confirm({
      title: 'Xóa Kèo Đã Lưu',
      message: `Bạn có chắc chắn muốn xóa kèo của "${teamName}" khỏi cơ sở dữ liệu?`,
      confirmText: 'Xóa Kèo',
      cancelText: 'Hủy',
      type: 'danger'
    });

    if (isConfirmed) {
      deleteSavedOpponentMutation.mutate(id);
    }
  };

  useEffect(() => {
    writeMatchmakingCache({
      activeTab,
      apifyLimit,
      scrapedList,
      filterDay,
      filterTime,
      groupFormData,
    });
  }, [activeTab, apifyLimit, scrapedList, filterDay, filterTime, groupFormData]);

  // Helper: Comprehensive Vietnamese Shorthand Check for Today (hnay, h.nay, tnay, cnay, snay, hom nay...)
  const isTodayPostText = (opp) => {
    if (!opp || typeof opp.rawText !== 'string') return false;
    return /(tối\s*nay|\btnay\b|\bt\.nay\b|\btn\b|hôm\s*nay|\bhnay\b|\bh\.nay\b|\bhn\b|chiều\s*nay|\bcnay\b|\bc\.nay\b|sáng\s*nay|\bsnay\b|\bs\.nay\b|hom\s*nay|toi\s*nay|chieu\s*nay|sang\s*nay)/i.test(opp.rawText);
  };

  // Helper: Check if an opponent matches Tuesday 19h-19h30 safely
  const isMatchTeamPreference = (opp) => {
    if (!opp) return false;
    const isTuesday = typeof opp.matchDay === 'string' && opp.matchDay.toLowerCase().includes('thứ 3');
    if (!isTuesday || typeof opp.matchTime !== 'string') return false;
    
    const timeParts = opp.matchTime.split(':');
    if (timeParts.length < 2) return false;
    
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    if (isNaN(hour) || isNaN(minute)) return false;

    const totalMinutes = hour * 60 + minute;
    return totalMinutes >= 1125 && totalMinutes <= 1200; // 18:45 to 20:00
  };

  // Filtering Logic Function (Type-safe)
  const filterOpponentsList = (list) => {
    if (!Array.isArray(list)) return [];
    return list.filter(item => {
      if (!item) return false;

      // Day filter
      if (filterDay === 'hôm nay') {
        if (!isTodayPostText(item)) return false;
      } else if (filterDay !== 'all') {
        if (typeof item.matchDay !== 'string' || !item.matchDay.toLowerCase().includes(filterDay.toLowerCase())) {
          return false;
        }
      }

      // Time filter
      if (filterTime !== 'all' && typeof item.matchTime === 'string') {
        const timeParts = item.matchTime.split(':');
        if (timeParts.length >= 2) {
          const hour = parseInt(timeParts[0], 10);
          const minute = parseInt(timeParts[1], 10);

          if (!isNaN(hour) && !isNaN(minute)) {
            const totalMinutes = hour * 60 + minute;

            if (filterTime === '19h_19h30') {
              if (totalMinutes < 1125 || totalMinutes > 1200) return false;
            } else if (filterTime === 'sang' && (hour < 6 || hour >= 12)) {
              return false;
            } else if (filterTime === 'chieu' && (hour < 12 || hour >= 17)) {
              return false;
            } else if (filterTime === 'toi' && (hour < 17 || hour >= 22)) {
              return false;
            } else if (filterTime === 'dem' && hour < 22) {
              return false;
            }
          }
        }
      }

      return true;
    });
  };

  const rawList = activeTab === 'scraped' ? (Array.isArray(scrapedList) ? scrapedList : []) : savedOpponents;
  const filteredList = filterOpponentsList(rawList);

  return (
    <div className="space-y-6 animate-fade-in pb-16 md:pb-0">
      {/* High-Contrast Hero Banner */}
      <div className="rounded-3xl p-5 sm:p-8 border-2 border-cyan-600 relative overflow-hidden bg-gradient-to-r from-cyan-900 via-teal-800 to-emerald-900 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-3 backdrop-blur-md">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> GU ĐỘI: THỨ 3 (19H - 19H30) HÀ NỘI
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
              🤖 Tìm Đối Thủ Đá Bóng (Hà Nội)
            </h2>
            <p className="text-slate-100 text-xs sm:text-sm mt-2 max-w-xl font-bold leading-relaxed">
              Cào bài tìm đối từ các Facebook Groups Hà Nội ({activeGroupsCount} group đang hoạt động). Tất cả bài cào hiển thị tức thì, bấm "Lưu Kèo" bài bạn ưng ý vào DB!
            </p>
          </div>

          {/* Scrape Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-cyan-400/40 text-xs font-bold">
              <span className="text-slate-300 pl-2">Số bài cào:</span>
              <select
                value={apifyLimit}
                onChange={(e) => setApifyLimit(Number(e.target.value))}
                className="bg-cyan-900 text-white font-black px-2.5 py-1.5 rounded-xl border border-cyan-400 focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-slate-900 text-white">5 bài / group</option>
                <option value={10} className="bg-slate-900 text-white">10 bài / group</option>
                <option value={15} className="bg-slate-900 text-white">15 bài / group</option>
                <option value={30} className="bg-slate-900 text-white">30 bài / group</option>
              </select>
            </div>

            <button
              onClick={() => scrapeMutation.mutate()}
              disabled={scrapeMutation.isPending}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {scrapeMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Search className="w-4 h-4 text-slate-950" />
              )}
              <span>{scrapeMutation.isPending ? 'Đang Phân Tích...' : 'Quét Đối Mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* LIVE SCRAPING PROGRESS MONITOR CARD (Docker & Apify Realtime Tracker) */}
      {progress.active && (
        <div className="glass-card-white rounded-3xl p-5 border-2 border-emerald-500 bg-slate-900 text-white shadow-2xl animate-fade-in relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 animate-pulse">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-emerald-300 flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>DOCKER & APIFY SCRAPER LIVE PROGRESS MONITOR</span>
                </h4>
                <p className="text-xs text-slate-300 font-bold mt-0.5">{progress.stepText}</p>
              </div>
            </div>
            <span className="text-xl font-black text-emerald-400 tracking-wider font-mono">{progress.percent}%</span>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-700 mb-2">
            <div
              className="bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 h-full rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>{progress.detailText}</span>
            <span></span>
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-300 pb-2">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('scraped')}
            className={`w-full min-w-0 min-h-[3.4rem] px-2 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-sm font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center leading-tight ${
              activeTab === 'scraped'
                ? 'bg-cyan-700 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-300'
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="min-w-0">Bài Mới Vừa Cào ({scrapedList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`w-full min-w-0 min-h-[3.4rem] px-2 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-sm font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center leading-tight ${
              activeTab === 'saved'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-300'
            }`}
          >
            <BookmarkCheck className="w-4 h-4 text-amber-300" />
            <span className="min-w-0">💾 Kèo Đã Lưu DB ({savedOpponents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('facebook_groups')}
            className={`w-full min-w-0 min-h-[3.4rem] px-2 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-sm font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center leading-tight ${
              activeTab === 'facebook_groups'
                ? 'bg-cyan-700 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-300'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="min-w-0">Facebook Groups ({fbGroups.length})</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR FOR THỨ & KHUNG GIỜ */}
      {activeTab !== 'facebook_groups' && (
        <div className="glass-card-white rounded-2xl p-4 border border-slate-300 bg-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4 text-cyan-700" />
            <span>Lọc Kết Quả (Đang hiển thị {filteredList.length}/{rawList.length}):</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            {/* Quick Filter Today Button */}
            <button
              onClick={() => { setFilterDay('hôm nay'); setFilterTime('all'); }}
              className={`px-3 py-1.5 rounded-xl font-black transition flex items-center gap-1.5 ${
                filterDay === 'hôm nay'
                  ? 'bg-cyan-500 text-slate-950 border border-cyan-400 shadow-sm ring-2 ring-cyan-400/30'
                  : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
              <span>🔥 Lọc Kèo Hôm Nay (hnay, tnay...)</span>
            </button>

            {/* Quick Filter Tuesday 19h Button */}
            <button
              onClick={() => { setFilterDay('Thứ 3'); setFilterTime('19h_19h30'); }}
              className={`px-3 py-1.5 rounded-xl font-black transition flex items-center gap-1.5 ${
                filterDay === 'Thứ 3' && filterTime === '19h_19h30'
                  ? 'bg-amber-400 text-amber-950 border border-amber-500 shadow-sm'
                  : 'bg-slate-100 hover:bg-amber-100 text-slate-700 border border-slate-300'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
              <span>⭐ Lọc Kèo Thứ 3 (19h-19h30)</span>
            </button>

            {/* Filter Day Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-extrabold">Thứ:</span>
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Tất cả các ngày</option>
                <option value="hôm nay">🔥 Đăng hôm nay (hnay, tnay...)</option>
                <option value="Thứ 3">Thứ 3</option>
                <option value="Thứ 2">Thứ 2</option>
                <option value="Thứ 4">Thứ 4</option>
                <option value="Thứ 5">Thứ 5</option>
                <option value="Thứ 6">Thứ 6</option>
                <option value="Thứ 7">Thứ 7</option>
                <option value="Chủ nhật">Chủ nhật</option>
              </select>
            </div>

            {/* Filter Time Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-extrabold">Khung giờ:</span>
              <select
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Tất cả khung giờ</option>
                <option value="19h_19h30">19h - 19h30 Tối</option>
                <option value="sang">🌅 Sáng (6h - 12h)</option>
                <option value="chieu">☀️ Chiều (12h - 17h)</option>
                <option value="toi">🌙 Tối (17h - 22h)</option>
                <option value="dem">🌌 Đêm (&gt; 22h)</option>
              </select>
            </div>

            {(filterDay !== 'all' || filterTime !== 'all') && (
              <button
                onClick={() => { setFilterDay('all'); setFilterTime('all'); }}
                className="text-[11px] font-black text-rose-700 hover:underline flex items-center gap-1"
              >
                ✖ Bỏ lọc (Hiện tất cả {rawList.length} bài)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warning if Filter hides results */}
      {activeTab !== 'facebook_groups' && rawList.length > 0 && filteredList.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 font-bold flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-sm font-black text-amber-900">
                Đã cào được {rawList.length} bài đăng từ Facebook, nhưng 0 bài khớp bộ lọc [{filterDay !== 'all' ? filterDay : ''} {filterTime !== 'all' ? filterTime : ''}]!
              </div>
              <div className="text-xs text-amber-800">
                Nhấn nút "Hiện tất cả" bên phải để mở xem toàn bộ {rawList.length} bài cào vừa nhận được.
              </div>
            </div>
          </div>

          <button
            onClick={() => { setFilterDay('all'); setFilterTime('all'); }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs shrink-0 shadow-md transition flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>Hiện tất cả {rawList.length} bài cào</span>
          </button>
        </div>
      )}

      {/* TAB 1 & 2: OPPONENTS GRID */}
      {activeTab !== 'facebook_groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((opp, idx) => {
            const isPrimeMatch = isMatchTeamPreference(opp);
            const isTodayMatch = isTodayPostText(opp);

            return (
              <div
                key={opp._id || opp._tempId || idx}
                className={`glass-card-white rounded-3xl p-5 border transition-all duration-300 shadow-md flex flex-col justify-between bg-white ${
                  isPrimeMatch ? 'border-2 border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-300 hover:border-cyan-500'
                }`}
              >
                <div>
                  {/* Badges Container */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {/* Prime Match Tuesday 19h Badge */}
                    {isPrimeMatch && (
                      <div className="px-3 py-1 rounded-xl bg-amber-400 text-amber-950 text-xs font-black flex items-center gap-1.5 shadow-sm">
                        <Star className="w-3.5 h-3.5 fill-amber-950 text-amber-950" />
                        <span>⭐ KHỚP GU ĐỘI: THỨ 3 (19H - 19H30)</span>
                      </div>
                    )}

                    {/* 🔥 DISTINCT TODAY TAG BADGE FOR "TỐI NAY / HÔM NAY / HNAY / TNAY" POSTS */}
                    {isTodayMatch && (
                      <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm border border-cyan-300">
                        <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                        <span>🔥 KÈO ĐÁ HÔM NAY (TỐI NAY)</span>
                      </div>
                    )}
                  </div>

                  {/* Header Level Badge & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                      opp.level === 'Mềm'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : opp.level === 'Cứng'
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      Trình độ: {opp.level || 'Trung bình'}
                    </span>

                    {opp.isSaved ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black flex items-center gap-1">
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700" /> ĐÃ LƯU DB
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-[11px] font-bold">
                        Bài cào tạm
                      </span>
                    )}
                  </div>

                  {/* Team Name */}
                  <h3 className="text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
                    ⚽ {opp.teamName || 'Đội chưa rõ tên'}
                  </h3>

                  {/* Detailed Match Specs: Stadium & Area */}
                  <div className="space-y-2 text-xs font-bold text-slate-900 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-3">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Sân: <strong className="text-emerald-900 font-extrabold">{opp.stadiumName || 'Chưa chốt sân'}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-700 shrink-0" />
                      <span>Khu vực: <strong className="text-slate-900 font-extrabold">{opp.homeArea || 'Hà Nội'}</strong></span>
                    </div>

                    <div className="flex items-center gap-4 pt-1 border-t border-slate-200 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-amber-900 font-black">{opp.matchDay || 'Chưa rõ ngày'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-700" />
                        <span className="text-cyan-900 font-black">{opp.matchTime || 'Chưa rõ giờ'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Raw Post Snippet */}
                  <div className="text-xs font-bold text-slate-900 bg-slate-100 p-3 rounded-xl border border-slate-300 italic line-clamp-3 mb-4">
                    "{opp.rawText || ''}"
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    {opp.contactPhone ? (
                      <a
                        href={`tel:${opp.contactPhone}`}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Gọi {opp.contactPhone}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500 font-bold italic py-2">Không có SĐT</span>
                    )}

                    {opp.sourceUrl && (
                      <a
                        href={opp.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold transition"
                        title="Xem bài đăng gốc trên Facebook"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Explicit Save to DB Button */}
                  {!opp.isSaved ? (
                    <button
                      onClick={() => saveMutation.mutate(opp)}
                      disabled={saveMutation.isPending}
                      className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>💾 LƯU KÈO VÀO DB</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteSavedOpponent(opp._id, opp.teamName)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-700 font-black text-xs flex items-center justify-center gap-1.5 border border-slate-300 hover:border-rose-300 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Kèo Khỏi DB</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredList.length === 0 && rawList.length === 0 && (
            <div className="col-span-full glass-card-white rounded-3xl p-12 text-center text-slate-700 font-bold bg-white">
              {activeTab === 'scraped' ? (
                <span>Chưa có bài cào nào. Bấm nút <strong>"Quét Đối Mới"</strong> ở trên để cào bài từ Facebook Groups!</span>
              ) : (
                <span>Chưa có kèo nào được lưu vào Cơ sở dữ liệu DB. Bấm sang tab <strong>"Bài Mới Vừa Cào"</strong> và nhấn <strong>"💾 LƯU KÈO VÀO DB"</strong> ở các bài viết ưng ý.</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FACEBOOK GROUPS MANAGER */}
      {activeTab === 'facebook_groups' && (
        <div className="space-y-6">
          {/* Quick Add Form Section */}
          <div className="glass-card-white rounded-3xl p-6 border-2 border-cyan-500 bg-white">
            <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              🔗 Thêm Đường Dẫn Facebook Group Cáp Kèo (Hà Nội)
            </h3>
            <p className="text-xs text-slate-600 font-bold mb-4">
              Dán URL Group cáp kèo bóng đá Hà Nội (VD: https://facebook.com/groups/capkeobongdahanoi) để hệ thống tự động tải bài
            </p>

            <form onSubmit={handleAddGroupSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Tên Group (VD: Hội cáp kèo Cầu Giấy)"
                value={groupFormData.name}
                onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
              />

              <input
                type="url"
                required
                placeholder="URL Group (https://facebook.com/groups/...)"
                value={groupFormData.url}
                onChange={(e) => setGroupFormData({ ...groupFormData, url: e.target.value })}
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-cyan-500"
              />

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Khu vực (VD: Cầu Giấy, Hà Nội)"
                  value={groupFormData.homeArea}
                  onChange={(e) => setGroupFormData({ ...groupFormData, homeArea: e.target.value })}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
                />

                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs shrink-0 shadow-md transition"
                >
                  + Thêm Group
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                🌐 Danh Sách Facebook Groups Đã Lưu ({fbGroups.length})
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fbGroups.map((group) => (
              <div
                key={group._id}
                className="glass-card-white rounded-3xl p-4 border border-slate-300 hover:border-cyan-400 transition flex items-start justify-between gap-4 bg-white"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${group.isActive ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-slate-400'}`} />
                    <h4 className="font-black text-sm text-slate-900 truncate">{group.name}</h4>
                  </div>

                  <a
                    href={group.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-700 font-bold hover:underline flex items-center gap-1 truncate"
                  >
                    <Link2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{group.url}</span>
                  </a>

                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                    <span>Khu vực: <b className="text-slate-900">{group.homeArea}</b></span>
                    <span>•</span>
                    <span className={group.isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500'}>
                      {group.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleGroupActiveMutation.mutate({ id: group._id, isActive: !group.isActive })}
                    title={group.isActive ? 'Tạm dừng quét link này' : 'Bật quét link này'}
                    className={`p-2 rounded-xl border transition ${
                      group.isActive
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-300'
                    }`}
                  >
                    {group.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDeleteGroup(group._id, group.name)}
                    disabled={deleteGroupMutation.isPending}
                    title="Xóa Facebook Group này"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 border border-slate-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {fbGroups.length === 0 && (
              <div className="col-span-full glass-card-white rounded-3xl p-8 text-center text-slate-600 text-xs font-bold bg-white">
                Chưa có link Facebook Group nào được lưu. Nhập URL ở ô phía trên và nhấn "+ Thêm Group".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
