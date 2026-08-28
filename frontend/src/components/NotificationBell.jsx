import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X, ExternalLink, Clock, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
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
    
    // Mark as read immediately in state & call API
    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark as read', error);
      }
    }

    // Open detail modal with the full notification details
    setSelectedNotif(notification);
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

  const getNotificationTypeInfo = (type) => {
    switch (type) {
      case 'match':
        return {
          icon: <span className="text-base sm:text-lg">⚽</span>,
          label: 'Trận đấu',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          badgeBg: 'bg-emerald-500'
        };
      case 'fund':
      case 'finance':
        return {
          icon: <span className="text-base sm:text-lg">💰</span>,
          label: 'Quỹ & Tài chính',
          color: 'bg-amber-50 text-amber-700 border-amber-200/80',
          badgeBg: 'bg-amber-500'
        };
      case 'mvp':
        return {
          icon: <span className="text-base sm:text-lg">👑</span>,
          label: 'Bầu chọn MVP',
          color: 'bg-purple-50 text-purple-700 border-purple-200/80',
          badgeBg: 'bg-purple-500'
        };
      case 'admin':
        return {
          icon: <span className="text-base sm:text-lg">📢</span>,
          label: 'Ban Quản Trị',
          color: 'bg-blue-50 text-blue-700 border-blue-200/80',
          badgeBg: 'bg-blue-600'
        };
      default:
        return {
          icon: <span className="text-base sm:text-lg">🔔</span>,
          label: 'Hệ thống',
          color: 'bg-slate-50 text-slate-700 border-slate-200/80',
          badgeBg: 'bg-slate-500'
        };
    }
  };

  const renderFormattedMessage = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-semibold break-all inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
            <ExternalLink className="w-3 h-3 inline-block ml-0.5" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 relative rounded-full transition-colors focus:outline-none touch-manipulation"
        title="Thông báo"
        type="button"
        aria-label="Thông báo"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-[#2c3ec4] animate-pulse">
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
          <div className="fixed top-[calc(env(safe-area-inset-top,0px)+58px)] right-2 left-2 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 w-auto sm:w-[420px] sm:max-w-[440px] origin-top sm:origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 z-50 border border-slate-200/90 overflow-hidden flex flex-col max-h-[min(78dvh,32rem)] sm:max-h-[32rem] animate-fade-in overscroll-contain">
            
            {/* Header */}
            <div className="px-3.5 py-3 sm:px-4 sm:py-3 border-b border-slate-100 bg-slate-50/95 backdrop-blur-sm sticky top-0 flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h3 className="text-sm font-black text-slate-900 whitespace-nowrap">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {unreadCount} mới
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 active:bg-blue-100 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap touch-manipulation min-h-[36px]"
                    title="Đánh dấu tất cả đã đọc"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đọc tất cả</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:bg-slate-300/70 transition touch-manipulation"
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
                notifications.map(notif => {
                  const typeInfo = getNotificationTypeInfo(notif.type);
                  return (
                    <button
                      key={notif._id}
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left px-3.5 py-3 sm:px-4 sm:py-3.5 hover:bg-slate-50/90 active:bg-slate-100 transition-colors flex gap-3 items-start group touch-manipulation ${
                        notif.read ? 'bg-white' : 'bg-blue-50/40 hover:bg-blue-50/70'
                      }`}
                    >
                      {/* Notification Type Icon */}
                      <div className={`mt-0.5 flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border shadow-2xs ${
                        notif.read
                          ? 'bg-slate-100 border-slate-200 text-slate-500'
                          : 'bg-blue-100/80 border-blue-200 text-blue-600'
                      }`}>
                        {typeInfo.icon}
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className={`text-xs sm:text-sm leading-snug line-clamp-2 break-words ${notif.read ? 'text-slate-700 font-semibold' : 'text-slate-950 font-black'}`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1 shadow-sm" />
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed break-words">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between mt-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(notif.createdAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </span>

                          <span className="text-[10px] font-bold text-blue-600 group-hover:underline flex items-center gap-0.5">
                            Xem chi tiết ➔
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Notification Detail Modal */}
      {selectedNotif && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in overscroll-contain"
          onClick={() => setSelectedNotif(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100/90 overflow-hidden flex flex-col max-h-[88dvh] sm:max-h-[85vh] my-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-b from-slate-50/90 to-white">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center shrink-0">
                  {getNotificationTypeInfo(selectedNotif.type).icon}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className={`text-[10px] sm:text-[11px] font-black px-2 sm:px-2.5 py-0.5 rounded-full border ${getNotificationTypeInfo(selectedNotif.type).color}`}>
                      {getNotificationTypeInfo(selectedNotif.type).label}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-400 font-medium">
                      <Clock className="w-3 h-3 shrink-0" />
                      {new Date(selectedNotif.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-full transition touch-manipulation shrink-0"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug break-words">
                {selectedNotif.title}
              </h2>

              <div className="bg-slate-50/80 border border-slate-100 rounded-xl sm:rounded-2xl p-3.5 sm:p-5">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words font-medium">
                  {renderFormattedMessage(selectedNotif.message)}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50/95 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 pb-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 active:bg-slate-200 rounded-xl transition flex items-center justify-center touch-manipulation"
              >
                Đóng
              </button>

              {selectedNotif.link && (
                <button
                  type="button"
                  onClick={() => {
                    const link = selectedNotif.link;
                    setSelectedNotif(null);
                    if (link.startsWith('http://') || link.startsWith('https://')) {
                      window.open(link, '_blank');
                    } else {
                      navigate(link);
                    }
                  }}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] px-5 py-2.5 text-xs sm:text-sm font-black text-white bg-[#2c3ec4] hover:bg-[#1f2ca3] active:bg-[#192482] shadow-md hover:shadow-lg rounded-xl transition flex items-center justify-center gap-2 touch-manipulation"
                >
                  <span>Xem liên kết chi tiết</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

