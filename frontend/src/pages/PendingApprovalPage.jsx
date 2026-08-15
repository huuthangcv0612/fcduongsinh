import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function PendingApprovalPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-amber-200 shadow-2xl shadow-amber-500/10 text-center relative overflow-hidden bg-white">
        
        {/* Top Glow Decor */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-400/20 rounded-full blur-3xl" />

        {/* Logo Header */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/30 mb-6 transform animate-bounce">
          <ShieldAlert className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Tài khoản đang chờ duyệt
        </h1>
        <p className="text-slate-600 text-sm font-semibold mb-8">
          Xin chào! Tài khoản của bạn hiện đang ở trạng thái <span className="text-amber-600 font-bold">Chờ phê duyệt</span>. 
          Vui lòng liên hệ Ban Cán Sự (Admin) đội bóng để được cấp quyền truy cập vào hệ thống.
        </p>

        <button
          onClick={logout}
          className="w-full py-3.5 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng Xuất</span>
        </button>

      </div>
    </div>
  );
}
