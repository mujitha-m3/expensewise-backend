const userService = require('../services/userService');
const { validatePassword } = require('../utils/password');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  storeRefreshToken,
  validateRefreshToken,
  removeRefreshToken,
  removeAllRefreshTokens
} = require('../utils/jwt');
const validator = require('validator');
const { User } = require('../models');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { email, password, name, currency } = req.body;

      // Input validation
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and name are required',
          errors: {
            email: !email ? 'Email is required' : null,
            password: !password ? 'Password is required' : null,
            name: !name ? 'Name is required' : null
          }
        });
      }

      // Validate email format
      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          errors: { email: 'Please provide a valid email address' }
        });
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet security requirements',
          errors: { 
            password: passwordValidation.errors,
            strength: passwordValidation.strength
          }
        });
      }

      // Validate name length
      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long',
          errors: { name: 'Name is too short' }
        });
      }

      // Create user
      const user = await userService.createUser({
        email: email.toLowerCase().trim(),
        password,
        name: name.trim(),
        currency: currency || 'LKR'
      });

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Store refresh token
      await storeRefreshToken(user.id, refreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            currency: user.currency,
            emailVerified: user.email_verified,
            createdAt: user.created_at
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '15m'
          }
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
          errors: { email: 'This email is already registered' }
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during registration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Input validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
          errors: {
            email: !email ? 'Email is required' : null,
            password: !password ? 'Password is required' : null
          }
        });
      }

      // Validate email format
      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          errors: { email: 'Please provide a valid email address' }
        });
      }

      // Authenticate user
      const user = await userService.authenticateUser(email.toLowerCase().trim(), password);

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Store refresh token
      await storeRefreshToken(user.id, refreshToken);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            currency: user.currency,
            emailVerified: user.email_verified,
            lastLogin: user.updated_at
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '15m'
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message.includes('Invalid credentials')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          errors: { credentials: 'Please check your email and password' }
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
          errors: { refreshToken: 'Refresh token is missing' }
        });
      }

      // Validate refresh token
      const decoded = await validateRefreshToken(refreshToken);

      // Get fresh user data
      const user = await userService.getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          errors: { user: 'User account no longer exists' }
        });
      }

      // Generate new tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name
      };

      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      // Remove old refresh token and store new one
      await removeRefreshToken(refreshToken);
      await storeRefreshToken(user.id, newRefreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '15m'
          }
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        errors: { refreshToken: 'Please login again' }
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (refreshToken) {
        // Remove specific refresh token
        await removeRefreshToken(refreshToken);
      } else if (userId) {
        // If no refresh token provided but user is authenticated,
        // remove all tokens for security
        await removeAllRefreshTokens(userId);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if there's an error, we should return success for logout
      res.json({
        success: true,
        message: 'Logout completed'
      });
    }
  }

  // Logout from all devices
  async logoutAll(req, res) {
    try {
      const userId = req.user.id;

      // Remove all refresh tokens for this user
      await removeAllRefreshTokens(userId);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });

    } catch (error) {
      console.error('Logout all error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error logging out from all devices',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          errors: { user: 'User account no longer exists' }
        });
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            currency: user.currency,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving user profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { name, email, currency, financial_goals, monthlyBudget, monthlyIncome } = req.body;
      
      // Handle both req.user.id and req.user._id (depending on authMiddleware implementation)
      const userId = req.user.id || req.user._id || req.user.userId;
      
      console.log('Profile update request:', { userId, body: req.body });

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      // Update user in database
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          name: name,
          email: email,
          currency: currency,
          financial_goals: financial_goals,
          monthlyBudget: monthlyBudget,
          monthlyIncome: monthlyIncome
        },
        { new: true, runValidators: true }
      ).select('-password'); // Don't send password back

      if (!updatedUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      res.json({
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update profile',
        error: error.message 
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Input validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
          errors: {
            currentPassword: !currentPassword ? 'Current password is required' : null,
            newPassword: !newPassword ? 'New password is required' : null
          }
        });
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'New password does not meet security requirements',
          errors: { 
            newPassword: passwordValidation.errors,
            strength: passwordValidation.strength
          }
        });
      }

      await userService.changePassword(userId, currentPassword, newPassword);

      // Remove all refresh tokens to force re-login on all devices
      await removeAllRefreshTokens(userId);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again on all devices.'
      });

    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message.includes('Current password is incorrect')) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
          errors: { currentPassword: 'The current password you entered is wrong' }
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error changing password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new AuthController();