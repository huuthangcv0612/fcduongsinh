import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, color = 'emerald' }) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200/80',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-300/60'
    },
    cyan: {
      bg: 'bg-blue-50/70',
      border: 'border-blue-200/80',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100 text-blue-700 border-blue-300/60'
    },
    rose: {
      bg: 'bg-rose-50/70',
      border: 'border-rose-200/80',
      text: 'text-rose-700',
      iconBg: 'bg-rose-100 text-rose-700 border-rose-300/60'
    },
    amber: {
      bg: 'bg-amber-50/70',
      border: 'border-amber-200/80',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100 text-amber-700 border-amber-300/60'
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div className={`rounded-3xl p-3.5 sm:p-5 border ${scheme.border} bg-white shadow-xs hover:shadow-md transition flex items-center justify-between gap-2 overflow-hidden`}>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-0.5 truncate">
          {title}
        </span>
        <h4 className={`text-base sm:text-2xl font-black font-mono-numbers ${scheme.text} tracking-tight truncate`}>
          {value}
        </h4>
        {subtext && (
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-bold truncate">
            {subtext}
          </p>
        )}
      </div>

      {Icon && (
        <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border ${scheme.iconBg} shadow-2xs flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      )}
    </div>
  );
}
