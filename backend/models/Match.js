const mongoose = require('mongoose');

const CheckInItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'joined', 'uncertain', 'absent'],
    default: 'pending'
  },
  reason: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const ScorerSchema = new mongoose.Schema({
  playerName: {
    type: String,
    required: true,
    trim: true
  },
  assisterName: {
    type: String,
    default: '',
    trim: true
  },
  minute: {
    type: String,
    default: '',
    trim: true
  },
  count: {
    type: Number,
    default: 1
  }
}, { _id: false });

const MatchSchema = new mongoose.Schema({
  motm: {
    type: String,
    default: ''
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  time: {
    type: String, // Format: HH:mm
    required: true
  },
  stadium: {
    type: String,
    required: true,
    trim: true
  },
  stadiumLink: {
    type: String,
    default: '',
    trim: true
  },
  pitchCost: {
    type: Number,
    required: true,
    min: [0, 'Tiền sân không được âm']
  },
  deal: {
    type: String,
    default: '5-5', // VD: 5-5, 6-4, thua chịu tiền sân
    trim: true
  },
  kitColor: {
    type: String,
    enum: ['xanh dương', 'xanh', 'đỏ', 'đen', ''], // Giữ lại 'xanh' cho dữ liệu cũ nếu có
    default: ''
  },
  opponent: {
    teamName: { type: String, default: 'Đang cập nhật' },
    phone: { type: String, default: '' },
    fbLink: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', 'cancelled', 'deleted'],
    default: 'upcoming'
  },
  score: {
    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 }
  },
  scorers: [ScorerSchema],
  checkInList: [CheckInItemSchema],
  mvpVotes: [{
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isMvpVotingOpen: {
    type: Boolean,
    default: false
  },
  isMvpFinalized: {
    type: Boolean,
    default: false
  },
  motmReason: {
    type: String,
    default: ''
  },
  resultNotified: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isNotified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

MatchSchema.index({ date: -1 });
MatchSchema.index({ status: 1, date: -1 });
MatchSchema.index({ "checkInList.userId": 1 });

module.exports = mongoose.model('Match', MatchSchema);
