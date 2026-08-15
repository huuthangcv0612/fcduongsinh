import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Download, Share, Plus, X, Smartphone, Monitor, QrCode } from 'lucide-react';

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

  return { isIOS, isAndroid, isDesktop, isSafari, isChromeiOS, isStandalone };
}

// ============================================================
// iOS Install Guide Modal (for iOS / Chrome on iOS)
// ============================================================
function IOSGuideModal({ onClose, isChromeiOS }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-fade-in">
        <div className="bg-gradient-to-r from-[#1f2ca3] to-[#2c3ec4] px-5 pt-5 pb-4 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md">
              <img src="/icons/icon-96.png" alt="FC Nhà Trẻ" className="w-8 h-8 object-cover rounded-xl" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div>
              <div className="font-black text-base">FC Nhà Trẻ</div>
              <div className="text-xs text-white/80 font-bold">Cài lên màn hình chính</div>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {isChromeiOS ? (
            <p className="text-xs text-slate-500 font-bold text-center">Mở link bằng <strong>Safari</strong> để cài đặt được nhé.</p>
          ) : (
            [
              { icon: '⬆️', title: 'Bước 1: Nhấn nút Chia sẻ', desc: 'Biểu tượng ở thanh dưới Safari' },
              { icon: '➕', title: 'Bước 2: Chọn "Thêm vào Màn hình chính"', desc: 'Cuộn xuống trong menu chia sẻ' },
              { icon: '✅', title: 'Bước 3: Nhấn "Thêm"', desc: 'Icon FC Nhà Trẻ sẽ xuất hiện ngay!' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xl shrink-0">{s.icon}</span>
                <div>
                  <p className="text-sm font-black text-slate-800">{s.title}</p>
                  <p className="text-xs text-slate-500 font-bold">{s.desc}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm transition">Đóng lại</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Desktop Install Guide Modal (Android + iOS instructions)
// ============================================================
function DesktopInstallModal({ onClose, onNativeInstall, hasNativePrompt }) {
  const [activeTab, setActiveTab] = useState(hasNativePrompt ? 'desktop' : 'android');
  const appUrl = window.location.origin;

  const tabs = [
    ...(hasNativePrompt ? [{ id: 'desktop', label: '💻 Máy tính', emoji: '💻' }] : []),
    { id: 'android', label: '🤖 Android', emoji: '🤖' },
    { id: 'ios', label: '🍎 iPhone / iPad', emoji: '🍎' },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1f2ca3] to-[#2c3ec4] px-6 pt-6 pb-5 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
              <img src="/icons/icon-96.png" alt="FC Nhà Trẻ" className="w-12 h-12 object-cover rounded-xl" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div>
              <h2 className="text-xl font-black">FC Nhà Trẻ</h2>
              <p className="text-white/80 text-sm font-bold">Cài đặt ứng dụng — chọn thiết bị của bạn</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-black transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#2c3ec4] text-[#2c3ec4] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Desktop Tab */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-600 text-center">
                Trình duyệt của bạn hỗ trợ cài đặt ứng dụng trực tiếp!
              </p>
              <button
                onClick={() => { onNativeInstall(); onClose(); }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#1f2ca3] to-[#2c3ec4] hover:from-[#2c3ec4] hover:to-[#374df5] text-white font-black text-base shadow-lg transition flex items-center justify-center gap-3"
              >
                <Download className="w-5 h-5" />
                Cài FC Nhà Trẻ ngay
              </button>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 font-bold text-center">
                Hoặc mở trên điện thoại → chọn tab Android / iPhone để cài lên màn hình chính 📱
              </div>
            </div>
          )}

          {/* Android Tab */}
          {activeTab === 'android' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-bold text-center mb-4">
                Mở link <span className="font-black text-[#2c3ec4]">{appUrl}</span> trên Chrome Android
              </p>
              {[
                { step: '1', icon: '🌐', title: 'Mở Chrome trên Android', desc: 'Truy cập ' + appUrl },
                { step: '2', icon: '⋮', title: 'Nhấn menu 3 chấm (⋮)', desc: 'Góc phải trên thanh địa chỉ Chrome' },
                { step: '3', icon: '📲', title: 'Chọn "Thêm vào màn hình chính"', desc: 'Hoặc "Cài đặt ứng dụng" nếu có' },
                { step: '4', icon: '✅', title: 'Nhấn "Thêm" để xác nhận', desc: 'Icon FC Nhà Trẻ sẽ xuất hiện trên Home Screen' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl border border-green-200">
                  <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">{s.step}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-slate-800">{s.icon} {s.title}</div>
                    <div className="text-xs text-slate-500 font-bold">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* iOS Tab */}
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-bold text-center mb-4">
                Mở link <span className="font-black text-[#2c3ec4]">{appUrl}</span> trên Safari iOS
              </p>
              {[
                { step: '1', icon: '🌐', title: 'Mở Safari trên iPhone/iPad', desc: 'Bắt buộc dùng Safari (không dùng Chrome)' },
                { step: '2', icon: '⬆️', title: 'Nhấn nút Chia sẻ', desc: 'Biểu tượng vuông có mũi tên lên ở dưới màn hình' },
                { step: '3', icon: '➕', title: 'Chọn "Thêm vào Màn hình chính"', desc: 'Cuộn xuống trong menu chia sẻ để tìm' },
                { step: '4', icon: '✅', title: 'Nhấn "Thêm"', desc: 'Icon FC Nhà Trẻ xuất hiện trên màn hình chính!' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="w-8 h-8 bg-[#1f2ca3] rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">{s.step}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-slate-800">{s.icon} {s.title}</div>
                    <div className="text-xs text-slate-500 font-bold">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm transition">
            Đóng lại
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

  const { isIOS, isChromeiOS, isStandalone, isInstalled, isDesktop, deferredPrompt, handleInstall, setShowIOSGuide, setShowDesktopModal } = pwa;

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

  // Android Chrome with native prompt
  if (!isDesktop && deferredPrompt) {
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

  // Desktop → always show button to open the install guide modal
  if (isDesktop) {
    return (
      <button
        id="pwa-install-btn"
        onClick={() => setShowDesktopModal(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-black transition ${className}`}
        title="Tải ứng dụng FC Nhà Trẻ"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Tải app</span>
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
  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform] = useState(() => detectPlatform());
  const promptRef = useRef(null);

  // Register Service Worker immediately
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA] SW registered:', reg.scope))
        .catch((err) => console.warn('[PWA] SW failed:', err));
    }
  }, []);

  // Capture beforeinstallprompt as early as possible (global)
  useEffect(() => {
    const earlyHandler = (e) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', earlyHandler);
    return () => window.removeEventListener('beforeinstallprompt', earlyHandler);
  }, []);

  // React state listener
  useEffect(() => {
    // Check if already captured before mount
    if (window.__pwaInstallPrompt) {
      promptRef.current = window.__pwaInstallPrompt;
      setDeferredPrompt(window.__pwaInstallPrompt);
    }

    const handler = (e) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt captured in React');
      promptRef.current = e;
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
      setShowDesktopModal(false);
      promptRef.current = null;
      window.__pwaInstallPrompt = null;
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  // Handle native install click
  const handleInstall = useCallback(async () => {
    const prompt = promptRef.current || deferredPrompt;
    if (!prompt) return;
    try {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
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
    showDesktopModal,
    setShowDesktopModal,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <IOSGuideModal
          onClose={() => setShowIOSGuide(false)}
          isChromeiOS={platform.isChromeiOS}
        />
      )}

      {/* Desktop Install Guide Modal */}
      {showDesktopModal && (
        <DesktopInstallModal
          onClose={() => setShowDesktopModal(false)}
          onNativeInstall={handleInstall}
          hasNativePrompt={!!deferredPrompt}
        />
      )}
    </PWAContext.Provider>
  );
}
