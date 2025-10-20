const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  categoryId: {
    type: String, // Can be null for default categories
    default: null
  },
  categoryName: {
    type: String,
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  budgetLimit: {
    type: Number,
    default: null
  },
  templateId: {
    type: String, // Reference to SQLite template_id
    required: true
  },
  bucketName: {
    type: String, // Reference to SQLite bucket name
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
allocationSchema.index({ userId: 1, categoryName: 1 });
allocationSchema.index({ templateId: 1 });

module.exports = mongoose.model('Allocation', allocationSchema);