const fs = require('fs');
const path = require('path');

function replaceAll(str, mapObj) {
  const re = new RegExp(Object.keys(mapObj).join('|'), 'gi');
  return str.replace(re, function(matched) {
    return mapObj[matched];
  });
}

function processDataGrid() {
  const filePath = 'e:\\fcnhatre\\frontend\\src\\components\\DataGridTable.jsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Add import
  if (!content.includes('useTranslation')) {
    content = content.replace("import { Save, Trash2, RefreshCw } from 'lucide-react';", 
      "import { Save, Trash2, RefreshCw } from 'lucide-react';\nimport { useTranslation } from 'react-i18next';");
  }

  // Add t
  if (!content.includes('const { t } = useTranslation();')) {
    content = content.replace("export default function DataGridTable({ data, onBulkSave, onDelete, isAdmin }) {", 
      "export default function DataGridTable({ data, onBulkSave, onDelete, isAdmin }) {\n  const { t } = useTranslation();");
  }

  // Header 
  content = content.replace("📊 Dữ Liệu Thu Chi Quỹ", "{t('finances.data_grid_title')}");
  content = content.replace("{dirtyRowIds.size} dòng đã sửa", "{t('finances.data_grid_dirty', { count: dirtyRowIds.size })}");
  content = content.replace("'Chỉnh sửa trực tiếp và nhấn \"Lưu tất cả\" để cập nhật hàng loạt'", "t('finances.data_grid_admin_hint')");
  content = content.replace("'Chế độ xem chỉ dành cho thành viên'", "t('finances.data_grid_member_hint')");
  content = content.replace("<span>Lưu tất cả ({dirtyRowIds.size})</span>", "<span>{t('finances.save_all')} ({dirtyRowIds.size})</span>");

  // Table headers
  content = content.replace('<th className="w-12 text-slate-900">STT</th>', '<th className="w-12 text-slate-900">{t("finances.stt")}</th>');
  content = content.replace('<th className="w-32 text-slate-900">Loại</th>', '<th className="w-32 text-slate-900">{t("finances.type_col")}</th>');
  content = content.replace('<th className="w-40 text-slate-900">Hạng mục</th>', '<th className="w-40 text-slate-900">{t("finances.category")}</th>');
  content = content.replace('<th className="w-40 text-slate-900">Số tiền (VNĐ)</th>', '<th className="w-40 text-slate-900">{t("finances.amount_col")}</th>');
  content = content.replace('<th className="text-slate-900">Mô tả / Ghi chú</th>', '<th className="text-slate-900">{t("finances.desc_col")}</th>');
  content = content.replace('<th className="w-32 text-slate-900">Tháng quỹ</th>', '<th className="w-32 text-slate-900">{t("finances.month_col")}</th>');
  content = content.replace('<th className="w-32 text-slate-900">Người tạo</th>', '<th className="w-32 text-slate-900">{t("finances.creator_col")}</th>');
  content = content.replace('<th className="w-16 text-center text-slate-900">Xóa</th>', '<th className="w-16 text-center text-slate-900">{t("finances.delete_col")}</th>');

  // Options IN / OUT
  content = content.replace('className="bg-white text-emerald-700 font-black">+ THU (Cộng tiền)</option>', 'className="bg-white text-emerald-700 font-black">{t("finances.type_in")}</option>');
  content = content.replace('className="bg-white text-rose-700 font-black">- CHI (Trừ tiền)</option>', 'className="bg-white text-rose-700 font-black">{t("finances.type_out")}</option>');

  // Categories
  content = content.replace('className="bg-white text-slate-900">Quỹ tháng</option>', 'className="bg-white text-slate-900">{t("finances.cat_monthly")}</option>');
  content = content.replace('className="bg-white text-slate-900">Tiền sân</option>', 'className="bg-white text-slate-900">{t("finances.cat_pitch")}</option>');
  content = content.replace('className="bg-white text-slate-900">Nước uống</option>', 'className="bg-white text-slate-900">{t("finances.cat_water")}</option>');
  content = content.replace('className="bg-white text-slate-900">Đồng phục</option>', 'className="bg-white text-slate-900">{t("finances.cat_kit")}</option>');
  content = content.replace('className="bg-white text-slate-900">Phạt trễ/vắng</option>', 'className="bg-white text-slate-900">{t("finances.cat_fine")}</option>');
  content = content.replace('className="bg-white text-slate-900">Khác</option>', 'className="bg-white text-slate-900">{t("finances.cat_other")}</option>');

  // Mobile inputs
  content = content.replace('className="bg-white text-emerald-700 font-bold">+ THU</option>', 'className="bg-white text-emerald-700 font-bold">{t("finances.type_in")}</option>');
  content = content.replace('className="bg-white text-rose-700 font-bold">- CHI</option>', 'className="bg-white text-rose-700 font-bold">{t("finances.type_out")}</option>');
  
  // Empty states
  content = content.replace('Chưa có phiếu thu/chi nào được ghi nhận.', '{t("finances.no_records")}');
  content = content.replace('Chưa có phiếu thu/chi nào.', '{t("finances.no_records")}');

  // Replace + THU / - CHI for tags using a bit of a hack
  content = content.replace(/{row.type === 'IN' \? '\+ THU' : '- CHI'}/g, "{row.type === 'IN' ? '+ IN' : '- OUT'}"); // English/generic tags

  // Text labels on mobile
  content = content.replace('>Mô tả / Ghi chú:</label>', '>{t("finances.desc_col")}:</label>');
  content = content.replace('>Số tiền (VNĐ):</label>', '>{t("finances.amount_col")}:</label>');
  content = content.replace('>Hạng mục:</label>', '>{t("finances.category")}:</label>');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('DataGridTable processed');
}

function processMonthlyFundGrid() {
  const filePath = 'e:\\fcnhatre\\frontend\\src\\components\\MonthlyFundGrid.jsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Add import
  if (!content.includes('useTranslation')) {
    content = content.replace("import { \n  UserPlus,", 
      "import { useTranslation } from 'react-i18next';\nimport { \n  UserPlus,");
  }

  // Add t inside component
  if (!content.includes('const { t } = useTranslation();')) {
    content = content.replace("export default function MonthlyFundGrid({ isAdmin }) {", 
      "export default function MonthlyFundGrid({ isAdmin }) {\n  const { t } = useTranslation();");
  }

  // MONTH_KEYS replacement
  content = content.replace(/label: 'Tháng 1'/g, "label: t('finances.month_prefix') + ' 1'");
  content = content.replace(/label: 'Tháng 2'/g, "label: t('finances.month_prefix') + ' 2'");
  content = content.replace(/label: 'Tháng 3'/g, "label: t('finances.month_prefix') + ' 3'");
  content = content.replace(/label: 'Tháng 4'/g, "label: t('finances.month_prefix') + ' 4'");
  content = content.replace(/label: 'Tháng 5'/g, "label: t('finances.month_prefix') + ' 5'");
  content = content.replace(/label: 'Tháng 6'/g, "label: t('finances.month_prefix') + ' 6'");
  content = content.replace(/label: 'Tháng 7'/g, "label: t('finances.month_prefix') + ' 7'");
  content = content.replace(/label: 'Tháng 8'/g, "label: t('finances.month_prefix') + ' 8'");
  content = content.replace(/label: 'Tháng 9'/g, "label: t('finances.month_prefix') + ' 9'");
  content = content.replace(/label: 'Tháng 10'/g, "label: t('finances.month_prefix') + ' 10'");
  content = content.replace(/label: 'Tháng 11'/g, "label: t('finances.month_prefix') + ' 11'");
  content = content.replace(/label: 'Tháng 12'/g, "label: t('finances.month_prefix') + ' 12'");
  
  // Wait, MONTH_KEYS is defined OUTSIDE the component so we can't use t() there.
  // Instead, let's fix MONTH_KEYS to be defined inside or use t when rendering.
  // We'll revert MONTH_KEYS changes and do it in render instead.
}

processDataGrid();
