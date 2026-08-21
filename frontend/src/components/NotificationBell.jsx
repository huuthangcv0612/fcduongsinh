import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
        setUnreadCount(res.notifications.filter(n => !n.read).length);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-white/90 hover:text-white relative rounded-full transition-colors focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed top-[calc(env(safe-area-inset-top,0px)+58px)] right-3 left-3 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-88 origin-top sm:origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 z-50 border border-slate-200/90 overflow-hidden flex flex-col max-h-[75vh] sm:max-h-96 animate-fade-in">
            {/* Header with Close X Button */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/90 backdrop-blur-sm sticky top-0 flex justify-between items-center z-10">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800">🔔 Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="text-[11px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="tactile-btn p-1.5 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-200/70 hover:bg-slate-200 transition"
                title="Đóng cửa sổ thông báo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400 font-bold">
                  Không có thông báo nào.
                </div>
              ) : (
                notifications.map(notif => (
                  <button
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 ${notif.read ? 'bg-white' : 'bg-blue-50/60'}`}
                  >
                    <div className={`mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full ${notif.read ? 'bg-slate-200' : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm ${notif.read ? 'text-slate-700' : 'text-slate-950 font-black'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold font-mono">
                        {new Date(notif.createdAt).toLocaleString('vi-VN')}
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
