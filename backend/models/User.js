const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  googleId: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  role: {
    type: String,
    enum: ['admin', 'treasurer', 'member', 'pending'],
    default: 'pending'
  },
  roles: {
    type: [{
      type: String,
      enum: ['admin', 'treasurer', 'member', 'pending']
    }],
    default: function() {
      return this.role ? [this.role] : ['pending'];
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  monthlyFund: {
    type: Number,
    default: 200000 // 200k VNĐ / tháng
  },
  phone: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    enum: ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo', 'Tự do'],
    default: 'Tự do'
  },
  stats: {
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    motm: { type: Number, default: 0 },
    appearances: { type: Number, default: 0 }
  }
}, { timestamps: true });

UserSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', UserSchema);
