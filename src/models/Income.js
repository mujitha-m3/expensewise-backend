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
  },
  // ADDED: Sync field to store SQLite ID for reference
  api_id: {
    type: String,
    // This stores the SQLite ID for sync reference
    index: true
  },
  // ADDED: Sync status fields
  sync_status: {
    type: String,
    enum: ["pending", "synced", "failed"],
    default: "pending"
  },
  last_sync_at: {
    type: Date
  },
  // ADDED: Version field for conflict resolution
  version: {
    type: Number,
    default: 1
  },
  // ADDED: Metadata for sync
  metadata: {
    created_locally: {
      type: Boolean,
      default: true
    },
    last_modified: {
      type: Date,
      default: Date.now
    },
    device_id: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, category: 1 });
incomeSchema.index({ userId: 1, api_id: 1 }); // For sync lookups
incomeSchema.index({ userId: 1, sync_status: 1 }); // For sync queries
incomeSchema.index({ userId: 1, last_sync_at: 1 }); // For sync performance

// Virtual for formatted amount
incomeSchema.virtual('formattedAmount').get(function() {
  return `€${this.amount.toFixed(2)}`;
});

// Virtual for display category
incomeSchema.virtual('displayCategory').get(function() {
  return this.category.charAt(0).toUpperCase() + this.category.slice(1);
});

// Pre-save middleware to update last_modified
incomeSchema.pre('save', function(next) {
  this.metadata.last_modified = new Date();
  this.version += 1;
  next();
});

// Static method to find by API ID (SQLite ID)
incomeSchema.statics.findByApiId = function(apiId, userId) {
  return this.findOne({ api_id: apiId, userId: userId });
};

// Static method to find unsynced records
incomeSchema.statics.findUnsynced = function(userId) {
  return this.find({ 
    userId: userId, 
    sync_status: { $in: ["pending", "failed"] } 
  });
};

// Static method to get monthly summary
incomeSchema.statics.getMonthlySummary = function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
        avgAmount: { $avg: "$amount" },
        maxAmount: { $max: "$amount" },
        minAmount: { $min: "$amount" }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Instance method to mark as synced
incomeSchema.methods.markAsSynced = function() {
  this.sync_status = "synced";
  this.last_sync_at = new Date();
  return this.save();
};

// Instance method to mark as pending sync
incomeSchema.methods.markAsPending = function() {
  this.sync_status = "pending";
  return this.save();
};

// Instance method to prepare for sync (convert to frontend format)
incomeSchema.methods.toSyncFormat = function() {
  return {
    source: this.source,
    amount: this.amount,
    description: this.description,
    date: this.date,
    category: this.category,
    isRecurring: this.isRecurring,
    recurringFrequency: this.recurringFrequency,
    recurringEndDate: this.recurringEndDate,
    tags: this.tags,
    notes: this.notes,
    api_id: this.api_id,
    _id: this._id,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to create from frontend data
incomeSchema.statics.createFromFrontend = function(userId, frontendData) {
  const {
    source,
    amount,
    description,
    startDate,
    frequency,
    type,
    isRecurring = true,
    api_id
  } = frontendData;

  // Map frontend fields to backend schema
  const mappedData = {
    userId: userId,
    source: source,
    amount: amount,
    description: description || source,
    date: startDate ? new Date(startDate) : new Date(),
    category: type === 'primary' ? 'salary' : 
              type === 'secondary' ? 'freelance' : 'other',
    isRecurring: isRecurring,
    recurringFrequency: frequency,
    api_id: api_id,
    sync_status: "pending"
  };

  return this.create(mappedData);
};

// Static method to update from frontend data
incomeSchema.statics.updateFromFrontend = function(incomeId, userId, updateData) {
  const {
    source,
    amount,
    description,
    startDate,
    frequency,
    type,
    isRecurring = true
  } = updateData;

  // Map frontend fields to backend schema
  const mappedUpdate = {
    source: source,
    amount: amount,
    description: description || source,
    date: startDate ? new Date(startDate) : new Date(),
    category: type === 'primary' ? 'salary' : 
              type === 'secondary' ? 'freelance' : 'other',
    isRecurring: isRecurring,
    recurringFrequency: frequency,
    sync_status: "pending", // Mark as needing sync back to frontend
    "metadata.last_modified": new Date()
  };

  // Remove undefined fields
  Object.keys(mappedUpdate).forEach(key => {
    if (mappedUpdate[key] === undefined) {
      delete mappedUpdate[key];
    }
  });

  return this.findOneAndUpdate(
    { _id: incomeId, userId: userId },
    mappedUpdate,
    { new: true, runValidators: true }
  );
};

module.exports = mongoose.model("Income", incomeSchema);