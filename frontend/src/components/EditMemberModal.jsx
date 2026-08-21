import React, { useState, useEffect } from 'react';
import { X, Save, User, MapPin, Phone, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function EditMemberModal({ isOpen, onClose, member }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    roles: ['member'],
    isActive: true
  });

  useEffect(() => {
    if (member) {
      const initialRoles = Array.isArray(member.roles) && member.roles.length > 0
        ? member.roles
        : (member.role ? [member.role] : ['member']);

      setFormData({
        name: member.name || '',
        position: member.position || '',
        phone: member.phone || '',
        roles: initialRoles,
        isActive: member.isActive !== false
      });
    }
  }, [member]);

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/users/${member._id}`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (res?.data && user?._id === member._id) {
        localStorage.setItem('user', JSON.stringify(res.data));
        window.dispatchEvent(new Event('storage'));
      }
      onClose();
    }
  });

  const toggleRole = (roleKey) => {
    let currentRoles = [...formData.roles];
    if (currentRoles.includes(roleKey)) {
      if (currentRoles.length === 1) return; // Must have at least 1 role
      currentRoles = currentRoles.filter(r => r !== roleKey);
    } else {
      currentRoles.push(roleKey);
    }
    setFormData({ ...formData, roles: currentRoles });
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
          <h2 className="font-black text-sm flex items-center gap-2">
            <span>✏️ {t('edit_member.title')}</span>
          </h2>
          <button onClick={onClose} className="tactile-btn hover:bg-white/20 p-1.5 rounded-xl transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">{t('edit_member.player_name')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">{t('edit_member.position')}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-900"
              >
                <option value="">{t('edit_member.select_position')}</option>
                <option value="Tiền đạo">{t('edit_member.striker')}</option>
                <option value="Tiền vệ">{t('edit_member.midfielder')}</option>
                <option value="Hậu vệ">{t('edit_member.defender')}</option>
                <option value="Thủ môn">{t('edit_member.goalkeeper')}</option>
                <option value="Tự do">{t('edit_member.free_agent')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">{t('edit_member.phone')}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0901234567"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Role Multi-Select (Admin Only) */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Phân Quyền Vai Trò (Đa Role)</span>
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes('admin')}
                    onChange={() => toggleRole('admin')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-black text-slate-900 block">👑 Ban Quản Trị (Admin)</span>
                    <span className="text-[10px] text-slate-500 font-bold">Toàn quyền cấu hình trận đấu, điểm danh, phân quyền</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50/50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes('treasurer')}
                    onChange={() => toggleRole('treasurer')}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-black text-purple-900 block">💰 Thủ Quỹ (Treasurer)</span>
                    <span className="text-[10px] text-slate-500 font-bold">Quản lý quỹ, duyệt bill chuyển khoản, cập nhật thu/chi</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes('member')}
                    onChange={() => toggleRole('member')}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-black text-emerald-900 block">⚽ Cầu Thủ (Member)</span>
                    <span className="text-[10px] text-slate-500 font-bold">Tham gia điểm danh, vote MVP, nộp quỹ</span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="tactile-btn px-4 py-2 text-xs font-black text-slate-600 rounded-xl hover:bg-slate-200 transition"
          >
            {t('edit_member.cancel')}
          </button>
          <button 
            onClick={() => updateMutation.mutate(formData)}
            disabled={updateMutation.isPending}
            className="tactile-btn px-5 py-2 bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{updateMutation.isPending ? 'Đang lưu...' : t('edit_member.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
