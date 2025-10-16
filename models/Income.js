const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  source: {
    type: String,
    required: [true, 'Income source is required'],
    enum: ['salary', 'freelance', 'business', 'investment', 'rental', 'bonus', 'gift', 'other'],
    default: 'salary'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: null
  },
  taxable: {
    type: Boolean,
    default: true
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: [3, 'Currency code cannot exceed 3 characters']
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, source: 1 });
incomeSchema.index({ userId: 1, createdAt: -1 });

// Virtual for formatted date
incomeSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

module.exports = mongoose.model('Income', incomeSchema);