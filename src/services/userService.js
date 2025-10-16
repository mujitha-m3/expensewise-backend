const { User } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const validator = require('validator');

class UserService {
  // Create new user
  async createUser(userData) {
    try {
      const { email, password, name, currency = 'LKR' } = userData;

      // Validate input
      if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
      }

      // Validate email format
      if (!validator.isEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create user (password will be hashed by pre-save hook)
      const user = new User({
        email: email.toLowerCase().trim(),
        password,
        name: name.trim(),
        currency
      });

      await user.save();

      // Return user without password
      return {
        id: user._id,
        email: user.email,
        name: user.name,
        currency: user.currency,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      return user;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error('Failed to retrieve user');
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error('Failed to retrieve user');
    }
  }

  // Authenticate user
  async authenticateUser(email, password) {
    try {
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login time
      user.lastLoginAt = new Date();
      await user.save();

      // Return user without password
      return {
        id: user._id,
        email: user.email,
        name: user.name,
        currency: user.currency,
        lastLoginAt: user.lastLoginAt
      };
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUser(userId, updateData) {
    try {
      const { name, currency } = updateData;
      const updateFields = {};

      if (name !== undefined) {
        updateFields.name = name.trim();
      }

      if (currency !== undefined) {
        updateFields.currency = currency;
      }

      if (Object.keys(updateFields).length === 0) {
        throw new Error('No valid fields to update');
      }

      const user = await User.findByIdAndUpdate(
        userId, 
        updateFields, 
        { new: true, runValidators: true }
      ).select('-password');

      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password (will be hashed by pre-save hook)
      user.password = newPassword;
      await user.save();

      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
}

module.exports = new UserService();