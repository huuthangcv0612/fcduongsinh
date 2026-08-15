const mongoose = require('mongoose');

const OpponentSchema = new mongoose.Schema({
  teamName: {
    type: String,
    default: 'Chưa rõ'
  },
  stadiumName: {
    type: String,
    default: 'Chưa chốt sân'
  },
  matchTime: {
    type: String, // HH:mm
    default: null
  },
  matchDay: {
    type: String, // e.g. "Thứ 3", "Thứ 7", "2026-08-12"
    default: null
  },
  homeArea: {
    type: String,
    default: 'Hà Nội'
  },
  level: {
    type: String,
    enum: ['Mềm', 'Trung bình', 'Cứng', 'Chưa rõ'],
    default: 'Trung bình'
  },
  contactPhone: {
    type: String,
    default: null
  },
  posterFbUrl: {
    type: String,
    default: ''
  },
  sourceUrl: {
    type: String,
    unique: true,
    sparse: true
  },
  rawText: {
    type: String,
    required: true
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  isSaved: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

OpponentSchema.index({ scrapedAt: -1 });
OpponentSchema.index({ isSaved: 1 });

module.exports = mongoose.model('Opponent', OpponentSchema);
