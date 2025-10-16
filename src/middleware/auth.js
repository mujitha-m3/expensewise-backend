const { verifyAccessToken } = require('../utils/jwt');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'NO_TOKEN'
      });
    }

    // Verify the token
    const decoded = verifyAccessToken(token);
    
    // Add user info to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'INVALID_TOKEN'
    });
  }
};

// Optional authentication (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name
        };
      } catch (error) {
        // Token is invalid, but we continue without user info
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // In case of any error, continue without authentication
    req.user = null;
    next();
  }
};

// Check if user owns the resource
const checkResourceOwnership = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    try {
      const resourceUserId = req.params.userId || req.body[resourceUserIdField] || req.query.userId;
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          message: 'Resource user ID not found',
          error: 'MISSING_USER_ID'
        });
      }

      // Check if the authenticated user owns this resource
      if (parseInt(resourceUserId) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only access your own resources',
          error: 'ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authorization',
        error: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

// Admin check middleware (for future admin features)
const requireAdmin = (req, res, next) => {
  try {
    // This would check admin role from user data
    // For now, we'll implement basic structure
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        error: 'ADMIN_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during admin check',
      error: 'ADMIN_CHECK_ERROR'
    });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  checkResourceOwnership,
  requireAdmin
};