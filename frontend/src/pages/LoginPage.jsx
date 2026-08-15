import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import coverImage from '../asset/IMG_0922.JPG';
import teamLogo from '../asset/logo.png';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '798271046552-61u7jefpajb2svtkv1p05lssfdgnopq0.apps.googleusercontent.com';

  useEffect(() => {
    // Dynamically load Google Identity Services Script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCallback
        });

        const btnDiv = document.getElementById('googleSignInBtn');
        if (btnDiv) {
          window.google.accounts.id.renderButton(btnDiv, {
            theme: 'filled_blue',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'pill'
          });
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [googleClientId]);

  const handleGoogleCallback = async (response) => {
    setLoading(true);
    setError('');
    try {
      if (response.credential) {
        await loginWithGoogle({ credential: response.credential });
        navigate('/');
      } else {
        setError('Không nhận được credential từ Google');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Đăng nhập Google thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Cover Image Section (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-slate-900 relative overflow-hidden">
        <img src={coverImage} alt="FC Nhà Trẻ Cover" className="absolute inset-0 w-full h-full object-cover opacity-70 hover:opacity-90 transition-opacity duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1f2ca3] via-[#1f2ca3]/40 to-transparent mix-blend-multiply" />
        <div className="absolute bottom-12 left-12 right-12 z-10 text-white drop-shadow-lg">
          <h2 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight">FC Nhà Trẻ</h2>
          <p className="text-lg font-bold text-white/90 max-w-md leading-relaxed">Hệ Thống Quản Lý Đội Bóng. Quản lý tài chính, điểm danh trận đấu và kết nối giao lưu sân 7 chuyên nghiệp.</p>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-4 sm:p-8 relative">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center relative overflow-hidden">

          {/* Top Glow Decor */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#2c3ec4]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl" />

          {/* Logo Header */}
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-[#2c3ec4]/30 mb-4 transform hover:scale-105 transition overflow-hidden border-[3px] border-white">
            <img src={teamLogo} alt="FC Nhà Trẻ Logo" className="w-full h-full object-cover" />
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            FC NHÀ TRẺ
          </h1>
          <p className="text-slate-600 text-xs font-bold mb-8">
            Hệ Thống Quản Lý Đội Bóng, Điểm Danh & Tìm Đối Tác
          </p>

          {error && (
            <div className="mb-6 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Official Google OAuth Button */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div id="googleSignInBtn" className="min-h-[50px] flex items-center justify-center" />
          </div>

          <div className="text-xs text-slate-500 font-semibold border-t border-slate-200 pt-6">
            Chỉ các tài khoản Google đã được phân quyền mới có thể truy cập hệ thống quản trị.
          </div>
        </div>
      </div>
    </div>
  );
}
