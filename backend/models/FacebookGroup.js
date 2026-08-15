const mongoose = require('mongoose');

const FacebookGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  homeArea: {
    type: String,
    default: 'TP.HCM',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

FacebookGroupSchema.index({ isActive: 1 });

module.exports = mongoose.model('FacebookGroup', FacebookGroupSchema);
