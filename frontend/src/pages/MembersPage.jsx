import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmModalContext';
import { CheckCircle2, XCircle, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import EditMemberModal from '../components/EditMemberModal';

export default function MembersPage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
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
            👥 Danh Sách Thành Viên ({users.length})
          </h2>
          <p className="text-xs font-bold text-slate-600">
            Theo dõi danh sách đội bóng, vị trí thi đấu & trạng thái đóng quỹ tháng
          </p>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map((member) => (
          <div
            key={member._id}
            className="glass-panel rounded-3xl p-5 border border-slate-200 hover:border-emerald-400 transition shadow-md flex flex-col justify-between bg-white"
          >
            <div>
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={member.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                />
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                    {member.name}
                    {member.role === 'admin' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] uppercase font-mono font-bold">
                        Admin
                      </span>
                    )}
                    {member.role === 'pending' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] uppercase font-mono font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Chờ Duyệt
                      </span>
                    )}
                  </h3>
                  <div className="text-xs font-bold text-slate-500">{member.email}</div>
                  <div className="text-xs font-black text-emerald-700 mt-1">
                    Vị trí: {member.position || 'Tự do'}
                  </div>
                </div>
              </div>

              {/* Fund Status Badge */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-4 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Quỹ tháng này:</span>
                {member.isFundPaidThisMonth ? (
                  <span className="flex items-center gap-1 font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ĐÃ NỘP ({member.fundPaidThisMonth >= 1000 ? `${member.fundPaidThisMonth / 1000}k` : `${member.fundPaidThisMonth}đ`})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300">
                    <XCircle className="w-3.5 h-3.5" /> CHƯA NỘP
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
                  {member.role === 'pending' ? 'Duyệt Thành Viên' : (member.role === 'admin' ? 'Hạ xuống Member' : 'Thăng cấp Admin')}
                </button>
                <button
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: 'Xóa thành viên',
                      message: `Bạn có chắc chắn muốn xóa tài khoản ${member.name}? Dữ liệu sẽ không thể khôi phục.`
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
