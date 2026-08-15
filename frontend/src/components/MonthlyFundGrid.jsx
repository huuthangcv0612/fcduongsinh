import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmModalContext';
import { 
  UserPlus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Table, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Sparkles,
  Calendar
} from 'lucide-react';

const MONTH_KEYS = [
  { key: 'm1', label: 'Tháng 1' },
  { key: 'm2', label: 'Tháng 2' },
  { key: 'm3', label: 'Tháng 3' },
  { key: 'm4', label: 'Tháng 4' },
  { key: 'm5', label: 'Tháng 5' },
  { key: 'm6', label: 'Tháng 6' },
  { key: 'm7', label: 'Tháng 7' },
  { key: 'm8', label: 'Tháng 8' },
  { key: 'm9', label: 'Tháng 9' },
  { key: 'm10', label: 'Tháng 10' },
  { key: 'm11', label: 'Tháng 11' },
  { key: 'm12', label: 'Tháng 12' }
];

export default function MonthlyFundGrid({ isAdmin }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingCell, setEditingCell] = useState(null); // { id, monthKey, monthLabel, memberName, value }
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const scrollContainerRef = useRef(null);

  // Auto-scroll to current month
  useEffect(() => {
    if (!isLoading && scrollContainerRef.current) {
      const currentMonthIndex = new Date().getMonth();
      const container = scrollContainerRef.current;
      // STT (w-12 = 48px) + Thành viên (w-52 = 208px) = 256px
      // Month column ~ 95px width
      const scrollPosition = Math.max(0, 256 + (currentMonthIndex * 95) - (container.clientWidth / 2) + 47);
      
      // Delay slightly to let layout finish rendering
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [isLoading, selectedYear]);

  // Query Grid data (linked directly to real MongoDB User collection)
  const { data: gridRes, isLoading } = useQuery({
    queryKey: ['monthlyGrid', selectedYear],
    queryFn: () => api.get(`/finances/monthly-grid?year=${selectedYear}`)
  });

  // Query Expenses (Finances OUT) for monthly expense calculation
  const { data: financesRes } = useQuery({
    queryKey: ['finances'],
    queryFn: () => api.get('/finances')
  });

  const gridData = Array.isArray(gridRes?.data) ? gridRes.data : [];
  const financesList = Array.isArray(financesRes?.data) ? financesRes.data : [];

  // Update cell mutation
  const updateCellMutation = useMutation({
    mutationFn: ({ id, monthKey, amount }) => api.put('/finances/monthly-grid/cell', { id, monthKey, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyGrid', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      toast.success('Đã lưu số tiền đóng quỹ thành công!', 'Cập Nhật Quỹ');
      setEditingCell(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi cập nhật ô số tiền', 'Lỗi');
    }
  });

  // Add member mutation (creates a real DB User + MonthlyFund doc)
  const addMemberMutation = useMutation({
    mutationFn: (name) => api.post('/finances/monthly-grid/member', { memberName: name, year: selectedYear }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyGrid', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Đã tạo thành viên mới trong DB và thêm vào Bảng Quỹ!', 'Thêm Thành Viên DB');
      setNewMemberName('');
      setShowAddMemberModal(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi thêm thành viên', 'Lỗi');
    }
  });

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: (id) => api.delete(`/finances/monthly-grid/member/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyGrid', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Đã xóa thành viên khỏi bảng quỹ!', 'Đã xóa');
    },
    onError: (err) => {
      toast.error(err.message || 'Lỗi khi xóa thành viên', 'Lỗi');
    }
  });

  const handleCellClick = (record, monthKey) => {
    if (!isAdmin) return;
    const val = record.months?.[monthKey] ?? 0;
    const monthObj = MONTH_KEYS.find(m => m.key === monthKey);
    const displayName = record.userId?.name || record.memberName;
    setEditingCell({
      id: record._id,
      monthKey,
      monthLabel: monthObj ? monthObj.label : monthKey,
      memberName: displayName,
      value: val
    });
  };

  const handleSaveCell = (e) => {
    e.preventDefault();
    if (!editingCell) return;
    updateCellMutation.mutate({
      id: editingCell.id,
      monthKey: editingCell.monthKey,
      amount: Number(editingCell.value) || 0
    });
  };

  const handleDeleteMember = async (id, name) => {
    const isConfirmed = await confirm({
      title: 'Xóa Thành Viên Khỏi Bảng Quỹ',
      message: `Bạn có chắc chắn muốn xóa "${name}" khỏi Bảng Quỹ Năm ${selectedYear}?`,
      confirmText: 'Xóa Ngay',
      cancelText: 'Hủy',
      type: 'danger'
    });

    if (isConfirmed) {
      deleteMemberMutation.mutate(id);
    }
  };

  // Helper: Format Money
  const formatMoney = (val) => {
    if (val === 0) return '0 đ';
    if (typeof val !== 'number' || isNaN(val)) return '0 đ';
    return `${val.toLocaleString('vi-VN')} đ`;
  };

  // Calculate Monthly Totals (Tổng thu từng tháng)
  const monthlyTotals = MONTH_KEYS.reduce((acc, m) => {
    acc[m.key] = gridData.reduce((sum, item) => sum + (Number(item.months?.[m.key]) || 0), 0);
    return acc;
  }, {});

  // Calculate Monthly Expenses (Tổng chi từng tháng từ Finance)
  const monthlyExpenses = MONTH_KEYS.reduce((acc, m, idx) => {
    const mNum = (idx + 1).toString().padStart(2, '0');
    const monthStr = `${selectedYear}-${mNum}`;
    const spent = financesList
      .filter(f => f.type === 'OUT' && f.fundMonth === monthStr)
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    acc[m.key] = spent;
    return acc;
  }, {});

  // Grand Total Year Collected
  const grandTotalCollected = Object.values(monthlyTotals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Table Toolbar */}
      <div className="glass-card-white rounded-3xl p-5 border border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              📊 Quản Lý Quỹ Đội Bóng ({selectedYear}) • Dữ Liệu Thực Database
            </h3>
            <p className="text-xs text-slate-600 font-bold">
              Bảng ma trận thu quỹ thực tế ({gridData.length} thành viên DB). Admin nhấp vào ô bất kỳ để điền số tiền.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-300 text-xs font-bold">
            <Calendar className="w-4 h-4 text-emerald-700 pl-1" />
            <span className="text-slate-700">Năm:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-slate-900 font-black px-3 py-1.5 rounded-xl border border-slate-300 focus:outline-none cursor-pointer"
            >
              <option value={2025}>Năm 2025</option>
              <option value={2026}>Năm 2026</option>
            </select>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Thêm Thành Viên DB</span>
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Grid Container */}
      <div className="glass-card-white rounded-3xl border border-slate-300 bg-white overflow-hidden shadow-lg">
        <div ref={scrollContainerRef} className="overflow-x-auto max-w-full">
          <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white font-black uppercase text-[11px] tracking-wider border-b border-emerald-900">
                <th className="py-3 px-3 w-12 text-center border-r border-emerald-700/50">STT</th>
                <th className="py-3 px-4 w-52 sticky left-0 z-20 bg-emerald-900 border-r border-emerald-700 shadow-md">Thành viên (DB)</th>
                {MONTH_KEYS.map((m) => (
                  <th key={m.key} className="py-3 px-3 text-center border-r border-emerald-700/50 min-w-[95px]">
                    {m.label}
                  </th>
                ))}
                <th className={`py-3 px-4 text-right bg-emerald-950 text-amber-300 sticky z-20 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.15)] border-l border-emerald-900 ${isAdmin ? 'right-[48px]' : 'right-0'}`}>Tổng đã đóng</th>
                {isAdmin && <th className="py-3 px-3 text-center w-12 sticky right-0 z-20 bg-emerald-950 border-l border-emerald-800">Thao tác</th>}
              </tr>
            </thead>

            {/* Table Body: Member Rows */}
            <tbody className="divide-y divide-slate-200 text-slate-900 font-bold">
              {gridData.map((row, idx) => {
                // Calculate member total
                const memberTotal = MONTH_KEYS.reduce((sum, m) => sum + (Number(row.months?.[m.key]) || 0), 0);
                const displayName = row.userId?.name || row.memberName;
                const avatar = row.userId?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

                return (
                  <tr key={row._id} className="hover:bg-cyan-50/60 transition group">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-extrabold border-r border-slate-200">
                      {idx + 1}
                    </td>

                    {/* Real DB User Profile Link */}
                    <td className="py-2.5 px-4 sticky left-0 z-10 bg-white group-hover:bg-cyan-50 font-black text-slate-900 border-r border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={avatar}
                          alt={displayName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-300 shadow-2xs shrink-0"
                        />
                        <div className="truncate">
                          <div className="font-black text-slate-900 truncate capitalize">{displayName}</div>
                          {row.userId?.position && (
                            <div className="text-[10px] text-slate-500 font-bold normal-case">
                              {row.userId.position}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 12 Months Cells */}
                    {MONTH_KEYS.map((m) => {
                      const amount = row.months?.[m.key] ?? 0;

                      return (
                        <td
                          key={m.key}
                          onClick={() => handleCellClick(row, m.key)}
                          className={`py-2.5 px-2 text-center border-r border-slate-200 cursor-pointer transition select-none ${
                            amount > 0 ? 'bg-emerald-50 text-emerald-950 font-black' : 'text-slate-300 font-normal'
                          } ${isAdmin ? 'hover:bg-amber-100 hover:ring-2 hover:ring-amber-400' : ''}`}
                          title={isAdmin ? `Nhấp để điền số tiền nộp quỹ cho ${displayName} (${m.label})` : ''}
                        >
                          <span>{formatMoney(amount)}</span>
                        </td>
                      );
                    })}

                    {/* Member Total */}
                    <td className={`py-2.5 px-4 text-right font-black text-emerald-800 bg-emerald-50/95 sticky z-10 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.05)] border-l border-emerald-200 ${isAdmin ? 'right-[48px]' : 'right-0'}`}>
                      {formatMoney(memberTotal)}
                    </td>

                    {/* Actions */}
                    {isAdmin && (
                      <td className="py-2.5 px-3 text-center sticky right-0 z-10 bg-white/95 border-l border-slate-200 shadow-sm">
                        <button
                          onClick={() => handleDeleteMember(row._id, displayName)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Xóa thành viên này khỏi Bảng Quỹ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {gridData.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-slate-500 font-bold">
                    Chưa có thành viên nào trong Bảng Quỹ {selectedYear}. Bấm "+ Thêm Thành Viên DB" ở trên để khởi tạo.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer: Summary Rows matching Screenshot */}
            <tfoot className="border-t-2 border-slate-300 font-black">
              {/* Row 1: TỔNG THU THEO THÁNG */}
              <tr className="bg-emerald-100 text-emerald-950">
                <td colSpan={2} className="py-3 px-4 sticky left-0 z-10 bg-emerald-200 border-r border-emerald-300 font-black uppercase tracking-wider text-xs shadow-sm">
                  🟢 TỔNG THU THEO THÁNG
                </td>
                {MONTH_KEYS.map((m) => (
                  <td key={m.key} className="py-3 px-3 text-center border-r border-emerald-200 font-black text-xs">
                    {formatMoney(monthlyTotals[m.key])}
                  </td>
                ))}
                <td className={`py-3 px-4 text-right bg-emerald-300/95 text-emerald-950 font-black text-sm sticky z-10 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.05)] border-l border-emerald-400 ${isAdmin ? 'right-[48px]' : 'right-0'}`}>
                  {formatMoney(grandTotalCollected)}
                </td>
                {isAdmin && <td className="bg-emerald-200/95 sticky right-0 z-10 border-l border-emerald-300" />}
              </tr>

              {/* Row 2: CHI TIÊU THEO THÁNG */}
              <tr className="bg-rose-50 text-rose-950">
                <td colSpan={2} className="py-2.5 px-4 sticky left-0 z-10 bg-rose-100 border-r border-rose-200 font-black uppercase text-[11px] shadow-sm">
                  🔴 CHI TIÊU THEO THÁNG
                </td>
                {MONTH_KEYS.map((m) => (
                  <td key={m.key} className="py-2.5 px-3 text-center border-r border-rose-200 font-extrabold text-xs text-rose-700">
                    {monthlyExpenses[m.key] > 0 ? `-${formatMoney(monthlyExpenses[m.key])}` : '0 đ'}
                  </td>
                ))}
                <td className={`py-2.5 px-4 text-right bg-rose-200/95 text-rose-950 font-black sticky z-10 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.05)] border-l border-rose-300 ${isAdmin ? 'right-[48px]' : 'right-0'}`}>
                  -{formatMoney(Object.values(monthlyExpenses).reduce((a, b) => a + b, 0))}
                </td>
                {isAdmin && <td className="bg-rose-100/95 sticky right-0 z-10 border-l border-rose-200" />}
              </tr>

              {/* Row 3: TỔNG DƯ THÁNG */}
              <tr className="bg-slate-900 text-white">
                <td colSpan={2} className="py-3 px-4 sticky left-0 z-10 bg-slate-950 border-r border-slate-800 font-black uppercase text-xs tracking-wider text-amber-300 shadow-md">
                  💎 TỔNG DƯ THÁNG
                </td>
                {MONTH_KEYS.map((m) => {
                  const net = (monthlyTotals[m.key] || 0) - (monthlyExpenses[m.key] || 0);
                  return (
                    <td
                      key={m.key}
                      className={`py-3 px-3 text-center border-r border-slate-800 font-black text-xs ${
                        net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {net >= 0 ? `+${formatMoney(net)}` : formatMoney(net)}
                    </td>
                  );
                })}
                <td className={`py-3 px-4 text-right bg-black/95 text-amber-400 font-black text-sm sticky z-10 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.2)] border-l border-slate-800 ${isAdmin ? 'right-[48px]' : 'right-0'}`}>
                  {formatMoney(grandTotalCollected - Object.values(monthlyExpenses).reduce((a, b) => a + b, 0))}
                </td>
                {isAdmin && <td className="bg-slate-900/95 sticky right-0 z-10 border-l border-slate-800" />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ✏️ HIGH CONTRAST CELL EDIT MODAL */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 relative bg-white border-2 border-[#374df5] shadow-2xl">
            <button
              onClick={() => setEditingCell(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
              ✏️ Điền Quỹ {editingCell.monthLabel}
            </h3>
            <p className="text-xs font-bold text-slate-500 mb-4">
              Cầu thủ: <strong className="text-[#374df5] font-black">{editingCell.memberName}</strong> (Năm {selectedYear})
            </p>

            <form onSubmit={handleSaveCell} className="space-y-4">
              {/* Quick Amount Presets */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2">Chọn nhanh số tiền nộp quỹ:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[200000, 150000, 300000, 500000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditingCell({ ...editingCell, value: preset })}
                      className={`py-2 px-1 rounded-xl text-xs font-black border transition ${
                        Number(editingCell.value) === preset
                          ? 'bg-[#374df5] text-white border-[#374df5] shadow-md'
                          : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {(preset / 1000)}k đ
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Số tiền tùy chỉnh (VNĐ):</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    autoFocus
                    value={editingCell.value}
                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                    className="w-full bg-white border-2 border-[#374df5] text-slate-950 font-black text-2xl px-4 py-3 rounded-2xl shadow-inner focus:outline-none focus:ring-4 focus:ring-[#374df5]/20 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingCell({ ...editingCell, value: 0 })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg border border-rose-200"
                  >
                    Clear (0 đ)
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={updateCellMutation.isPending}
                  className="px-6 py-2.5 rounded-full bg-[#374df5] hover:bg-[#2c3ec4] text-white font-black text-xs shadow-md transition"
                >
                  Lưu Số Tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 relative bg-white border border-emerald-400 shadow-2xl">
            <button
              onClick={() => setShowAddMemberModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1">👤 Thêm Thành Viên Mới Vào DB & Bảng Quỹ</h3>
            <p className="text-xs text-slate-500 font-bold mb-4">
              Tạo thành viên chính thức trong MongoDB. Mặc định các tháng sẽ khởi tạo với số tiền <strong>0 đ/tháng</strong> (Nhấp vào từng ô để điền).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newMemberName.trim()) addMemberMutation.mutate(newMemberName);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên thành viên:</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên thành viên..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
                >
                  + Thêm Vào Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
