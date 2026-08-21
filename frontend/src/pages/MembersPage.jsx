import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmModalContext';
import { CheckCircle2, XCircle, Edit2, Trash2, ShieldAlert, Search, Trophy, Flame, Star, Activity, Shirt } from 'lucide-react';
import EditMemberModal from '../components/EditMemberModal';
import { useTranslation } from 'react-i18next';

export default function MembersPage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const [editingMember, setEditingMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users')
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const users = usersRes?.data || [];

  const getPositionBadge = (pos) => {
    const p = (pos || '').toLowerCase();
    if (p.includes('tiền đạo') || p.includes('striker') || p.includes('cf') || p.includes('st')) {
      return { label: pos || 'Tiền đạo', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (p.includes('tiền vệ') || p.includes('midfield') || p.includes('cm') || p.includes('cam') || p.includes('cdm')) {
      return { label: pos || 'Tiền vệ', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (p.includes('hậu vệ') || p.includes('defender') || p.includes('cb') || p.includes('lb') || p.includes('rb')) {
      return { label: pos || 'Hậu vệ', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (p.includes('thủ môn') || p.includes('goalkeeper') || p.includes('gk')) {
      return { label: pos || 'Thủ môn', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: pos || t('members.free_agent'), bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchName = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.position || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchName) return false;

      if (positionFilter === 'ALL') return true;
      const pos = (u.position || '').toLowerCase();
      if (positionFilter === 'FW') return pos.includes('tiền đạo') || pos.includes('striker');
      if (positionFilter === 'MF') return pos.includes('tiền vệ') || pos.includes('midfield');
      if (positionFilter === 'DF') return pos.includes('hậu vệ') || pos.includes('defender');
      if (positionFilter === 'GK') return pos.includes('thủ môn') || pos.includes('goalkeeper');
      return true;
    });
  }, [users, searchQuery, positionFilter]);

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>👥 {t('members.title')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono-numbers">
              {users.length} {t('dashboard.players_count')}
            </span>
          </h2>
          <p className="text-xs font-bold text-slate-500">
            {t('members.subtitle')}
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cầu thủ..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* Position Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
        {[
          { id: 'ALL', label: 'Tất cả' },
          { id: 'FW', label: '⚽ Tiền đạo' },
          { id: 'MF', label: '🌿 Tiền vệ' },
          { id: 'DF', label: '🛡️ Hậu vệ' },
          { id: 'GK', label: '🧤 Thủ môn' },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setPositionFilter(chip.id)}
            className={`tactile-btn px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition ${
              positionFilter === chip.id
                ? 'bg-[#2c3ec4] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Members Squad Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filteredUsers.map((member) => {
          const posBadge = getPositionBadge(member.position);
          const stats = member.stats || { goals: 0, assists: 0, motm: 0, appearances: 0 };

          return (
            <div
              key={member._id}
              className="tactile-btn rounded-3xl p-4 sm:p-5 border border-slate-200/80 hover:border-blue-300 hover:shadow-lg transition-all shadow-sm bg-white flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-start gap-3 sm:gap-4 mb-3">
                  <div className="relative shrink-0 w-14 h-14">
                    <img
                      src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={member.name}
                      className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl object-cover border-2 border-slate-100 shadow-sm shrink-0"
                    />
                    {member.number && (
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-slate-900 text-white font-black font-mono-numbers text-[9px] shadow">
                        #{member.number}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 flex flex-wrap items-center gap-1.5 leading-tight">
                      <span className="truncate">{member.name}</span>
                      {(member.role === 'admin' || (Array.isArray(member.roles) && member.roles.includes('admin'))) && (
                        <span className="px-1.5 py-0.5 rounded-md border border-amber-300 bg-amber-100 text-amber-800 text-[9px] uppercase font-black shrink-0">
                          {t('members.admin')}
                        </span>
                      )}
                      {(member.role === 'treasurer' || (Array.isArray(member.roles) && member.roles.includes('treasurer'))) && (
                        <span className="px-1.5 py-0.5 rounded-md border border-purple-300 bg-purple-100 text-purple-800 text-[9px] uppercase font-black shrink-0">
                          💰 Thủ Quỹ
                        </span>
                      )}
                      {member.role === 'pending' && (
                        <span className="px-1.5 py-0.5 rounded-md border border-rose-300 bg-rose-100 text-rose-800 text-[9px] uppercase font-black flex items-center gap-0.5 shrink-0">
                          <ShieldAlert className="w-2.5 h-2.5" /> {t('members.pending')}
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{member.email}</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-black ${posBadge.bg}`}>
                        {posBadge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Player Mini Stats Pill Row */}
                <div className="grid grid-cols-4 gap-1 p-2 rounded-2xl bg-slate-50 border border-slate-100 text-center mb-3 font-mono-numbers">
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Trận</div>
                    <div className="text-xs font-black text-slate-700">{stats.appearances || 0}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-rose-500 uppercase">Bàn</div>
                    <div className="text-xs font-black text-rose-600">{stats.goals || 0}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-amber-500 uppercase">Kiến tạo</div>
                    <div className="text-xs font-black text-amber-600">{stats.assists || 0}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-yellow-600 uppercase">MVP</div>
                    <div className="text-xs font-black text-yellow-600">{stats.motm || 0}</div>
                  </div>
                </div>

                {/* Fund Status Badge */}
                <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 mb-2 flex items-center justify-between text-xs font-bold gap-2">
                  <span className="text-slate-500 text-[11px]">{t('members.fund_this_month')}</span>
                  {member.isFundPaidThisMonth ? (
                    <span className="flex items-center gap-1 font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-300 text-[11px] shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t('members.paid')} ({member.fundPaidThisMonth >= 1000 ? `${member.fundPaidThisMonth / 1000}k` : `${member.fundPaidThisMonth}đ`})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-300 text-[11px] shrink-0">
                      <XCircle className="w-3.5 h-3.5" /> {t('members.unpaid')}
                    </span>
                  )}
                </div>
              </div>

              {/* Admin Controls */}
              {isAdmin && (
                <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setEditingMember(member)}
                    title="Chỉnh sửa thông tin & phân quyền"
                    className="tactile-btn p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {member._id === user?._id && <span className="text-[10px] font-black">Chỉnh sửa</span>}
                  </button>

                  {member._id !== user?._id ? (
                    <>
                      <button
                        onClick={() => updateUserMutation.mutate({
                          id: member._id,
                          role: member.role === 'admin' ? 'member' : (member.role === 'pending' ? 'member' : 'admin')
                        })}
                        className={`tactile-btn flex-1 py-1.5 px-3 rounded-xl text-xs font-black border transition ${
                          member.role === 'pending' 
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {member.role === 'pending' ? t('members.approve') : (member.role === 'admin' ? t('members.demote') : t('members.promote'))}
                      </button>
                      <button
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: t('members.delete_title'),
                            message: t('members.delete_confirm')
                          });
                          if (confirmed) {
                            deleteUserMutation.mutate(member._id);
                          }
                        }}
                        title="Xóa thành viên"
                        className="tactile-btn p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="flex-1 text-[11px] text-slate-400 font-bold text-right italic pr-1">
                      (Tài khoản của bạn)
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <EditMemberModal 
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
      />
    </div>
  );
}
