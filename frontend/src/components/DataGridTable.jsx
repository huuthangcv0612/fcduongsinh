import React, { useState, useEffect } from 'react';
import { Save, Trash2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DataGridTable({ data, onBulkSave, onDelete, isAdmin }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [dirtyRowIds, setDirtyRowIds] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setRows(data);
      setDirtyRowIds(new Set());
    }
  }, [data]);

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
    } catch (err) {
      console.error('Bulk save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 overflow-hidden shadow-md bg-white">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
            {t('finances.data_grid_title')}
            {dirtyRowIds.size > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black">
                {t('finances.data_grid_dirty', { count: dirtyRowIds.size })}
              </span>
            )}
          </h3>
          <p className="text-xs font-bold text-slate-600">
            {isAdmin ? t('finances.data_grid_admin_hint') : t('finances.data_grid_member_hint')}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleSaveAll}
            disabled={dirtyRowIds.size === 0 || isSaving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition shadow-md ${
              dirtyRowIds.size > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
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
              return (
                <tr
                  key={row._id}
                  className={isDirty ? 'data-grid-row-dirty' : ''}
                >
                  <td className="font-mono text-xs text-slate-600 font-bold text-center">
                    {index + 1}
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
                        onClick={() => onDelete(row._id)}
                        title="Xóa phiếu thu/chi này"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
                <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-500 text-sm font-bold">
                  {t("finances.no_records")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE VIEW: High-Contrast Responsive Cards */}
      <div className="block md:hidden space-y-3">
        {rows.map((row) => {
          const isDirty = dirtyRowIds.has(row._id);
          return (
            <div
              key={row._id}
              className={`p-4 rounded-2xl border transition-all ${
                isDirty
                  ? 'bg-amber-50 border-amber-300 shadow-md'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                {isAdmin ? (
                  <select
                    value={row.type}
                    onChange={(e) => handleCellChange(row._id, 'type', e.target.value)}
                    className={`text-xs font-black px-2 py-1 rounded-lg border bg-white ${
                      row.type === 'IN' ? 'text-emerald-700 border-emerald-300' : 'text-rose-700 border-rose-300'
                    }`}
                  >
                    <option value="IN" className="bg-white text-emerald-700 font-bold">{t("finances.type_in")}</option>
                    <option value="OUT" className="bg-white text-rose-700 font-bold">{t("finances.type_out")}</option>
                  </select>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-black ${
                    row.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {row.type === 'IN' ? '+ IN' : '- OUT'}
                  </span>
                )}

                {isAdmin && (
                  <button
                    onClick={() => onDelete(row._id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold"
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
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-black text-emerald-700"
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
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-bold"
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
          <div className="py-6 text-center text-xs text-slate-500 font-bold">
            {t("finances.no_records")}
          </div>
        )}
      </div>
    </div>
  );
}
