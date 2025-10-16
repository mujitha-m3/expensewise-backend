const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: [true, "Category ID is required"]
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0.01, "Amount must be greater than 0"]
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
    maxlength: [200, "Description cannot exceed 200 characters"]
  },
  date: {
    type: Date,
    required: [true, "Date is required"],
    default: Date.now
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, "Tag cannot exceed 30 characters"]
  }],
  receipt: {
    url: String,
    filename: String
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
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  notes: {
    type: String,
    maxlength: [500, "Notes cannot exceed 500 characters"]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Expense", expenseSchema);