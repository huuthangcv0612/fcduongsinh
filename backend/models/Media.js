const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  title: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['image', 'video', 'link'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Media', MediaSchema);
