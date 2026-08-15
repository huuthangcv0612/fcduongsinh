import React, { createContext, useContext, useState, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const ConfirmModalContext = createContext(null);

export function ConfirmModalProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác Nhận',
    cancelText: 'Hủy',
    type: 'danger' // 'danger' | 'warning' | 'info'
  });

  const resolverRef = useRef(null);

  const confirm = ({ title, message, confirmText = 'Xác Nhận', cancelText = 'Hủy', type = 'danger' }) => {
    setModalState({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type
    });

    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmModalContext.Provider value={confirm}>
      {children}

      {/* Confirmation Pop-Up Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 sm:p-7 text-center relative overflow-hidden bg-white border-2 border-rose-400 shadow-2xl">
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon Badge */}
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-md ${
              modalState.type === 'danger'
                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                : 'bg-amber-100 text-amber-700 border border-amber-300'
            }`}>
              {modalState.type === 'danger' ? <Trash2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
            </div>

            {/* Content */}
            <h3 className="text-xl font-black text-slate-900 mb-2">
              {modalState.title}
            </h3>
            <p className="text-slate-700 text-xs sm:text-sm font-bold mb-6 leading-relaxed">
              {modalState.message}
            </p>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCancel}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs sm:text-sm border border-slate-300 transition"
              >
                {modalState.cancelText}
              </button>

              <button
                onClick={handleConfirm}
                className={`py-3 px-4 rounded-2xl text-white font-black text-xs sm:text-sm shadow-md transition transform hover:-translate-y-0.5 ${
                  modalState.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                }`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmModalContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmModalContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmModalProvider');
  }
  return context;
}
