import React, { useState, useEffect } from 'react';
import { X, Save, User, MapPin, Phone } from 'lucide-react';
import api from '../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function EditMemberModal({ isOpen, onClose, member }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: '', position: '', phone: '' });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        position: member.position || '',
        phone: member.phone || ''
      });
    }
  }, [member]);

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/users/${member._id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    }
  });

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2">Chỉnh sửa thành viên</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tên cầu thủ</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Vị trí thi đấu</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-900 appearance-none"
              >
                <option value="">-- Chọn vị trí --</option>
                <option value="Tiền đạo">Tiền đạo</option>
                <option value="Tiền vệ">Tiền vệ</option>
                <option value="Hậu vệ">Hậu vệ</option>
                <option value="Thủ môn">Thủ môn</option>
                <option value="Tự do">Tự do</option>
                <option value="Quản lý">Quản lý / Khác</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Số điện thoại</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 rounded-xl hover:bg-slate-200">
            Hủy
          </button>
          <button 
            onClick={() => updateMutation.mutate(formData)}
            disabled={updateMutation.isPending}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
