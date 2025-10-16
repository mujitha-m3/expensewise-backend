const database = require('../config/database');
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
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const result = await database.run(
        `INSERT INTO users (email, password_hash, name, currency) 
         VALUES (?, ?, ?, ?)`,
        [email.toLowerCase().trim(), passwordHash, name.trim(), currency]
      );

      const userId = result.id;

      // Copy default categories for the new user
      await this.createDefaultCategoriesForUser(userId);

      // Create default user preferences
      await this.createDefaultPreferences(userId);

      // Return user without password
      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await database.get(
        `SELECT id, email, name, currency, is_active, email_verified, 
                created_at, updated_at 
         FROM users WHERE id = ? AND is_active = 1`,
        [userId]
      );

      return user || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error('Failed to retrieve user');
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const user = await database.get(
        `SELECT id, email, name, currency, is_active, email_verified,
                password_hash, created_at, updated_at 
         FROM users WHERE email = ? AND is_active = 1`,
        [email.toLowerCase().trim()]
      );

      return user || null;
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

      const isPasswordValid = await comparePassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login time
      await database.run(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUser(userId, updateData) {
    try {
      const { name, currency } = updateData;
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name.trim());
      }

      if (currency !== undefined) {
        updates.push('currency = ?');
        values.push(currency);
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      await database.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await database.get(
        'SELECT password_hash FROM users WHERE id = ? AND is_active = 1',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await database.run(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, userId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Deactivate user account
  async deactivateUser(userId) {
    try {
      await database.run(
        'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );

      // Remove all refresh tokens
      await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);

      return { success: true };
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  // Create default categories for new user
  async createDefaultCategoriesForUser(userId) {
    try {
      // Get default categories (user_id = 0)
      const defaultCategories = await database.all(
        'SELECT name, color, icon FROM categories WHERE user_id = 0'
      );

      // Insert categories for the new user
      for (const category of defaultCategories) {
        await database.run(
          'INSERT INTO categories (user_id, name, color, icon) VALUES (?, ?, ?, ?)',
          [userId, category.name, category.color, category.icon]
        );
      }
    } catch (error) {
      console.error('Error creating default categories:', error);
      // Don't throw error here, as user creation should succeed even if categories fail
    }
  }

  // Create default preferences for new user
  async createDefaultPreferences(userId) {
    try {
      await database.run(
        `INSERT INTO user_preferences (user_id) VALUES (?)`,
        [userId]
      );
    } catch (error) {
      console.error('Error creating default preferences:', error);
      // Don't throw error here, as user creation should succeed even if preferences fail
    }
  }

  // Get user statistics
  async getUserStats(userId) {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(DISTINCT e.id) as total_expenses,
          COUNT(DISTINCT i.id) as total_income_sources,
          COUNT(DISTINCT c.id) as total_categories,
          COALESCE(SUM(CASE WHEN e.status = 'Completed' THEN e.amount ELSE 0 END), 0) as total_spent,
          COALESCE(SUM(i.amount), 0) as total_income
        FROM users u
        LEFT JOIN expenses e ON u.id = e.user_id AND e.is_archived = 0
        LEFT JOIN income i ON u.id = i.user_id AND i.is_active = 1
        LEFT JOIN categories c ON u.id = c.user_id AND c.is_active = 1
        WHERE u.id = ? AND u.is_active = 1
      `, [userId]);

      return stats || {
        total_expenses: 0,
        total_income_sources: 0,
        total_categories: 0,
        total_spent: 0,
        total_income: 0
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = new UserService();