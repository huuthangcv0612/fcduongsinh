import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmModalContext';
import { CheckCircle2, XCircle, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import EditMemberModal from '../components/EditMemberModal';
import { useTranslation } from 'react-i18next';

export default function MembersPage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const [editingMember, setEditingMember] = useState(null);

  const { data: usersRes } = useQuery({
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

  return (
    <div className="space-y-6 animate-fade-in pb-16 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            👥 {t('members.title')} ({users.length})
          </h2>
          <p className="text-xs font-bold text-slate-600">
            {t('members.subtitle')}
          </p>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {users.map((member) => (
          <div
            key={member._id}
            className="rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-emerald-400 transition shadow-sm bg-white flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <img
                  src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={member.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover border border-emerald-500 shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-sm sm:text-base text-slate-900 flex flex-wrap items-center gap-1.5 leading-tight">
                    <span className="truncate">{member.name}</span>
                    {member.role === 'admin' && (
                      <span className="px-1.5 py-0.5 rounded border border-amber-300 bg-amber-100 text-amber-800 text-[9px] uppercase font-bold shrink-0">
                        {t('members.admin')}
                      </span>
                    )}
                    {member.role === 'pending' && (
                      <span className="px-1.5 py-0.5 rounded border border-rose-300 bg-rose-100 text-rose-800 text-[9px] uppercase font-bold flex items-center gap-0.5 shrink-0">
                        <ShieldAlert className="w-2.5 h-2.5" /> {t('members.pending')}
                      </span>
                    )}
                  </h3>
                  <div className="text-[11px] sm:text-xs font-bold text-slate-500 truncate mt-0.5">{member.email}</div>
                  <div className="text-[11px] sm:text-xs font-black text-emerald-700 mt-1">
                    {t('members.position')}: {member.position || t('members.free_agent')}
                  </div>
                </div>
              </div>

              {/* Fund Status Badge */}
              <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 mb-3 flex flex-wrap items-center justify-between text-[11px] sm:text-xs font-bold gap-2">
                <span className="text-slate-600">{t('members.fund_this_month')}</span>
                {member.isFundPaidThisMonth ? (
                  <span className="flex items-center gap-1 font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-300 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('members.paid')} ({member.fundPaidThisMonth >= 1000 ? `${member.fundPaidThisMonth / 1000}k` : `${member.fundPaidThisMonth}đ`})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-black text-amber-800 bg-amber-100 px-2 py-1 rounded-lg border border-amber-300 shrink-0">
                    <XCircle className="w-3.5 h-3.5" /> {t('members.unpaid')}
                  </span>
                )}
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && member._id !== user._id && (
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setEditingMember(member)}
                  className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => updateUserMutation.mutate({
                    id: member._id,
                    role: member.role === 'admin' ? 'member' : (member.role === 'pending' ? 'member' : 'admin')
                  })}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
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
                  className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <EditMemberModal 
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
      />
    </div>
  );
}
