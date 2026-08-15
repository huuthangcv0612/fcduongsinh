const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'team.fc.nhatre@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'xxxx'
  }
});

async function sendMatchNotification(users, match) {
  if (!users || users.length === 0) return;

  const emails = users.map(u => u.email).filter(Boolean);
  if (emails.length === 0) return;

  const dateObj = new Date(match.date);
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  let formattedDate = match.date;
  try {
    const parts = match.date.split('-');
    if (parts.length === 3) {
      formattedDate = `${days[dateObj.getDay()]}, ${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {}

  const mailOptions = {
    from: `"FC Nhà Trẻ" <${process.env.GMAIL_USER || 'team.fc.nhatre@gmail.com'}>`,
    to: emails.join(','),
    subject: `⚽ [FC Nhà Trẻ] THÔNG BÁO TRẬN ĐẤU MỚI - ${formattedDate} lúc ${match.time}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 10px;">
        <h2 style="color: #38bdf8;">⚽ TRẬN ĐẤU MỚI ĐÃ ĐƯỢC TẠO!</h2>
        <p>Thành viên FC Nhà Trẻ lưu ý trận đấu tiếp theo:</p>
        <ul style="line-height: 1.8;">
          <li><b>📅 Ngày thi đấu:</b> ${formattedDate}</li>
          <li><b>⏰ Giờ đá:</b> ${match.time}</li>
          <li><b>🏟️ Sân bóng:</b> ${match.stadiumLink ? `<a href="${match.stadiumLink}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${match.stadium} (Xem Bản Đồ)</a>` : match.stadium}</li>
          <li><b>👕 Màu áo thi đấu:</b> ${match.kitColor ? `Áo ${match.kitColor}` : 'Chưa chốt'}</li>
          <li><b>🤝 Đối thủ:</b> ${match.opponent?.teamName || 'Đang cập nhật'}</li>
          <li><b>💵 Tiền sân / Keo:</b> ${match.pitchCost?.toLocaleString('vi-VN')} VNĐ (${match.deal})</li>
        </ul>
        <div style="margin-top: 20px; padding: 15px; background: #1e293b; border-left: 4px solid #10b981; border-radius: 4px; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px;">⚡ ĐĂNG NHẬP ỨNG DỤNG ĐỂ CHECK-IN NGAY</a>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Match notification email sent:', info.messageId);
  } catch (err) {
    console.warn('⚠️ Nodemailer warning (email not sent, but match created):', err.message);
  }
}

async function sendFundNotification(users, month, message, qrUrl) {
  if (!users || users.length === 0) return;

  const emails = users.map(u => u.email).filter(Boolean);
  if (emails.length === 0) return;

  const mailOptions = {
    from: `"FC Nhà Trẻ" <${process.env.GMAIL_USER || 'team.fc.nhatre@gmail.com'}>`,
    to: emails.join(','),
    subject: `💰 [FC Nhà Trẻ] THÔNG BÁO ĐÓNG QUỸ - ${month}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 10px; max-width: 600px; margin: auto;">
        <h2 style="color: #10b981; text-align: center;">💰 THÔNG BÁO ĐÓNG QUỸ ĐỘI</h2>
        <p style="font-size: 16px;">Kính gửi các thành viên FC Nhà Trẻ,</p>
        <p style="font-size: 16px;">Ban cán sự thông báo thu quỹ đội cho <b>${month}</b>.</p>
        
        ${message ? `<div style="background: #1e293b; padding: 15px; border-left: 4px solid #38bdf8; border-radius: 4px; margin: 20px 0;"><p style="margin: 0; font-style: italic;">"${message}"</p></div>` : ''}
        
        ${qrUrl ? `
        <div style="text-align: center; margin-top: 30px;">
          <p style="font-weight: bold; color: #f8fafc; font-size: 18px;">📲 QUÉT MÃ QR ĐỂ THANH TOÁN</p>
          <img src="${qrUrl}" alt="QR Ngân Hàng" style="max-width: 300px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 2px solid #10b981;" />
        </div>
        ` : ''}

        <div style="margin-top: 30px; text-align: center; padding-top: 20px; border-top: 1px solid #334155;">
          <p style="color: #94a3b8; font-size: 14px;">Mọi thắc mắc xin vui lòng liên hệ Thủ quỹ hoặc Đội trưởng.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Fund notification email sent:', info.messageId);
  } catch (err) {
    console.warn('⚠️ Nodemailer warning (fund email not sent):', err.message);
  }
}

module.exports = {
  sendMatchNotification,
  sendFundNotification
};
