const jwt = require('jsonwebtoken');
const { RefreshToken } = require('../models');

// Generate access token (short-lived)
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '2d',
    issuer: 'expensewise-api',
    audience: 'expensewise-app'
  });
};

// Generate refresh token (long-lived)
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
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
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'expensewise-api',
      audience: 'expensewise-app'
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

// Persist a refresh token to the DB
const storeRefreshToken = async (userId, token) => {
  try {
    const payload = jwt.decode(token);
    const expiresAt = payload && payload.exp ? new Date(payload.exp * 1000) : null;

    // Upsert token record
    await RefreshToken.create({ userId, token, expiresAt });
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw error;
  }
};

// Validate that a refresh token exists in DB and is valid
const validateRefreshToken = async (token) => {
  try {
    // Verify signature/expiry first
    const decoded = verifyRefreshToken(token);

    // Ensure token exists in DB
    const found = await RefreshToken.findOne({ token });
    if (!found) throw new Error('Refresh token not found');

    return decoded;
  } catch (error) {
    console.error('Refresh token validation error:', error.message || error);
    throw new Error('Invalid or expired refresh token');
  }
};

const removeRefreshToken = async (token) => {
  try {
    await RefreshToken.deleteOne({ token });
  } catch (error) {
    console.error('Error removing refresh token:', error);
    throw error;
  }
};

const removeAllRefreshTokens = async (userId) => {
  try {
    await RefreshToken.deleteMany({ userId });
  } catch (error) {
    console.error('Error removing all refresh tokens for user:', error);
    throw error;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
  ,storeRefreshToken,
  validateRefreshToken,
  removeRefreshToken,
  removeAllRefreshTokens
};