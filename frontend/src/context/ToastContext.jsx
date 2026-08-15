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
      <div className="fixed left-1/2 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-[60] flex w-[calc(100vw-1rem)] max-w-sm -translate-x-1/2 flex-col gap-2 px-0 pointer-events-none sm:top-5 sm:right-5 sm:bottom-auto sm:left-auto sm:w-full sm:translate-x-0 sm:gap-3 sm:max-w-sm">
        {toasts.map((item) => {
          const isSuccess = item.type === 'success';
          const isError = item.type === 'error';
          const isWarning = item.type === 'warning';

          return (
            <div
              key={item.id}
              className={`pointer-events-auto rounded-2xl p-3.5 sm:p-4 border shadow-2xl transition-all duration-300 transform translate-y-0 animate-fade-in flex items-start gap-3 bg-white ${
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
                {isSuccess && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                {isError && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                {isWarning && <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>

              <div className="flex-1 min-w-0 pr-1 sm:pr-2">
                <h4 className="font-black text-[13px] sm:text-sm text-slate-900 leading-snug">{item.title}</h4>
                <p className="text-[11px] sm:text-xs font-bold text-slate-700 mt-0.5 leading-relaxed">{item.message}</p>
              </div>

              <button
                onClick={() => removeToast(item.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
