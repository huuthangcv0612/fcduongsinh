import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = [6, 12, 24],
  itemLabel = 'mục'
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= itemsPerPageOptions[0])) {
    return null;
  }

  // Calculate range of displayed items
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display with smart ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 select-none">
      {/* Items count & per page selector */}
      <div className="flex items-center gap-3 text-xs text-slate-500 font-bold w-full sm:w-auto justify-between sm:justify-start">
        <span>
          {totalItems > 0 ? (
            <>
              Hiển thị <span className="text-slate-900 font-black font-mono-numbers">{startItem}-{endItem}</span> / <span className="text-slate-900 font-black font-mono-numbers">{totalItems}</span> {itemLabel}
            </>
          ) : (
            `0 ${itemLabel}`
          )}
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 hidden xs:inline">Mỗi trang:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl px-2.5 py-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer transition min-h-[36px]"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons (Touch optimized for mobile with min 44px) */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="Trang đầu"
          className="tactile-btn hidden sm:flex p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition items-center justify-center min-w-[36px] min-h-[36px]"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="tactile-btn flex-1 sm:flex-initial px-3.5 py-2.5 sm:p-2 rounded-xl text-xs font-black text-slate-700 hover:text-slate-900 bg-slate-100 sm:bg-transparent hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:cursor-not-allowed transition flex items-center justify-center gap-1 min-h-[44px] sm:min-h-[36px]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="sm:hidden">Trước</span>
        </button>

        {/* Page indicator for mobile */}
        <div className="sm:hidden px-3.5 py-2.5 text-xs font-black text-slate-800 bg-slate-100 rounded-xl min-h-[44px] flex items-center font-mono">
          {currentPage} / {totalPages || 1}
        </div>

        {/* Numbered Page Buttons for Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-bold">
                  …
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`tactile-btn w-9 h-9 rounded-xl text-xs font-black transition flex items-center justify-center font-mono-numbers ${
                  isActive
                    ? 'bg-[#2c3ec4] text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="tactile-btn flex-1 sm:flex-initial px-3.5 py-2.5 sm:p-2 rounded-xl text-xs font-black text-slate-700 hover:text-slate-900 bg-slate-100 sm:bg-transparent hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:cursor-not-allowed transition flex items-center justify-center gap-1 min-h-[44px] sm:min-h-[36px]"
        >
          <span className="sm:hidden">Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          title="Trang cuối"
          className="tactile-btn hidden sm:flex p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition items-center justify-center min-w-[36px] min-h-[36px]"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
