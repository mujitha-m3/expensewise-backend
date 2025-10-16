// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let error = {
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.message = 'Validation error';
    error.errors = err.errors;
    return res.status(400).json(error);
  }

  if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
    error.message = 'Unauthorized access';
    return res.status(401).json(error);
  }

  if (err.name === 'CastError') {
    error.message = 'Invalid resource ID';
    return res.status(400).json(error);
  }

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    error.message = 'Resource already exists';
    return res.status(409).json(error);
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    error.message = 'Invalid reference to related resource';
    return res.status(400).json(error);
  }

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    error.error = err.message;
    error.stack = err.stack;
  }

  // Send error response
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json(error);
};

module.exports = errorHandler;