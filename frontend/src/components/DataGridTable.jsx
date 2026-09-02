import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Save, Trash2, RefreshCw, Search, X, Filter, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';

export default function DataGridTable({ data: initialData, onBulkSave, onDelete, isAdmin }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dirtyRowIds, setDirtyRowIds] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Filters and Pagination State (Synchronized with Backend API)
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'IN' | 'OUT'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Server-side API Query with filtering, search, stats, and pagination
  const { data: financesQueryRes, isLoading: isQueryLoading } = useQuery({
    queryKey: ['finances-grid', searchTerm, typeFilter, categoryFilter, monthFilter, currentPage, itemsPerPage],
    queryFn: () => {
      const params = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (monthFilter !== 'all') params.fundMonth = monthFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      params.page = currentPage;
      params.limit = itemsPerPage;
      return api.get('/finances', { params });
    },
    staleTime: 30000
  });

  // Base rows array from API
  const apiRows = useMemo(() => {
    if (financesQueryRes?.data && Array.isArray(financesQueryRes.data)) {
      return financesQueryRes.data;
    }
    if (Array.isArray(initialData)) {
      return initialData;
    }
    return [];
  }, [financesQueryRes, initialData]);

  // Local editable rows state
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setRows(apiRows);
  }, [apiRows]);

  const handleCellChange = (id, field, value) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row._id === id) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );

    setDirtyRowIds(prev => new Set(prev).add(id));
  };

  const handleSaveAll = async () => {
    if (dirtyRowIds.size === 0) return;
    setIsSaving(true);

    const changedItems = rows
      .filter(row => dirtyRowIds.has(row._id))
      .map(row => ({
        _id: row._id,
        type: row.type,
        category: row.category,
        amount: Number(row.amount),
        description: row.description,
        fundMonth: row.fundMonth || null
      }));

    try {
      await onBulkSave(changedItems);
      setDirtyRowIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['finances-grid'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    } catch (err) {
      console.error('Bulk save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!isAdmin) return;
    try {
      await onDelete(id);
      queryClient.invalidateQueries({ queryKey: ['finances-grid'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    } catch (err) {
      console.error('Delete item failed:', err);
    }
  };

  // Available unique months
  const availableMonths = useMemo(() => {
    const list = [];
    const curr = new Date();
    for (let i = -6; i <= 6; i++) {
      const d = new Date(curr.getFullYear(), curr.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      list.push(`${y}-${m < 10 ? '0' + m : m}`);
    }
    return list.sort().reverse();
  }, []);

  const isFiltered = searchTerm.trim() !== '' || typeFilter !== 'all' || categoryFilter !== 'all' || monthFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setMonthFilter('all');
    setCurrentPage(1);
  };

  // Server-computed financial statistics for current filter
  const filterStats = financesQueryRes?.stats || {
    totalIn: 0,
    totalOut: 0,
    balance: 0
  };

  // Server-computed pagination info
  const pagination = financesQueryRes?.pagination || {
    page: currentPage,
    limit: itemsPerPage,
    total: rows.length,
    totalPages: 1
  };

  const totalPages = pagination.totalPages || 1;
  const totalItems = pagination.total !== undefined ? pagination.total : rows.length;

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 overflow-hidden shadow-md bg-white space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-black text-lg sm:text-xl text-slate-900 flex items-center gap-2">
            {t('finances.data_grid_title')}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-black">
              {totalItems}
            </span>
            {dirtyRowIds.size > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black animate-pulse">
                {t('finances.data_grid_dirty', { count: dirtyRowIds.size })}
              </span>
            )}
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            {isAdmin ? t('finances.data_grid_admin_hint') : t('finances.data_grid_member_hint')}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleSaveAll}
            disabled={dirtyRowIds.size === 0 || isSaving}
            className={`tactile-btn flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition shadow-md self-start sm:self-auto ${
              dirtyRowIds.size > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-300'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{t('finances.save_all')} ({dirtyRowIds.size})</span>
          </button>
        )}
      </div>

      {/* Responsive Filter Toolbar */}
      <div className="bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80 space-y-3">
        {/* Search Input & Selectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo mô tả, người tạo, tháng, số tiền..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition min-h-[42px]"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full sm:w-44">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer min-h-[42px]"
            >
              <option value="all">📂 Tất cả hạng mục</option>
              <option value="quy_thang">{t("finances.cat_monthly")}</option>
              <option value="tien_san">{t("finances.cat_pitch")}</option>
              <option value="nuoc_uong">{t("finances.cat_water")}</option>
              <option value="dong_phuc">{t("finances.cat_kit")}</option>
              <option value="phat">{t("finances.cat_fine")}</option>
              <option value="khac">{t("finances.cat_other")}</option>
            </select>
          </div>

          {/* Month Dropdown */}
          {availableMonths.length > 0 && (
            <div className="w-full sm:w-44">
              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer min-h-[42px]"
              >
                <option value="all">📅 Tất cả các tháng</option>
                {availableMonths.map(m => {
                  const [y, mon] = m.split('-');
                  return (
                    <option key={m} value={m}>
                      Tháng {mon}/{y}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Type Filter Buttons & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            <button
              onClick={() => {
                setTypeFilter('all');
                setCurrentPage(1);
              }}
              className={`tactile-btn px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 min-h-[36px] ${
                typeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
              }`}
            >
              <span>Tất cả</span>
            </button>

            <button
              onClick={() => {
                setTypeFilter('IN');
                setCurrentPage(1);
              }}
              className={`tactile-btn px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 min-h-[36px] ${
                typeFilter === 'IN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200/60'
              }`}
            >
              <span>🟢 Thu (+IN)</span>
            </button>

            <button
              onClick={() => {
                setTypeFilter('OUT');
                setCurrentPage(1);
              }}
              className={`tactile-btn px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 min-h-[36px] ${
                typeFilter === 'OUT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white hover:bg-rose-50 text-rose-800 border border-rose-200/60'
              }`}
            >
              <span>🔴 Chi (-OUT)</span>
            </button>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="tactile-btn px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 min-h-[36px] ml-auto"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        {/* Filtered Financial Metrics Summary */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-2 text-[11px] font-bold border-t border-slate-200/60 text-slate-600">
          <span className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-blue-600" />
            <span>Tìm thấy: <strong className="text-slate-900 font-mono-numbers">{totalItems}</strong> phiếu</span>
            {isQueryLoading && <span className="text-blue-600 text-[10px] animate-pulse ml-1">Đang tải...</span>}
          </span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Thu: <strong className="font-mono-numbers font-black">+{filterStats.totalIn.toLocaleString('vi-VN')} đ</strong>
          </span>
          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            Chi: <strong className="font-mono-numbers font-black">-{filterStats.totalOut.toLocaleString('vi-VN')} đ</strong>
          </span>
          <span className={`px-2 py-0.5 rounded-md border ${
            filterStats.balance >= 0 ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}>
            Dư: <strong className="font-mono-numbers font-black">{filterStats.balance.toLocaleString('vi-VN')} đ</strong>
          </span>
        </div>
      </div>

      {/* DESKTOP VIEW: Excel Data Grid Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left border-collapse data-grid-table">
          <thead>
            <tr>
              <th className="w-12 text-slate-900">{t("finances.stt")}</th>
              <th className="w-32 text-slate-900">{t("finances.type_col")}</th>
              <th className="w-40 text-slate-900">{t("finances.category")}</th>
              <th className="w-40 text-slate-900">{t("finances.amount_col")}</th>
              <th className="text-slate-900">{t("finances.desc_col")}</th>
              <th className="w-32 text-slate-900">{t("finances.month_col")}</th>
              <th className="w-32 text-slate-900">{t("finances.creator_col")}</th>
              {isAdmin && <th className="w-16 text-center text-slate-900">{t("finances.delete_col")}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isDirty = dirtyRowIds.has(row._id);
              const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

              return (
                <tr
                  key={row._id}
                  className={isDirty ? 'data-grid-row-dirty' : ''}
                >
                  <td className="font-mono text-xs text-slate-600 font-bold text-center">
                    {rowNumber}
                  </td>

                  <td>
                    {isAdmin ? (
                      <select
                        value={row.type}
                        onChange={(e) => handleCellChange(row._id, 'type', e.target.value)}
                        className={`data-grid-input font-black ${
                          row.type === 'IN' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                        }`}
                      >
                        <option value="IN" className="bg-white text-emerald-700 font-black">{t("finances.type_in")}</option>
                        <option value="OUT" className="bg-white text-rose-700 font-black">{t("finances.type_out")}</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${
                        row.type === 'IN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {row.type === 'IN' ? '+ IN' : '- OUT'}
                      </span>
                    )}
                  </td>

                  <td>
                    {isAdmin ? (
                      <select
                        value={row.category || 'khac'}
                        onChange={(e) => handleCellChange(row._id, 'category', e.target.value)}
                        className="data-grid-input text-xs font-bold text-slate-900 bg-white"
                      >
                        <option value="quy_thang" className="bg-white text-slate-900">{t("finances.cat_monthly")}</option>
                        <option value="tien_san" className="bg-white text-slate-900">{t("finances.cat_pitch")}</option>
                        <option value="nuoc_uong" className="bg-white text-slate-900">{t("finances.cat_water")}</option>
                        <option value="dong_phuc" className="bg-white text-slate-900">{t("finances.cat_kit")}</option>
                        <option value="phat" className="bg-white text-slate-900">{t("finances.cat_fine")}</option>
                        <option value="khac" className="bg-white text-slate-900">{t("finances.cat_other")}</option>
                      </select>
                    ) : (
                      <span className="text-xs font-bold text-slate-800 capitalize">
                        {row.category?.replace('_', ' ') || 'Khác'}
                      </span>
                    )}
                  </td>

                  <td>
                    {isAdmin ? (
                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) => handleCellChange(row._id, 'amount', e.target.value)}
                        className="data-grid-input font-mono font-black text-slate-900 text-right"
                      />
                    ) : (
                      <span className="font-mono font-black text-sm text-slate-900">
                        {Number(row.amount).toLocaleString('vi-VN')} đ
                      </span>
                    )}
                  </td>

                  <td>
                    {isAdmin ? (
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => handleCellChange(row._id, 'description', e.target.value)}
                        className="data-grid-input text-slate-900 font-bold"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-900">{row.description}</span>
                    )}
                  </td>

                  <td>
                    {isAdmin ? (
                      <input
                        type="text"
                        placeholder="YYYY-MM"
                        value={row.fundMonth || ''}
                        onChange={(e) => handleCellChange(row._id, 'fundMonth', e.target.value)}
                        className="data-grid-input font-mono text-xs font-bold text-center text-slate-900"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold text-slate-700">{row.fundMonth || '-'}</span>
                    )}
                  </td>

                  <td className="text-xs font-bold text-slate-700">
                    {row.createdBy?.name || 'Admin'}
                  </td>

                  {isAdmin && (
                    <td className="text-center">
                      <button
                        onClick={() => handleDeleteItem(row._id)}
                        title="Xóa phiếu thu/chi này"
                        className="tactile-btn p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-slate-500 text-sm font-bold">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-6 h-6 text-slate-400" />
                    <span>Không tìm thấy phiếu thu/chi nào phù hợp</span>
                    {isFiltered && (
                      <button
                        onClick={handleResetFilters}
                        className="text-xs font-black text-blue-600 hover:underline mt-1"
                      >
                        Xóa bộ lọc tìm kiếm
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE VIEW: High-Contrast Responsive Cards with Touch Optimization */}
      <div className="block md:hidden space-y-3">
        {rows.map((row) => {
          const isDirty = dirtyRowIds.has(row._id);
          return (
            <div
              key={row._id}
              className={`p-4 rounded-2xl border transition-all ${
                isDirty
                  ? 'bg-amber-50 border-amber-300 shadow-md ring-1 ring-amber-300'
                  : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                {isAdmin ? (
                  <select
                    value={row.type}
                    onChange={(e) => handleCellChange(row._id, 'type', e.target.value)}
                    className={`text-xs font-black px-3 py-1.5 rounded-xl border bg-white min-h-[38px] ${
                      row.type === 'IN' ? 'text-emerald-700 border-emerald-300 bg-emerald-50/50' : 'text-rose-700 border-rose-300 bg-rose-50/50'
                    }`}
                  >
                    <option value="IN" className="bg-white text-emerald-700 font-bold">{t("finances.type_in")}</option>
                    <option value="OUT" className="bg-white text-rose-700 font-bold">{t("finances.type_out")}</option>
                  </select>
                ) : (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                    row.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {row.type === 'IN' ? '+ IN' : '- OUT'}
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-lg">
                    {row.fundMonth || 'Không gán tháng'}
                  </span>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteItem(row._id)}
                      className="tactile-btn p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl min-h-[38px] min-w-[38px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Inputs */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-0.5">{t("finances.desc_col")}:</label>
                  {isAdmin ? (
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => handleCellChange(row._id, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold min-h-[40px] focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-900 font-black">{row.description}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-0.5">{t("finances.amount_col")}:</label>
                    {isAdmin ? (
                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) => handleCellChange(row._id, 'amount', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-700 min-h-[40px] focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-xs font-mono font-black text-emerald-800">
                        {Number(row.amount).toLocaleString('vi-VN')} đ
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-0.5">{t("finances.category")}:</label>
                    {isAdmin ? (
                      <select
                        value={row.category || 'khac'}
                        onChange={(e) => handleCellChange(row._id, 'category', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold min-h-[40px] focus:outline-none focus:border-blue-500"
                      >
                        <option value="quy_thang" className="bg-white text-slate-900">Quỹ tháng</option>
                        <option value="tien_san" className="bg-white text-slate-900">Tiền sân</option>
                        <option value="nuoc_uong" className="bg-white text-slate-900">Nước uống</option>
                        <option value="dong_phuc" className="bg-white text-slate-900">Đồng phục</option>
                        <option value="phat" className="bg-white text-slate-900">Phạt trễ/vắng</option>
                        <option value="khac" className="bg-white text-slate-900">Khác</option>
                      </select>
                    ) : (
                      <div className="text-xs font-bold text-slate-800 capitalize">{row.category?.replace('_', ' ')}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500 font-bold bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <Search className="w-6 h-6 text-slate-400 mx-auto" />
            <p>{t("finances.no_records")}</p>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-black text-blue-600 hover:underline"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        itemsPerPageOptions={[10, 20, 50]}
        itemLabel="phiếu thu/chi"
      />
    </div>
  );
}
