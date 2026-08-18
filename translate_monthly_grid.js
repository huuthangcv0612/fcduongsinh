const fs = require('fs');

function processMonthlyFundGrid() {
  const filePath = 'e:\\fcnhatre\\frontend\\src\\components\\MonthlyFundGrid.jsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Imports
  if (!content.includes('useTranslation')) {
    content = content.replace("import { \n  UserPlus,", "import { useTranslation } from 'react-i18next';\nimport { \n  UserPlus,");
  }
  if (!content.includes('const { t } = useTranslation();')) {
    content = content.replace("export default function MonthlyFundGrid({ isAdmin }) {", "export default function MonthlyFundGrid({ isAdmin }) {\n  const { t } = useTranslation();");
  }

  // To translate MONTH_KEYS, let's map over them when they are used, or change `label` to `t('finances.month_prefix') + ' ' + num`.
  // Actually, they are rendered like `m.label`. We can change `{m.label}` to `{t('finances.month_prefix')} {m.key.replace('m', '')}` everywhere.
  // There are two places: `m.label` (in header) and `m.label` in `handleCellClick`.
  content = content.replace(/\{m\.label\}/g, "{`${t('finances.month_prefix')} ${m.key.replace('m', '')}`}");
  
  // inside handleCellClick: monthObj ? monthObj.label : monthKey
  // => monthObj ? `${t('finances.month_prefix')} ${monthKey.replace('m', '')}` : monthKey
  // Wait, `t` is not accessible outside if we don't pass it. But handleCellClick is inside the component.
  content = content.replace(/monthObj \? monthObj\.label : monthKey/, "monthObj ? `${t('finances.month_prefix')} ${monthKey.replace('m', '')}` : monthKey");

  // Notifications
  content = content.replace(/'Đã lưu số tiền đóng quỹ thành công!'/, "t('finances.save_fund_success')");
  content = content.replace(/'Cập Nhật Quỹ'/, "t('finances.update_fund_title')");
  content = content.replace(/'Lỗi khi cập nhật ô số tiền'/, "t('finances.update_fund_error')");
  content = content.replace(/'Lỗi'/g, "t('finances.error_title')");
  content = content.replace(/'Đã tạo thành viên mới trong DB và thêm vào Bảng Quỹ!'/, "t('finances.add_member_success')");
  content = content.replace(/'Thêm Thành Viên DB'/, "t('finances.add_member_title')");
  content = content.replace(/'Lỗi khi thêm thành viên'/, "t('finances.add_member_error')");
  content = content.replace(/'Đã xóa thành viên khỏi bảng quỹ!'/, "t('finances.delete_member_success')");
  content = content.replace(/'Đã xóa'/, "t('finances.delete_member_title')");
  content = content.replace(/'Lỗi khi xóa thành viên'/, "t('finances.delete_member_error')");

  content = content.replace(/'Xóa Thành Viên Khỏi Bảng Quỹ'/, "t('finances.delete_member_confirm_title')");
  content = content.replace(/`Bạn có chắc chắn muốn xóa "\$\{name\}" khỏi Bảng Quỹ Năm \$\{selectedYear\}\?`/, "t('finances.delete_member_confirm_msg', { name, year: selectedYear })");
  content = content.replace(/'Xóa Ngay'/, "t('finances.delete_member_confirm_btn')");
  content = content.replace(/'Hủy'/g, "t('finances.cancel')");

  // HTML content
  content = content.replace(/📊 Quản Lý Quỹ Đội Bóng \(\{selectedYear\}\)/, "📊 {t('finances.grid_title')} ({selectedYear})");
  content = content.replace(/Bảng theo dõi thu quỹ \(\{gridData\.length\} thành viên\)\./, "{t('finances.grid_subtitle', { count: gridData.length })}");
  
  content = content.replace(/>Năm:</, ">{t('finances.year')}</");
  content = content.replace(/>Năm 2025</, ">{t('finances.year_val', { year: 2025 })}</");
  content = content.replace(/>Năm 2026</, ">{t('finances.year_val', { year: 2026 })}</");
  content = content.replace(/\+ Thêm Thành Viên/, "{t('finances.add_member_btn')}");

  // Table header
  content = content.replace(/>STT</, ">{t('finances.stt')}</");
  content = content.replace(/>Thành viên</, ">{t('finances.member_col')}</");
  content = content.replace(/>Tổng đã đóng</, ">{t('finances.total_paid_col')}</");
  content = content.replace(/>Thao tác</, ">{t('finances.action_col')}</");
  
  content = content.replace(/Chưa có thành viên nào trong Bảng Quỹ \{selectedYear\}\. Bấm "\+ Thêm Thành Viên" ở trên để khởi tạo\./, "{t('finances.no_members', { year: selectedYear })}");

  content = content.replace(/🟢 TỔNG THU THEO THÁNG/, "🟢 {t('finances.total_in_month')}");
  content = content.replace(/🔴 CHI TIÊU THEO THÁNG/, "🔴 {t('finances.total_out_month')}");
  content = content.replace(/💎 TỔNG DƯ THÁNG/, "💎 {t('finances.total_net_month')}");

  // Modal
  content = content.replace(/✏️ Điền Quỹ \{editingCell\.monthLabel\}/, "✏️ {t('finances.edit_fund_title')} {editingCell.monthLabel}");
  content = content.replace(/>Cầu thủ:</, ">{t('finances.player')}</");
  content = content.replace(/\(Năm \{selectedYear\}\)/, "({t('finances.year_val', { year: selectedYear })})");
  
  content = content.replace(/Chọn nhanh số tiền nộp quỹ:/, "{t('finances.quick_amount')}");
  content = content.replace(/Số tiền tùy chỉnh \(VNĐ\):/, "{t('finances.custom_amount')}");
  content = content.replace(/>Clear \(0 đ\)</, ">{t('finances.clear_btn')}</");
  
  content = content.replace(/>Lưu Số Tiền</, ">{t('finances.save_amount_btn')}</");

  content = content.replace(/👤 Thêm Thành Viên Mới Vào DB & Bảng Quỹ/, "👤 {t('finances.add_db_member_title')}");
  content = content.replace(/Tạo thành viên chính thức trong MongoDB\. Mặc định các tháng sẽ khởi tạo với số tiền <strong.*?>0 đ\/tháng<\/strong> \(Nhấp vào từng ô để điền\)\./, "{t('finances.add_db_member_sub')}");

  content = content.replace(/Họ và tên thành viên:/, "{t('finances.fullname_label')}");
  content = content.replace(/"Nhập tên thành viên..."/, "t('finances.fullname_placeholder')");
  content = content.replace(/\+ Thêm Vào Database/, "{t('finances.add_to_db_btn')}");

  fs.writeFileSync(filePath, content, 'utf8');
}

function processSendEmail() {
  const filePath = 'e:\\fcnhatre\\frontend\\src\\components\\SendFundEmailModal.jsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Imports
  if (!content.includes('useTranslation')) {
    content = content.replace("import { Mail, Upload, X, Check, Loader2 } from 'lucide-react';", "import { Mail, Upload, X, Check, Loader2 } from 'lucide-react';\nimport { useTranslation } from 'react-i18next';");
  }
  if (!content.includes('const { t } = useTranslation();')) {
    content = content.replace("export default function SendFundEmailModal({ isOpen, onClose }) {", "export default function SendFundEmailModal({ isOpen, onClose }) {\n  const { t } = useTranslation();");
  }

  content = content.replace(/"Kích thước ảnh quá lớn \(Tối đa 5MB\)"/, "t('finances.qr_too_large')");
  
  // `Tháng ${currentMonth}` => t('finances.month_prefix') + ` ${currentMonth}`
  content = content.replace(/`Tháng \$\{currentMonth\}`/g, "`${t('finances.month_prefix')} ${currentMonth}`");
  content = content.replace(/>Tháng \{m\}</g, ">{t('finances.month_prefix')} {m}<");
  
  content = content.replace(/'Đã gửi Email và Push thông báo thành công!'/, "t('finances.send_success_both')");
  content = content.replace(/'Đã gửi Push thông báo thành công!'/, "t('finances.send_success_push')");
  content = content.replace(/'Lỗi khi gửi email. Vui lòng thử lại sau.'/, "t('finances.send_error')");

  content = content.replace(/Gửi Thông Báo Đóng Quỹ/, "{t('finances.send_email_title')}");
  content = content.replace(/Hệ thống sẽ gửi email đồng loạt đến tất cả các thành viên\./, "{t('finances.send_email_sub')}");
  content = content.replace(/Tháng thu quỹ/, "{t('finances.fund_month_label')}");
  content = content.replace(/Lời nhắn \(Tùy chọn\)/, "{t('finances.message_label')}");
  content = content.replace(/"Nhập lời nhắn đến đội..."/, "t('finances.message_placeholder')");
  content = content.replace(/Ảnh QR Ngân hàng/, "{t('finances.qr_image_label')}");
  content = content.replace(/Nhấn để tải lên mã QR/, "{t('finances.click_upload_qr')}");
  content = content.replace(/PNG, JPG tối đa 5MB/, "{t('finances.qr_hint')}");
  content = content.replace(/Đổi ảnh khác/, "{t('finances.change_image')}");
  
  content = content.replace(/Đồng thời gửi Email đến toàn đội <br\/>/, "{t('finances.also_send_email')} <br/>");
  content = content.replace(/\(Nếu tắt, sẽ chỉ gửi thông báo Push Notification\)/, "{t('finances.also_send_email_hint')}");

  content = content.replace(/'Đang gửi\.\.\.'/, "t('finances.sending')");
  content = content.replace(/'Gửi Thông Báo'/, "t('finances.send_notification_btn')");
  content = content.replace(/>Hủy</, ">{t('finances.cancel')}<");

  fs.writeFileSync(filePath, content, 'utf8');
}

processMonthlyFundGrid();
processSendEmail();
