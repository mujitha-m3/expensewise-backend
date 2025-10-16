const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// Hash password
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

// Compare password with hash
const comparePassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Error comparing password:', error);
    throw new Error('Failed to compare password');
  }
};

// Validate password strength
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    strength: calculatePasswordStrength(password)
  };
};

// Calculate password strength score
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length score
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  
  // Character variety score
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;
  
  // Pattern penalties
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/123|abc|qwe|asd|zxc/i.test(password)) score -= 15; // Common sequences
  
  // Ensure score is between 0-100
  score = Math.max(0, Math.min(100, score));
  
  if (score < 30) return 'weak';
  if (score < 60) return 'fair';
  if (score < 80) return 'good';
  return 'strong';
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword,
  calculatePasswordStrength
};