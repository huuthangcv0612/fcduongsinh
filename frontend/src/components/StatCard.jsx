import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, color = 'emerald' }) {
  const colorMap = {
    emerald: 'from-emerald-500/10 to-teal-500/5 border-emerald-300 text-emerald-900 icon-emerald',
    cyan: 'from-cyan-500/10 to-blue-500/5 border-cyan-300 text-cyan-900 icon-cyan',
    violet: 'from-violet-500/10 to-purple-500/5 border-violet-300 text-violet-900 icon-violet',
    rose: 'from-rose-500/10 to-pink-500/5 border-rose-300 text-rose-900 icon-rose',
    amber: 'from-amber-500/10 to-yellow-500/5 border-amber-300 text-amber-900 icon-amber',
  };

  const style = colorMap[color] || colorMap.emerald;

  return (
    <div className={`glass-panel rounded-3xl p-5 border bg-gradient-to-br ${style.split(' ')[0]} ${style.split(' ')[1]} ${style.split(' ')[2]} shadow-md flex items-center justify-between bg-white`}>
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1">
          {title}
        </span>
        <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {value}
        </h4>
        {subtext && (
          <p className="text-xs text-slate-700 mt-1 font-bold">
            {subtext}
          </p>
        )}
      </div>

      {Icon && (
        <div className="p-3.5 rounded-2xl bg-white border border-slate-300 shadow-sm text-emerald-700">
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
