const mongoose = require('mongoose');

const FundSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memberName: {
    type: String,
    required: true,
    trim: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: null
  },
  months: [{
    type: String // Deprecated monthly field
  }],
  amount: {
    type: Number,
    required: true,
    min: [1000, 'Số tiền tối thiểu là 1.000đ']
  },
  proofImage: {
    type: String,
    required: true // URL of screenshot / bill image
  },
  note: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: '',
    trim: true
  },
  financeIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Finance'
  }]
}, { timestamps: true });

FundSubmissionSchema.index({ userId: 1, createdAt: -1 });
FundSubmissionSchema.index({ matchId: 1 });
FundSubmissionSchema.index({ status: 1, createdAt: -1 });
FundSubmissionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('FundSubmission', FundSubmissionSchema);
