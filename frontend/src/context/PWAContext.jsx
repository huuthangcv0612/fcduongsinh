import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Download, Share, Plus, X, Smartphone, Monitor } from 'lucide-react';

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
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua) && !/EdgA/.test(ua);
  const isChromeiOS = /CriOS/.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  // Supports PWA install prompt
  const supportsInstallPrompt = 'BeforeInstallPromptEvent' in window || /Chrome/.test(ua) || /Edg/.test(ua);

  return { isIOS, isAndroid, isDesktop, isSafari, isChromeiOS, isStandalone, supportsInstallPrompt };
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
              <img src="/icons/icon-96.png" alt="FC Nhà Trẻ" className="w-8 h-8 object-cover rounded-xl" onError={(e) => { e.target.style.display='none'; }} />
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
            <>
              <p className="text-xs text-slate-500 font-bold text-center">
                Bạn đang dùng <span className="text-blue-600">Chrome trên iPhone/iPad</span>.<br />
                Hãy mở link này bằng <strong>Safari</strong> để cài đặt.
              </p>
              <div className="space-y-3">
                {[
                  { icon: '🌐', text: 'Sao chép link, mở Safari và dán vào' },
                  { icon: '⬆️', text: 'Nhấn nút Chia sẻ (vuông có mũi tên lên)' },
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
            <>
              <p className="text-xs text-slate-500 font-bold text-center">
                Làm theo 3 bước để cài app lên màn hình chính:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-blue-900">Bước 1: Nhấn nút Chia sẻ ⬆️</p>
                    <p className="text-xs text-blue-700 font-bold mt-0.5">Ở thanh công cụ dưới cùng Safari</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-200">
                  <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-indigo-900">Bước 2: Chọn "Thêm vào Màn hình chính"</p>
                    <p className="text-xs text-indigo-700 font-bold mt-0.5">Cuộn xuống trong menu chia sẻ</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-900">Bước 3: Nhấn "Thêm"</p>
                    <p className="text-xs text-emerald-700 font-bold mt-0.5">Icon FC Nhà Trẻ sẽ xuất hiện ngay!</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-bold pt-1">
                <span>Nút Chia sẻ ở thanh dưới Safari</span>
                <span className="text-lg">⬇️</span>
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
  if (!pwa) return null;

  const { isIOS, isChromeiOS, isStandalone, isInstalled, deferredPrompt, handleInstall, setShowIOSGuide } = pwa;

  // Never show when already running as app
  if (isStandalone || isInstalled) return null;

  // iOS / Chrome iOS → show guide button
  if (isIOS || isChromeiOS) {
    return (
      <button
        id="pwa-install-btn"
        onClick={() => setShowIOSGuide(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-black transition ${className}`}
        title="Cài ứng dụng lên màn hình chính"
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Cài app</span>
      </button>
    );
  }

  // Chrome/Edge Desktop/Android → native prompt available
  if (deferredPrompt) {
    return (
      <button
        id="pwa-install-btn"
        onClick={handleInstall}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-black transition ${className}`}
        title="Cài FC Nhà Trẻ như ứng dụng native"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Cài app</span>
      </button>
    );
  }

  // Desktop Chrome/Edge but prompt hasn't fired yet (e.g. already dismissed, or needs more page interaction)
  // Show a subtle hint only on Desktop
  if (pwa.isDesktop) {
    return (
      <button
        id="pwa-install-hint-btn"
        onClick={() => {
          // Try to trigger via menu hint
          window.open('', '_self'); // focus
          if (pwa.deferredPrompt) pwa.handleInstall();
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white text-xs font-bold transition ${className}`}
        title="Mở menu trình duyệt → Cài đặt ứng dụng"
      >
        <Monitor className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Cài app</span>
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
  const promptRef = useRef(null);

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register immediately, don't wait for load event (page may already be loaded in React)
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA] SW registered:', reg.scope))
        .catch((err) => console.warn('[PWA] SW failed:', err));
    }
  }, []);

  // Listen for beforeinstallprompt (Chrome/Edge on Windows & Android)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt captured');
      promptRef.current = e;
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Also check if already captured before React mounted
    if (window.__pwaInstallPrompt) {
      promptRef.current = window.__pwaInstallPrompt;
      setDeferredPrompt(window.__pwaInstallPrompt);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Store prompt globally so it survives React re-renders
  useEffect(() => {
    const earlyHandler = (e) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', earlyHandler);
    return () => window.removeEventListener('beforeinstallprompt', earlyHandler);
  }, []);

  // Listen for appinstalled
  useEffect(() => {
    const handler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      promptRef.current = null;
      window.__pwaInstallPrompt = null;
      console.log('[PWA] App installed!');
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  // Handle install click (Windows/Android Chrome)
  const handleInstall = useCallback(async () => {
    const prompt = promptRef.current || deferredPrompt;
    if (!prompt) return;
    try {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      console.log('[PWA] outcome:', outcome);
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (err) {
      console.warn('[PWA] prompt error:', err);
    }
    setDeferredPrompt(null);
    promptRef.current = null;
  }, [deferredPrompt]);

  const value = {
    ...platform,
    deferredPrompt,
    isInstalled,
    handleInstall,
    showIOSGuide,
    setShowIOSGuide,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
      {showIOSGuide && (
        <IOSGuideModal onClose={() => setShowIOSGuide(false)} isChromeiOS={platform.isChromeiOS} />
      )}
    </PWAContext.Provider>
  );
}
