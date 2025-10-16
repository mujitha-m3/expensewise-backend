const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');

const router = express.Router();

// JWT token generation
const signToken = (id) => {
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Create and send JWT token
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user
    }
  });
};

// Validation middleware
const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return value;
    })
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', authLimiter, validateRegistration, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, name, monthlyBudget, monthlyIncome } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Prepare user data - handle both name formats
    const userData = {
      email,
      password,
      monthlyBudget: monthlyBudget || 0,
      monthlyIncome: monthlyIncome || 0
    };

    // Handle name fields
    if (firstName && lastName) {
      userData.firstName = firstName;
      userData.lastName = lastName;
      userData.name = `${firstName} ${lastName}`.trim();
    } else if (name) {
      userData.name = name;
      const nameParts = name.split(' ');
      userData.firstName = nameParts[0] || '';
      userData.lastName = nameParts.slice(1).join(' ') || '';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Name is required (either "name" or "firstName" and "lastName")'
      });
    }

    // Create new user
    const newUser = await User.create(userData);

    // Create default categories for the new user
    const Category = require('../models/Category');
    const defaultCategories = [
      { name: 'Food & Dining', icon: 'restaurant', color: '#FF6B6B', userId: newUser._id },
      { name: 'Transportation', icon: 'car', color: '#4ECDC4', userId: newUser._id },
      { name: 'Shopping', icon: 'shopping-bag', color: '#45B7D1', userId: newUser._id },
      { name: 'Entertainment', icon: 'tv', color: '#96CEB4', userId: newUser._id },
      { name: 'Bills & Utilities', icon: 'receipt', color: '#FFEAA7', userId: newUser._id },
      { name: 'Healthcare', icon: 'heart', color: '#DDA0DD', userId: newUser._id },
      { name: 'Education', icon: 'book', color: '#98D8C8', userId: newUser._id },
      { name: 'Travel', icon: 'airplane', color: '#F7DC6F', userId: newUser._id },
      { name: 'Other', icon: 'more-horizontal', color: '#BDC3C7', userId: newUser._id }
    ];

    await Category.insertMany(defaultCategories);

    // Send response with JWT token
    createSendToken(newUser, 201, res);

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordCorrect = await user.correctPassword(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Send response with JWT token
    createSendToken(user, 200, res);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// @desc    Debug endpoint to check if our changes are loaded
// @route   GET /api/auth/debug
// @access  Public
router.get('/debug', (req, res) => {
  res.json({
    message: "Debug endpoint active - our changes are loaded!",
    timestamp: new Date().toISOString(),
    hasDebugging: true
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('monthlyBudget')
    .optional()
    .isNumeric()
    .withMessage('Monthly budget must be a number'),
  body('monthlyIncome')
    .optional()
    .isNumeric()
    .withMessage('Monthly income must be a number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedFields = ['firstName', 'lastName', 'monthlyBudget', 'monthlyIncome', 'preferences'];
    const updates = {};
    
    // Filter allowed fields
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return value;
    })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    if (!(await user.correctPassword(currentPassword, user.password))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// @desc    Delete user account
// @route   DELETE /api/auth/account
// @access  Private
router.delete('/account', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete all user data
    const Expense = require('../models/Expense');
    const Income = require('../models/Income');
    const Category = require('../models/Category');

    await Promise.all([
      Expense.deleteMany({ userId: req.user.userId }),
      Income.deleteMany({ userId: req.user.userId }),
      Category.deleteMany({ userId: req.user.userId }),
      User.findByIdAndDelete(req.user.userId)
    ]);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

module.exports = router;