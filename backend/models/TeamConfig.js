const mongoose = require('mongoose');

const TeamConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'fund_config'
  },
  bankName: {
    type: String,
    default: 'MB Bank'
  },
  bankCode: {
    type: String,
    default: 'MB' // Used for VietQR (MB, VCB, ACB, ICB, TCB, etc.)
  },
  accountNumber: {
    type: String,
    default: '0352526868'
  },
  accountName: {
    type: String,
    default: 'TRAN DUC HOANG'
  },
  monthlyFee: {
    type: Number,
    default: 200000 // 200k VNĐ / tháng
  },
  qrTemplate: {
    type: String,
    default: 'compact2'
  },
  customQrUrl: {
    type: String,
    default: ''
  },
  transferPrefix: {
    type: String,
    default: 'FCNHATRE'
  },
  note: {
    type: String,
    default: 'Vui lòng chuyển khoản đúng cú pháp để hệ thống tự động ghi nhận'
  }
}, { timestamps: true });

module.exports = mongoose.model('TeamConfig', TeamConfigSchema);
