const jwt = require('jsonwebtoken');
const database = require('../config/database');

// Generate access token (short-lived)
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: 'expensewise-api',
    audience: 'expensewise-app'
  });
};

// Generate refresh token (long-lived)
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'expensewise-api',
    audience: 'expensewise-app'
  });
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'expensewise-api',
      audience: 'expensewise-app'
    });
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'expensewise-api',
      audience: 'expensewise-app'
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

// Store refresh token in database
const storeRefreshToken = async (userId, token) => {
  try {
    // Calculate expiration date
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    // Clean up expired tokens for this user
    await database.run(
      'DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < ?',
      [userId, new Date()]
    );

    // Store new refresh token
    await database.run(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );

    return true;
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
};

// Validate refresh token from database
const validateRefreshToken = async (token) => {
  try {
    // Verify JWT signature and expiration
    const decoded = verifyRefreshToken(token);

    // Check if token exists in database and is not expired
    const storedToken = await database.get(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > ?',
      [token, new Date()]
    );

    if (!storedToken) {
      throw new Error('Refresh token not found or expired');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Remove refresh token from database
const removeRefreshToken = async (token) => {
  try {
    await database.run('DELETE FROM refresh_tokens WHERE token = ?', [token]);
    return true;
  } catch (error) {
    console.error('Error removing refresh token:', error);
    return false;
  }
};

// Remove all refresh tokens for a user (logout from all devices)
const removeAllRefreshTokens = async (userId) => {
  try {
    await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    return true;
  } catch (error) {
    console.error('Error removing all refresh tokens:', error);
    return false;
  }
};

// Clean up expired tokens (should be run periodically)
const cleanupExpiredTokens = async () => {
  try {
    const result = await database.run(
      'DELETE FROM refresh_tokens WHERE expires_at < ?',
      [new Date()]
    );
    console.log(`🧹 Cleaned up ${result.changes} expired refresh tokens`);
    return result.changes;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  removeRefreshToken,
  removeAllRefreshTokens,
  cleanupExpiredTokens
};