import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, title) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, title }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message, title = 'Thành công') => addToast('success', message, title),
    error: (message, title = 'Có lỗi xảy ra') => addToast('error', message, title),
    warning: (message, title = 'Chú ý') => addToast('warning', message, title),
    info: (message, title = 'Thông báo') => addToast('info', message, title),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Floating Toast Notification Pop-Up Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((item) => {
          const isSuccess = item.type === 'success';
          const isError = item.type === 'error';
          const isWarning = item.type === 'warning';

          return (
            <div
              key={item.id}
              className={`pointer-events-auto rounded-2xl p-4 border shadow-2xl transition-all duration-300 transform translate-y-0 animate-fade-in flex items-start gap-3 bg-white ${
                isSuccess
                  ? 'border-emerald-500 text-slate-900 shadow-emerald-500/20'
                  : isError
                  ? 'border-rose-500 text-slate-900 shadow-rose-500/20'
                  : isWarning
                  ? 'border-amber-500 text-slate-900 shadow-amber-500/20'
                  : 'border-cyan-500 text-slate-900 shadow-cyan-500/20'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                isSuccess
                  ? 'bg-emerald-100 text-emerald-700'
                  : isError
                  ? 'bg-rose-100 text-rose-700'
                  : isWarning
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-cyan-100 text-cyan-700'
              }`}>
                {isSuccess && <CheckCircle2 className="w-5 h-5" />}
                {isError && <AlertCircle className="w-5 h-5" />}
                {isWarning && <AlertTriangle className="w-5 h-5" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <h4 className="font-black text-sm text-slate-900 leading-snug">{item.title}</h4>
                <p className="text-xs font-bold text-slate-700 mt-0.5 leading-relaxed">{item.message}</p>
              </div>

              <button
                onClick={() => removeToast(item.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
