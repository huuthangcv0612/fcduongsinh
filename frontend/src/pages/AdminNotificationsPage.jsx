import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';

export default function AdminNotificationsPage() {
  const { isAdmin } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [recipients, setRecipients] = useState([]); // Empty means 'all'
  const [status, setStatus] = useState(''); // 'loading', 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users')
  });
  const users = usersRes?.data || [];

  const handleToggleRecipient = (userId) => {
    setRecipients(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex justify-center p-8 text-red-500 font-bold">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !message) return;
    
    setStatus('loading');
    try {
      const res = await api.post('/notifications/admin-send', { 
        title, 
        message, 
        link,
        recipients 
      });
      if (res.success) {
        setStatus('success');
        setTitle('');
        setMessage('');
        setLink('');
        setRecipients([]);
        setTimeout(() => setStatus(''), 3000);
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMsg(error.message || 'Lỗi gửi thông báo');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-[#1f2ca3] rounded-2xl p-6 text-white shadow-xl">
        <h1 className="text-2xl font-black mb-2 flex items-center gap-2">
          📢 Gửi thông báo toàn hệ thống
        </h1>
        <p className="text-white/80 text-sm">
          Tính năng dành cho Ban Quản Trị để đẩy thông báo khẩn cấp hoặc tin tức tới toàn bộ thành viên.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        {status === 'success' && (
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm font-medium border border-emerald-200">
            ✅ Đã gửi thông báo thành công!
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-200">
            ❌ {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Tiêu đề <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 bg-white text-slate-900 font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#2c3ec4] focus:border-[#2c3ec4] outline-none transition"
            placeholder="Ví dụ: Họp team cuối năm..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Nội dung <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows="4"
            className="w-full px-4 py-2 bg-white text-slate-900 font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#2c3ec4] focus:border-[#2c3ec4] outline-none transition"
            placeholder="Nội dung chi tiết..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Đường dẫn (Link tuỳ chọn)
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-white text-slate-900 font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#2c3ec4] focus:border-[#2c3ec4] outline-none transition text-sm"
            placeholder="Ví dụ: /matches (hoặc để trống)"
            value={link}
            onChange={e => setLink(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Người dùng click vào thông báo sẽ được chuyển hướng tới trang này.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Người nhận ({recipients.length === 0 ? 'Tất cả thành viên' : `${recipients.length} người`})
          </label>
          <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-xl p-3 space-y-2 bg-slate-50">
            <label className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition">
              <input 
                type="checkbox"
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                checked={recipients.length === 0}
                onChange={() => setRecipients([])}
              />
              <span className="text-sm font-bold text-slate-800">Tất cả thành viên</span>
            </label>
            <div className="h-px bg-slate-200 my-1" />
            {users.map(u => (
              <label key={u._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition">
                <input 
                  type="checkbox"
                  className="w-4 h-4 text-[#2c3ec4] rounded border-slate-300 focus:ring-[#2c3ec4]"
                  checked={recipients.includes(u._id)}
                  onChange={() => handleToggleRecipient(u._id)}
                />
                <div className="flex items-center gap-2">
                  <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-sm font-semibold text-slate-700">{u.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white font-bold py-3 rounded-xl shadow-md transition disabled:opacity-50"
          >
            {status === 'loading' ? 'Đang gửi...' : '🚀 Gửi Thông Báo'}
          </button>
        </div>
      </form>
    </div>
  );
}
