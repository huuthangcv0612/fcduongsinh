import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Filter, 
  Search, 
  Sparkles,
  Coffee,
  UserCheck,
  TrendingUp,
  CreditCard,
  X,
  Plus,
  Minus
} from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function MatchFundsGrid({ isAdmin }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedYear, setSelectedYear] = useState('all');
  const [statusFilter, setStatusFilter] = useState('completed');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMatchId, setExpandedMatchId] = useState(null);

  // Quick Edit Cost Modal State
  const [editingMatch, setEditingMatch] = useState(null);
  const [costForm, setCostForm] = useState({
    pitchCost: 0,
    serviceCost: 0,
    guestPlayers: 0,
    guestPlayersA: 0,
    guestPlayersB: 0,
    deal: '5-5',
    guestPaidCount: 0
  });

  useBodyScrollLock(Boolean(editingMatch));

  // Query Match Funds
  const { data: fundsRes, isLoading } = useQuery({
    queryKey: ['match-funds', selectedYear, statusFilter],
    queryFn: () => {
      const params = {};
      if (selectedYear !== 'all') params.year = selectedYear;
      if (statusFilter !== 'all') params.status = statusFilter;
      return api.get('/finances/match-funds', { params });
    },
    staleTime: 30000
  });

  const matches = useMemo(() => {
    const list = Array.isArray(fundsRes?.data) ? fundsRes.data : [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(m => 
      (m.stadium || '').toLowerCase().includes(q) ||
      (m.opponent?.teamName || '').toLowerCase().includes(q) ||
      (m.date || '').includes(q)
    );
  }, [fundsRes, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalCost = 0;
    let totalCollected = 0;
    let totalPlayers = 0;
    let totalPaid = 0;

    matches.forEach(m => {
      totalCost += Number(m.totalCost) || 0;
      totalCollected += Number(m.totalCollected) || 0;
      totalPlayers += Number(m.totalPlayers) || 0;
      totalPaid += Number(m.totalPaidCount) || 0;
    });

    const completionRate = totalPlayers > 0 ? Math.round((totalPaid / totalPlayers) * 100) : 0;

    return {
      matchCount: matches.length,
      totalCost,
      totalCollected,
      totalPlayers,
      totalPaid,
      completionRate
    };
  }, [matches]);

  // Toggle Member Payment Mutation
  const togglePaymentMutation = useMutation({
    mutationFn: ({ matchId, userId, isPaid, paidAmount }) => 
      api.put(`/matches/${matchId}/payment`, { userId, isPaid, paidAmount }),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['match-funds'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['myFundStatus'] });
      toast.success(res.message || 'Đã cập nhật trạng thái đóng tiền!');
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi cập nhật thanh toán', 'Lỗi');
    }
  });

  // Update Match Cost Mutation
  const updateCostMutation = useMutation({
    mutationFn: ({ matchId, data }) => api.put(`/matches/${matchId}/fund`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-funds'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success('Đã lưu thông tin chi phí và thành viên vãng lai!', 'Thành công');
      setEditingMatch(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi cập nhật chi phí', 'Lỗi');
    }
  });

  const handleOpenEditCost = (match, e) => {
    e.stopPropagation();
    setEditingMatch(match);
    setCostForm({
      pitchCost: match.pitchCost || 0,
      serviceCost: match.serviceCost || 0,
      guestPlayers: match.guestPlayers || 0,
      guestPlayersA: match.guestPlayersA || 0,
      guestPlayersB: match.guestPlayersB || 0,
      deal: match.deal || '5-5',
      guestPaidCount: match.guestPaidCount || 0
    });
  };

  const handleSaveCost = (e) => {
    e.preventDefault();
    if (!editingMatch) return;
    updateCostMutation.mutate({
      matchId: editingMatch._id,
      data: {
        pitchCost: Number(costForm.pitchCost) || 0,
        serviceCost: Number(costForm.serviceCost) || 0,
        guestPlayers: editingMatch.matchType === 'internal'
          ? (Number(costForm.guestPlayersA) || 0) + (Number(costForm.guestPlayersB) || 0)
          : (Number(costForm.guestPlayers) || 0),
        guestPlayersA: Number(costForm.guestPlayersA) || 0,
        guestPlayersB: Number(costForm.guestPlayersB) || 0,
        deal: costForm.deal,
        guestPaidCount: Number(costForm.guestPaidCount) || 0
      }
    });
  };

  const handleToggleMember = (matchId, attendee) => {
    if (!isAdmin) return;
    togglePaymentMutation.mutate({
      matchId,
      userId: attendee.userId,
      isPaid: !attendee.isPaid,
      paidAmount: attendee.paidAmount
    });
  };

  const handleQuickGuestChange = (match, delta, e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const current = match.guestPaidCount || 0;
    const next = Math.max(0, Math.min(match.guestPlayers || 0, current + delta));
    if (next === current) return;

    updateCostMutation.mutate({
      matchId: match._id,
      data: {
        guestPaidCount: next
      }
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Số Trận Đấu</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.matchCount}</div>
          <span className="text-[10px] font-bold text-slate-500 mt-1">Đã áp dụng chia quỹ trận</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Tổng Chi Trận</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            {stats.totalCost.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-[10px] font-bold text-slate-500 mt-1">Sân + Dịch vụ</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Đã Thu Về</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            {stats.totalCollected.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-[10px] font-bold text-slate-500 mt-1">Từ các cầu thủ tham gia</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Tiến Độ Thu</span>
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600">
            {stats.totalPaid}/{stats.totalPlayers} ({stats.completionRate}%)
          </div>
          <span className="text-[10px] font-bold text-slate-500 mt-1">Người đã hoàn thành</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo sân, đối thủ, ngày..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Đã kết thúc</option>
              <option value="upcoming">Sắp diễn ra</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Tất cả các năm</option>
              <option value="2026">Năm 2026</option>
              <option value="2025">Năm 2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* Match Cards List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 font-bold text-sm">
          Đang tải dữ liệu quỹ trận đấu...
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-base font-black text-slate-800">Không tìm thấy trận đấu nào</h4>
          <p className="text-xs text-slate-500 font-bold mt-1">Hãy tạo trận đấu hoặc thay đổi bộ lọc tìm kiếm.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {matches.map((m) => {
            const isExpanded = expandedMatchId === m._id;
            const myAttendee = m.attendees.find(a => a.userId?.toString() === user?._id?.toString());
            const fee = m.feePerPerson || 0;

            return (
              <div
                key={m._id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition overflow-hidden"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedMatchId(isExpanded ? null : m._id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 cursor-pointer bg-gradient-to-r from-slate-50/60 to-white hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center shrink-0 text-blue-700">
                      <span className="text-[10px] font-black leading-none">{m.date?.split('-')[2] || '??'}</span>
                      <span className="text-[8px] font-bold leading-none mt-0.5">T{m.date?.split('-')[1] || '?'}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-black text-slate-900 text-sm sm:text-base truncate">
                          {m.matchType === 'internal'
                            ? `⚔️ ${m.breakdown?.teamA?.name || 'Team A'} vs ${m.breakdown?.teamB?.name || 'Team B'}`
                            : `⚽ vs ${m.opponent?.teamName || 'Đối thủ'}`}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200 font-mono">
                          Kèo {m.deal || '5-5'}
                        </span>
                        {m.status === 'completed' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">
                            ✓ Đã kết thúc
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-bold flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{m.stadium}</span>
                        </span>
                        <span>•</span>
                        <span>{m.time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Quick Metrics */}
                  <div className="flex items-center gap-2 sm:gap-4 justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100 flex-wrap sm:flex-nowrap">
                    {/* Cost breakdown */}
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                        Sân: <span className="font-black text-slate-800">{(m.pitchCost || 0).toLocaleString('vi-VN')}đ</span>
                        {m.serviceCost > 0 && <span className="ml-1 text-slate-400">+ Nước</span>}
                      </div>
                      <div className="text-xs sm:text-sm font-black text-rose-600">
                        Tổng: {(m.totalCost || 0).toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    {/* Per person breakdown */}
                    {m.matchType === 'internal' && m.breakdown ? (
                      <div className="bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 text-left sm:text-right shrink-0">
                        <div className="text-[9px] sm:text-[10px] font-extrabold text-amber-900 uppercase">
                          {m.totalPlayers} ng ({m.breakdown.teamA?.name?.replace('Team ', 'T')}: {m.breakdown.teamA?.totalCount} • {m.breakdown.teamB?.name?.replace('Team ', 'T')}: {m.breakdown.teamB?.totalCount})
                        </div>
                        <div className="text-[11px] sm:text-xs font-black text-slate-800 font-mono">
                          <span className="text-blue-700">{m.breakdown.teamA?.feePerPerson?.toLocaleString('vi-VN')}đ</span> | <span className="text-orange-700">{m.breakdown.teamB?.feePerPerson?.toLocaleString('vi-VN')}đ</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 text-left sm:text-right shrink-0">
                        <div className="text-[9px] sm:text-[10px] font-extrabold text-emerald-800 uppercase">
                          {m.totalPlayers} người {m.guestPlayers > 0 ? `(+${m.guestPlayers}k)` : ''}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                          {fee.toLocaleString('vi-VN')} đ<span className="text-[10px] font-bold text-slate-500">/ng</span>
                        </div>
                      </div>
                    )}

                    {/* Expand icon and Admin Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditCost(m, e)}
                          className="tactile-btn p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Cập nhật tiền sân, dịch vụ & số người vãng lai"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 transition"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 flex overflow-hidden">
                  <div
                    style={{
                      width: `${m.totalPlayers > 0 ? (m.totalPaidCount / m.totalPlayers) * 100 : 0}%`
                    }}
                    className="bg-emerald-500 h-full transition-all"
                  />
                </div>

                {/* Expanded Details Section: Member payment status & Guest tracking */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-4 animate-fade-in">
                    {/* Summary row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Danh sách đóng tiền ({m.totalPaidCount}/{m.totalPlayers} người đã nộp)</span>
                      </div>
                      <div className="text-slate-600">
                        Đã thu: <span className="font-black text-emerald-600">{m.totalCollected?.toLocaleString('vi-VN')} đ</span> / {m.totalCost?.toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    {/* Guest players manager */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span>👤 Thành viên vãng lai (ngoài đội):</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-[11px]">
                            {m.guestPlayers || 0} người
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                          Đóng: {fee.toLocaleString('vi-VN')} đ / khách • Tổng đóng: {((m.guestPaidCount || 0) * fee).toLocaleString('vi-VN')} đ
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          Đã đóng: <b className="text-emerald-700">{m.guestPaidCount || 0} / {m.guestPlayers || 0}</b>
                        </span>
                        {isAdmin && m.guestPlayers > 0 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleQuickGuestChange(m, -1, e)}
                              disabled={(m.guestPaidCount || 0) <= 0}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition"
                              title="Giảm 1 khách đã đóng"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleQuickGuestChange(m, 1, e)}
                              disabled={(m.guestPaidCount || 0) >= (m.guestPlayers || 0)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition shadow-xs"
                              title="Thêm 1 khách đã đóng"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Team Members List Grid */}
                    <div>
                      <div className="text-xs font-black text-slate-800 mb-2 flex items-center justify-between">
                        <span>⚽ Thành viên trong đội tham gia ({m.attendees.length} người):</span>
                        {isAdmin && (
                          <span className="text-[10px] text-slate-500 font-normal italic">
                            * Bấm vào thành viên để bật/tắt trạng thái đã đóng tiền
                          </span>
                        )}
                      </div>

                      {m.attendees.length === 0 ? (
                        <div className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-slate-200 text-center">
                          Chưa có thành viên nào điểm danh "ĐÁ" cho trận này.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {m.attendees.map((attendee) => {
                            const isPaid = attendee.isPaid;
                            return (
                              <div
                                key={attendee.userId}
                                onClick={() => handleToggleMember(m._id, attendee)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition select-none ${
                                  isAdmin ? 'cursor-pointer' : ''
                                } ${
                                  isPaid 
                                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100' 
                                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={attendee.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                                    alt={attendee.name}
                                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-black truncate flex items-center gap-1.5">
                                      <span>{attendee.name}</span>
                                      {attendee.team && attendee.team !== 'unassigned' && (
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                                          attendee.team === 'teamA' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                                        }`}>
                                          {attendee.team === 'teamA' ? (m.breakdown?.teamA?.name || 'Team A') : (m.breakdown?.teamB?.name || 'Team B')}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold truncate">
                                      {attendee.position || 'Cầu thủ'} {attendee.number ? `• #${attendee.number}` : ''} • Cần nộp: <b className="text-emerald-700 font-mono">{(attendee.feeToPay || fee).toLocaleString('vi-VN')} đ</b>
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                                      <CheckCircle2 className="w-3 h-3" /> Đã đóng
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                                      <XCircle className="w-3 h-3" /> Chưa nộp
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ✏️ MODAL: EDIT PITCH COST, SERVICE COST, GUEST PLAYERS */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overscroll-contain">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 relative border border-blue-600 shadow-2xl flex flex-col max-h-[90dvh] overscroll-contain">
            <button
              onClick={() => setEditingMatch(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4 pr-8">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                💰 Cập Nhật Chi Phí & Chia Quỹ Trận
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                Trận ngày {editingMatch.date} • {editingMatch.stadium}
              </p>
            </div>

            <form onSubmit={handleSaveCost} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Pitch Cost */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  🏟️ Tiền sân (VNĐ):
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={costForm.pitchCost}
                  onChange={(e) => setCostForm({ ...costForm, pitchCost: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Service Cost */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  🥤 Tiền dịch vụ / nước uống (VNĐ):
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={costForm.serviceCost}
                  onChange={(e) => setCostForm({ ...costForm, serviceCost: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Guest Players & Deal */}
              {editingMatch.matchType === 'internal' ? (
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 space-y-3">
                  <div className="text-xs font-black text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-700" />
                      Khách vãng lai & Kèo trận nội bộ:
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      ⚖️ Kèo sân (Deal):
                    </label>
                    <input
                      type="text"
                      value={costForm.deal}
                      onChange={(e) => setCostForm({ ...costForm, deal: e.target.value })}
                      placeholder="5-5, 6-4, 7-3, 10-0..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Khách {editingMatch.breakdown?.teamA?.name || 'Team A'}:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={costForm.guestPlayersA}
                        onChange={(e) => setCostForm({ ...costForm, guestPlayersA: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Khách {editingMatch.breakdown?.teamB?.name || 'Team B'}:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={costForm.guestPlayersB}
                        onChange={(e) => setCostForm({ ...costForm, guestPlayersB: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 space-y-3">
                  <div className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-700" />
                    <span>Thành viên vãng lai (không thuộc đội):</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Số người vãng lai:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={costForm.guestPlayers}
                        onChange={(e) => setCostForm({ ...costForm, guestPlayers: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Số khách đã đóng:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={costForm.guestPlayers}
                        value={costForm.guestPaidCount}
                        onChange={(e) => setCostForm({ ...costForm, guestPaidCount: Math.max(0, Math.min(costForm.guestPlayers, parseInt(e.target.value) || 0)) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Calculation Preview Card */}
              {(() => {
                const totalCost = (Number(costForm.pitchCost) || 0) + (Number(costForm.serviceCost) || 0);
                const teamJoined = editingMatch.teamJoinedCount || 0;
                const totalP = teamJoined + (Number(costForm.guestPlayers) || 0);
                const feePerP = totalP > 0 ? Math.round(totalCost / totalP) : 0;

                return (
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-4 space-y-2 text-xs font-bold text-slate-700">
                    <div className="text-[11px] font-black uppercase text-blue-800 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tính toán chi phí chia đều:</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Tổng chi phí (Sân + Dịch vụ):</span>
                      <span className="font-black text-slate-900">{totalCost.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Tổng người tham gia:</span>
                      <span className="font-black text-slate-900">
                        {totalP} người ({teamJoined} trong đội + {costForm.guestPlayers || 0} vãng lai)
                      </span>
                    </div>

                    <div className="pt-2 border-t border-blue-200 flex justify-between items-center text-sm">
                      <span className="font-black text-blue-900">Mỗi người cần đóng:</span>
                      <span className="text-base font-black text-emerald-600 font-mono">
                        {feePerP.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updateCostMutation.isPending}
                  className="tactile-btn px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition disabled:opacity-50"
                >
                  {updateCostMutation.isPending ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
