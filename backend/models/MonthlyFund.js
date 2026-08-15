const mongoose = require('mongoose');

const MonthlyFundSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  memberName: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  months: {
    m1: { type: Number, default: 200000 },
    m2: { type: Number, default: 200000 },
    m3: { type: Number, default: 200000 },
    m4: { type: Number, default: 200000 },
    m5: { type: Number, default: 200000 },
    m6: { type: Number, default: 200000 },
    m7: { type: Number, default: 200000 },
    m8: { type: Number, default: 200000 },
    m9: { type: Number, default: 200000 },
    m10: { type: Number, default: 200000 },
    m11: { type: Number, default: 200000 },
    m12: { type: Number, default: 200000 }
  }
}, { timestamps: true });

MonthlyFundSchema.index({ year: 1, memberName: 1 });

module.exports = mongoose.model('MonthlyFund', MonthlyFundSchema);
