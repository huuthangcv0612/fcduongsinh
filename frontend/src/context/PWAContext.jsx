import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Download, Share, Plus, X, Smartphone } from 'lucide-react';

// ============================================================
// PWA Install Context & Hook
// ============================================================

const PWAContext = createContext(null);

export function usePWA() {
  return useContext(PWAContext);
}

// ---- Platform detection ----
function detectPlatform() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isDesktop = !isIOS && !isAndroid;
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
  const isChromeiOS = /CriOS/.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  return { isIOS, isAndroid, isDesktop, isSafari, isChromeiOS, isStandalone };
}

// ============================================================
// iOS Install Guide Modal
// ============================================================
function IOSGuideModal({ onClose, isChromeiOS }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1f2ca3] to-[#2c3ec4] px-5 pt-5 pb-4 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md">
              <img src="/icons/icon-96.png" alt="FC Nhà Trẻ" className="w-8 h-8 object-cover rounded-xl" />
            </div>
            <div>
              <div className="font-black text-base">FC Nhà Trẻ</div>
              <div className="text-xs text-white/80 font-bold">Cài lên màn hình chính</div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-5 space-y-4">
          {isChromeiOS ? (
            // Chrome on iOS instructions
            <>
              <p className="text-xs text-slate-500 font-bold text-center">
                Bạn đang dùng <span className="text-blue-600">Chrome trên iPhone/iPad</span>.<br/>
                Hãy dùng Safari để cài đặt tốt hơn.
              </p>
              <div className="space-y-3">
                {[
                  { icon: '🌐', text: 'Sao chép link và mở bằng Safari' },
                  { icon: '⬆️', text: 'Nhấn nút Chia sẻ (hình vuông có mũi tên lên)' },
                  { icon: '➕', text: 'Chọn "Thêm vào Màn hình chính"' },
                  { icon: '✅', text: 'Nhấn "Thêm" để xác nhận' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xl shrink-0">{step.icon}</span>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            // Safari on iOS instructions
            <>
              <p className="text-xs text-slate-500 font-bold text-center">
                Làm theo 3 bước đơn giản để cài ứng dụng lên màn hình chính:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <Share className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-blue-900">Bước 1: Nhấn nút Chia sẻ</p>
                    <p className="text-xs text-blue-700 font-bold mt-0.5">
                      Biểu tượng <strong>⬆️</strong> ở thanh công cụ dưới Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-200">
                  <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-indigo-900">Bước 2: Chọn "Thêm vào Màn hình chính"</p>
                    <p className="text-xs text-indigo-700 font-bold mt-0.5">
                      Cuộn xuống trong menu chia sẻ và tìm tùy chọn này
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white font-black text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-900">Bước 3: Nhấn "Thêm"</p>
                    <p className="text-xs text-emerald-700 font-bold mt-0.5">
                      Xác nhận và icon FC Nhà Trẻ sẽ xuất hiện trên màn hình chính!
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow pointing down for mobile */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                  <span>Nút Chia sẻ ở đây</span>
                  <span className="text-lg">⬇️</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm transition border border-slate-200"
          >
            Đã hiểu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Install Button Component
// ============================================================
export function PWAInstallButton({ className = '' }) {
  const pwa = usePWA();
  if (!pwa || !pwa.canInstall) return null;

  const { isIOS, isChromeiOS, deferredPrompt, handleInstall, setShowIOSGuide } = pwa;

  if (isIOS || isChromeiOS) {
    return (
      <button
        id="pwa-install-btn"
        onClick={() => setShowIOSGuide(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-black transition ${className}`}
        title="Cài ứng dụng lên màn hình chính"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Cài ứng dụng</span>
      </button>
    );
  }

  if (deferredPrompt) {
    return (
      <button
        id="pwa-install-btn"
        onClick={handleInstall}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-black transition ${className}`}
        title="Cài FC Nhà Trẻ như một ứng dụng"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Cài ứng dụng</span>
      </button>
    );
  }

  return null;
}

// ============================================================
// PWA Provider
// ============================================================
export function PWAProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform] = useState(() => detectPlatform());

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('[PWA] Service Worker registered:', reg.scope))
          .catch((err) => console.warn('[PWA] SW registration failed:', err));
      });
    }
  }, []);

  // Listen for beforeinstallprompt (Chrome/Edge on Windows & Android)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Listen for appinstalled
  useEffect(() => {
    const handler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('[PWA] App installed successfully!');
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  // Handle install click (Windows/Android Chrome)
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  // Determine if the install button should be visible
  const canInstall = !platform.isStandalone && !isInstalled && (
    !!deferredPrompt ||        // Chrome/Edge/Android
    platform.isIOS ||          // Safari iOS
    platform.isChromeiOS       // Chrome on iOS (manual guide)
  );

  const value = {
    ...platform,
    deferredPrompt,
    isInstalled,
    canInstall,
    handleInstall,
    showIOSGuide,
    setShowIOSGuide,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
      {/* Global iOS Guide Modal - rendered at root level */}
      {showIOSGuide && (
        <IOSGuideModal onClose={() => setShowIOSGuide(false)} isChromeiOS={platform.isChromeiOS} />
      )}
    </PWAContext.Provider>
  );
}
