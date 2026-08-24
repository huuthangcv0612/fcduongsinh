import React, { useState } from 'react';
import { Crown, UserMinus } from 'lucide-react';

export const FORMATIONS = {
  '3-2-1': {
    name: '3-2-1 (Phòng ngự phản công)',
    description: '1 GK, 3 Hậu vệ, 2 Tiền vệ, 1 Tiền đạo',
    slots: [
      { positionKey: 'GK', positionName: 'Thủ môn', x: 50, y: 87 },
      { positionKey: 'LCB', positionName: 'Trung vệ trái', x: 22, y: 70 },
      { positionKey: 'CB', positionName: 'Trung vệ quét', x: 50, y: 72 },
      { positionKey: 'RCB', positionName: 'Trung vệ phải', x: 78, y: 70 },
      { positionKey: 'LCM', positionName: 'Tiền vệ trung tâm', x: 35, y: 45 },
      { positionKey: 'RCM', positionName: 'Tiền vệ trung tâm', x: 65, y: 45 },
      { positionKey: 'ST', positionName: 'Tiền đạo', x: 50, y: 18 }
    ]
  },
  '2-3-1': {
    name: '2-3-1 (Cân bằng)',
    description: '1 GK, 2 Hậu vệ, 3 Tiền vệ, 1 Tiền đạo cắm',
    slots: [
      { positionKey: 'GK', positionName: 'Thủ môn', x: 50, y: 87 },
      { positionKey: 'LB', positionName: 'Hậu vệ trái', x: 26, y: 68 },
      { positionKey: 'RB', positionName: 'Hậu vệ phải', x: 74, y: 68 },
      { positionKey: 'LM', positionName: 'Tiền vệ trái', x: 18, y: 45 },
      { positionKey: 'CM', positionName: 'Tiền vệ trung tâm', x: 50, y: 45 },
      { positionKey: 'RM', positionName: 'Tiền vệ phải', x: 82, y: 45 },
      { positionKey: 'ST', positionName: 'Tiền đạo', x: 50, y: 18 }
    ]
  },
  '2-1-2-1': {
    name: '2-1-2-1 (Kim cương)',
    description: '1 GK, 2 Hậu vệ, 1 Tiền vệ trụ, 2 Tiền vệ công, 1 Tiền đạo',
    slots: [
      { positionKey: 'GK', positionName: 'Thủ môn', x: 50, y: 87 },
      { positionKey: 'LB', positionName: 'Hậu vệ trái', x: 26, y: 70 },
      { positionKey: 'RB', positionName: 'Hậu vệ phải', x: 74, y: 70 },
      { positionKey: 'CDM', positionName: 'Tiền vệ mỏ neo', x: 50, y: 55 },
      { positionKey: 'LAM', positionName: 'Tiền vệ công trái', x: 30, y: 35 },
      { positionKey: 'RAM', positionName: 'Tiền vệ công phải', x: 70, y: 35 },
      { positionKey: 'ST', positionName: 'Tiền đạo', x: 50, y: 16 }
    ]
  },
  '3-1-2': {
    name: '3-1-2 (Tấn công 2 tiền đạo)',
    description: '1 GK, 3 Hậu vệ, 1 Tiền vệ tổ chức, 2 Tiền đạo',
    slots: [
      { positionKey: 'GK', positionName: 'Thủ môn', x: 50, y: 87 },
      { positionKey: 'LCB', positionName: 'Hậu vệ trái', x: 22, y: 70 },
      { positionKey: 'CB', positionName: 'Trung vệ', x: 50, y: 72 },
      { positionKey: 'RCB', positionName: 'Hậu vệ phải', x: 78, y: 70 },
      { positionKey: 'CM', positionName: 'Tiền vệ', x: 50, y: 46 },
      { positionKey: 'LS', positionName: 'Tiền đạo trái', x: 32, y: 20 },
      { positionKey: 'RS', positionName: 'Tiền đạo phải', x: 68, y: 20 }
    ]
  },
  '1-4-1': {
    name: '1-4-1 (Áp đảo trung tuyến)',
    description: '1 GK, 1 Trung vệ, 4 Tiền vệ, 1 Tiền đạo',
    slots: [
      { positionKey: 'GK', positionName: 'Thủ môn', x: 50, y: 87 },
      { positionKey: 'CB', positionName: 'Trung vệ', x: 50, y: 70 },
      { positionKey: 'LM', positionName: 'Tiền vệ trái', x: 16, y: 44 },
      { positionKey: 'LCM', positionName: 'Tiền vệ trung tâm', x: 38, y: 44 },
      { positionKey: 'RCM', positionName: 'Tiền vệ trung tâm', x: 62, y: 44 },
      { positionKey: 'RM', positionName: 'Tiền vệ phải', x: 84, y: 44 },
      { positionKey: 'ST', positionName: 'Tiền đạo', x: 50, y: 18 }
    ]
  }
};

export default function TacticalPitch({
  starters = [],
  onSlotDrop,
  onRemovePlayer,
  onToggleCaptain,
  onSlotClick,
  selectedPlayerToPlace = null,
  kitColor = 'xanh dương',
  isEditable = false,
  pitchRef = null
}) {
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState(null);
  const [activeSlotMenu, setActiveSlotMenu] = useState(null);

  // Determine kit color theme for tokens
  const getKitGradient = () => {
    switch (kitColor?.toLowerCase()) {
      case 'xanh dương':
      case 'xanh':
        return 'from-blue-600 to-indigo-700 text-white border-blue-300';
      case 'đỏ':
        return 'from-rose-600 to-red-700 text-white border-rose-300';
      case 'đen':
        return 'from-slate-800 to-neutral-900 text-white border-amber-400';
      default:
        return 'from-emerald-600 to-teal-800 text-white border-emerald-300';
    }
  };

  const handleDragOver = (e, index) => {
    if (!isEditable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredSlotIndex(index);
  };

  const handleDragLeave = () => {
    setHoveredSlotIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    if (!isEditable) return;
    e.preventDefault();
    setHoveredSlotIndex(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const payload = JSON.parse(dataStr);
        onSlotDrop(targetIndex, payload);
      }
    } catch (err) {
      console.error('Drop parse error', err);
    }
  };

  return (
    <div
      ref={pitchRef}
      className="relative w-full max-w-[340px] sm:max-w-[420px] md:max-w-[460px] mx-auto select-none rounded-2xl overflow-hidden shadow-2xl border-3 sm:border-4 border-emerald-800/80 bg-emerald-900 aspect-[3/4.1]"
      style={{
        background: 'radial-gradient(ellipse at center, #15803d 0%, #166534 60%, #14532d 100%)'
      }}
      onClick={() => setActiveSlotMenu(null)}
    >
      {/* 🌿 Pitch Grass Stripes Texture */}
      <div className="absolute inset-0 opacity-15 pointer-events-none flex flex-col">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`w-full flex-1 ${i % 2 === 0 ? 'bg-black/20' : 'bg-white/10'}`}
          />
        ))}
      </div>

      {/* 📐 Pitch Markings (White lines) */}
      <div className="absolute inset-3 border-2 border-white/40 rounded pointer-events-none">
        {/* Halfway line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/40 -translate-y-1/2" />
        
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
        <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />

        {/* Top Goal Box (Opponent) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 border-b-2 border-x-2 border-white/40 rounded-b" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 border-b-2 border-x-2 border-white/40 rounded-b" />
        <div className="absolute top-11 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-20 h-8 border-b-2 border-white/40 rounded-b-full" />

        {/* Bottom Goal Box (Our Team) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-16 border-t-2 border-x-2 border-white/40 rounded-t" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-6 border-t-2 border-x-2 border-white/40 rounded-t" />
        <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-20 h-8 border-t-2 border-white/40 rounded-t-full" />

        {/* Corner Arcs */}
        <div className="absolute top-0 left-0 w-4 h-4 border-b-2 border-r-2 border-white/40 rounded-br-full" />
        <div className="absolute top-0 right-0 w-4 h-4 border-b-2 border-l-2 border-white/40 rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-t-2 border-r-2 border-white/40 rounded-tr-full" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-t-2 border-l-2 border-white/40 rounded-tl-full" />
      </div>

      {/* Goal Posts Text */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/50 tracking-wider uppercase px-2 py-0.5 bg-black/20 rounded-full">
        Khung thành đối thủ
      </div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/50 tracking-wider uppercase px-2 py-0.5 bg-black/20 rounded-full">
        Khung thành FC Nha Trẻ
      </div>

      {/* ⚽ 7 Player Slots */}
      {starters.map((slot, index) => {
        const user = slot.userId;
        const isHovered = hoveredSlotIndex === index;
        const isSelectedForPlacement = Boolean(selectedPlayerToPlace);
        const isMenuOpen = activeSlotMenu === index;

        return (
          <div
            key={slot.positionKey || index}
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            className="absolute z-10 flex flex-col items-center group cursor-pointer"
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onClick={(e) => {
              e.stopPropagation();
              if (selectedPlayerToPlace) {
                onSlotClick(index);
              } else if (isEditable && user) {
                setActiveSlotMenu(isMenuOpen ? null : index);
              }
            }}
          >
            {/* Position Role Badge above player */}
            <div className="mb-0.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-semibold text-emerald-300 border border-emerald-500/30 uppercase tracking-tighter">
              {slot.positionKey}
            </div>

            {/* Player Avatar / Empty Placeholder Circle */}
            <div
              draggable={isEditable && Boolean(user)}
              onDragStart={(e) => {
                if (!isEditable || !user) return;
                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({
                    type: 'FROM_SLOT',
                    sourceIndex: index,
                    user
                  })
                );
              }}
              className={`relative w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                user
                  ? `shadow-lg ring-2 ${
                      slot.isCaptain
                        ? 'ring-amber-400 ring-offset-2 ring-offset-emerald-950 scale-105'
                        : 'ring-white/80 ring-offset-1 ring-offset-black/30'
                    }`
                  : `border-2 border-dashed ${
                      isSelectedForPlacement
                        ? 'border-amber-400 bg-amber-400/20 animate-pulse scale-110 shadow-amber-400/50'
                        : 'border-white/40 bg-black/30 hover:border-white/70 hover:bg-black/40'
                    }`
              } ${isHovered ? 'ring-4 ring-amber-400 scale-110' : ''}`}
            >
              {user ? (
                <>
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover rounded-full pointer-events-none"
                    />
                  ) : (
                    <div
                      className={`w-full h-full rounded-full flex items-center justify-center font-bold text-xs sm:text-sm bg-gradient-to-br ${
                        slot.positionKey === 'GK'
                          ? 'from-amber-600 to-yellow-700 text-white'
                          : getKitGradient()
                      }`}
                    >
                      {user.number ? `#${user.number}` : user.name?.charAt(0) || '?'}
                    </div>
                  )}

                  {/* Jersey Number Badge */}
                  {user.number && (
                    <span className="absolute -bottom-1 -left-1 px-1 py-0.2 rounded-full bg-slate-900 text-white font-extrabold text-[8px] sm:text-[9px] border border-white/50 shadow-sm leading-tight">
                      #{user.number}
                    </span>
                  )}

                  {/* Captain (C) Badge */}
                  {slot.isCaptain && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] shadow-md border border-amber-200">
                      C
                    </span>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-white/60 text-xs">
                  <span className="font-bold text-base leading-none">+</span>
                </div>
              )}
            </div>

            {/* Player Name Pill */}
            <div className="mt-0.5 sm:mt-1 max-w-[74px] sm:max-w-[86px] md:max-w-[96px] truncate px-1.5 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-sm text-center border border-white/10 shadow-md">
              <p className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-white truncate leading-tight">
                {user ? user.name : slot.positionName || 'Chưa xếp'}
              </p>
            </div>

            {/* Quick Action Popover (for Edit mode) */}
            {isEditable && isMenuOpen && user && (
              <div
                className={`absolute ${
                  slot.y < 35 ? 'top-14' : '-top-14'
                } left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md text-white text-xs py-1.5 px-2 rounded-xl shadow-2xl border border-slate-700/90 flex items-center gap-1.5 z-30 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/40`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onToggleCaptain(index);
                    setActiveSlotMenu(null);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                    slot.isCaptain
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                  title={slot.isCaptain ? 'Bỏ đội trưởng' : 'Gán làm Đội trưởng (C)'}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  {slot.isCaptain ? 'Bỏ (C)' : 'Làm (C)'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onRemovePlayer(index);
                    setActiveSlotMenu(null);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition"
                  title="Đưa về ghế dự bị"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Gỡ ra
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
