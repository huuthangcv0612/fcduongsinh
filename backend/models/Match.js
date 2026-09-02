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

const ConcededGoalSchema = new mongoose.Schema({
  playerName: {
    type: String,
    default: '',
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  errorType: {
    type: String,
    enum: ['mat_bong', 'chuyen_hong', 'phan_luoi', 'bat_hut', 'kem_nguoi', 'khong_loi', 'khac'],
    default: 'mat_bong'
  },
  minute: {
    type: String,
    default: '',
    trim: true
  },
  note: {
    type: String,
    default: '',
    trim: true
  }
}, { _id: false });

const StarterSchema = new mongoose.Schema({
  positionKey: {
    type: String,
    required: true
  },
  positionName: {
    type: String,
    default: ''
  },
  x: {
    type: Number,
    default: 50
  },
  y: {
    type: Number,
    default: 50
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isCaptain: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const LineupSchema = new mongoose.Schema({
  formation: {
    type: String,
    enum: ['3-2-1', '2-3-1', '2-1-2-1', '3-1-2', '1-4-1', 'custom'],
    default: '3-2-1'
  },
  starters: [StarterSchema],
  substitutes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tacticsNote: {
    type: String,
    default: ''
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date,
    default: null
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
  concededGoals: [ConcededGoalSchema],
  checkInList: [CheckInItemSchema],
  lineup: {
    type: LineupSchema,
    default: () => ({
      formation: '3-2-1',
      starters: [],
      substitutes: [],
      tacticsNote: '',
      isPublished: false
    })
  },
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
