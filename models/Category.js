const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  icon: {
    type: String,
    required: [true, 'Category icon is required'],
    trim: true
  },
  color: {
    type: String,
    required: [true, 'Category color is required'],
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  budgetLimit: {
    type: Number,
    default: null,
    min: [0, 'Budget limit cannot be negative']
  }
}, {
  timestamps: true
});

// Create compound index for user and category name uniqueness
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

// Add instance method to format category for response
categorySchema.methods.toJSON = function() {
  const categoryObject = this.toObject();
  return categoryObject;
};

module.exports = mongoose.model('Category', categorySchema);