const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
  },
  source: {
    type: String,
    required: [true, "Income source is required"],
    trim: true,
    maxlength: [100, "Source cannot exceed 100 characters"]
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0.01, "Amount must be greater than 0"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, "Description cannot exceed 200 characters"]
  },
  date: {
    type: Date,
    required: [true, "Date is required"],
    default: Date.now
  },
  category: {
    type: String,
    enum: ["salary", "freelance", "business", "investment", "gift", "bonus", "other"],
    default: "other"
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly"],
    required: function() {
      return this.isRecurring;
    }
  },
  recurringEndDate: {
    type: Date,
    validate: {
      validator: function(value) {
        if (this.isRecurring && value) {
          return value > new Date();
        }
        return true;
      },
      message: "Recurring end date must be in the future"
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, "Tag cannot exceed 30 characters"]
  }],
  notes: {
    type: String,
    maxlength: [500, "Notes cannot exceed 500 characters"]
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model("Income", incomeSchema);