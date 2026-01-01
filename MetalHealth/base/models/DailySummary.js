const mongoose = require('mongoose');

const DailySummarySchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  summary: {
    type: String,
    required: true,
    trim: true
  },
  isSynthetic: {
    type: Boolean,
    default: false
  },
  aiAnalysis: {
    summary: {
      type: String,
      default: ''
    },
    mood_indicators: {
      type: String,
      default: ''
    },
    patterns: {
      type: String,
      default: ''
    },
    insights: {
      type: String,
      default: ''
    },
    suggestions: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
DailySummarySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better performance
DailySummarySchema.index({ userId: 1, date: 1 }, { unique: true }); // One summary per user per day
DailySummarySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DailySummary', DailySummarySchema);
