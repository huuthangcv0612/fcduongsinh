const mongoose = require('mongoose');

const FinanceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: { values: ['IN', 'OUT'], message: '{VALUE} không hợp lệ, phải là IN hoặc OUT' },
    required: true
  },
  category: {
    type: String,
    enum: ['quy_thang', 'tien_san', 'nuoc_uong', 'dong_phuc', 'phat', 'khac'],
    default: 'khac'
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Số tiền phải lớn hơn 0']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fundMonth: {
    type: String, // Format: YYYY-MM
    default: null
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: null
  },
  proofImage: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

FinanceSchema.index({ type: 1, createdAt: -1 });
FinanceSchema.index({ matchId: 1 });
FinanceSchema.index({ fundMonth: 1 });
FinanceSchema.index({ createdAt: -1 });
FinanceSchema.index({ fundMonth: 1, type: 1 });

module.exports = mongoose.model('Finance', FinanceSchema);
