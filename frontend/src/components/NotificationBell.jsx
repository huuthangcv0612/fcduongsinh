import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X, Sparkles, Calendar, DollarSign, Trophy } from 'lucide-react';
import api from '../services/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    // Auto refresh notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    // Listen for new push notifications from Service Worker
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'NEW_NOTIFICATION') {
        fetchNotifications();
      }
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    // Close dropdown on outside click
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount((res.notifications || []).filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    setIsOpen(false);
    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark as read', error);
      }
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'match':
        return <span className="text-base">⚽</span>;
      case 'fund':
      case 'finance':
        return <span className="text-base">💰</span>;
      case 'mvp':
        return <span className="text-base">👑</span>;
      default:
        return <span className="text-base">🔔</span>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-white/90 hover:text-white hover:bg-white/10 relative rounded-full transition-colors focus:outline-none"
        title="Thông báo"
        type="button"
      >
        <Bell className="w-5 h-5 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-[#2c3ec4]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden animate-fade-in overscroll-contain"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Container */}
          <div className="fixed top-[calc(env(safe-area-inset-top,0px)+56px)] right-3 left-3 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 w-auto sm:w-[380px] sm:min-w-[380px] sm:max-w-[400px] origin-top sm:origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 z-50 border border-slate-200 overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[30rem] animate-fade-in overscroll-contain">
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/95 backdrop-blur-sm sticky top-0 flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h3 className="text-sm font-black text-slate-900 whitespace-nowrap">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {unreadCount} mới
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition whitespace-nowrap"
                    title="Đánh dấu tất cả đã đọc"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đọc tất cả</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 overscroll-contain">
              {notifications.length === 0 ? (
                <div className="px-4 py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
                    <Bell className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">Chưa có thông báo nào</p>
                  <p className="text-xs text-slate-400 mt-0.5">Các thông báo trận đấu, quỹ, MVP sẽ xuất hiện ở đây.</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <button
                    key={notif._id}
                    type="button"
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 items-start ${
                      notif.read ? 'bg-white' : 'bg-blue-50/50 hover:bg-blue-50/80'
                    }`}
                  >
                    {/* Notification Type Icon */}
                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs ${
                      notif.read
                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                        : 'bg-blue-100 border-blue-200 text-blue-600'
                    }`}>
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs sm:text-sm truncate ${notif.read ? 'text-slate-700 font-semibold' : 'text-slate-950 font-black'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 shadow-sm" />
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {new Date(notif.createdAt).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
