const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  color: {
    type: String,
    default: '#2196F3',
    match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color']
  },
  icon: {
    type: String,
    default: 'category',
    maxlength: [50, 'Icon name cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for user and category name uniqueness
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

// Static method to create default categories for a user
categorySchema.statics.createDefaultCategories = async function(userId) {
  const defaultCategories = [
    { name: 'Food & Dining', color: '#FF6B6B', icon: 'restaurant' },
    { name: 'Transportation', color: '#4ECDC4', icon: 'car' },
    { name: 'Shopping', color: '#45B7D1', icon: 'shopping-bag' },
    { name: 'Entertainment', color: '#96CEB4', icon: 'gamepad' },
    { name: 'House Rent', color: '#FECA57', icon: 'home' },
    { name: 'Utilities', color: '#FF9FF3', icon: 'flash' },
    { name: 'Healthcare', color: '#54A0FF', icon: 'medical' },
    { name: 'Education', color: '#5F27CD', icon: 'school' },
    { name: 'Travel', color: '#00D2D3', icon: 'airplane' },
    { name: 'Savings', color: '#FF9F43', icon: 'piggy-bank' }
  ];

  const categories = defaultCategories.map(cat => ({
    ...cat,
    userId,
    isDefault: true
  }));

  try {
    return await this.insertMany(categories);
  } catch (error) {
    console.error('Error creating default categories:', error);
    throw error;
  }
};

module.exports = mongoose.model('Category', categorySchema);