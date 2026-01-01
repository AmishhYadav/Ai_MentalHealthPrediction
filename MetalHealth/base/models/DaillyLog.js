const mongoose = require('mongoose');

const DailyLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  entry: {
    type: String,
    required: true
  },
  output1: {
    type: String,
    required: true
  },
  output2: {
    type: String,
    required: true
  },
  output3: {
    type: String,
    required: true
  },
  output4: {
    type: String,
    required: true
  },
  finalOutput: {
    type: String,
    required: true
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
DailyLogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better performance
DailyLogSchema.index({ userId: 1, date: 1 });
DailyLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DailyLog', DailyLogSchema);
