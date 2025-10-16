const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/auth');
// Comment out these route imports until they're implemented
// const userRoutes = require('./src/routes/users');
// const expenseRoutes = require('./src/routes/expenses');
// const incomeRoutes = require('./src/routes/income');
// const categoryRoutes = require('./src/routes/categories');
// const dashboardRoutes = require('./src/routes/dashboard');
// const reportRoutes = require('./src/routes/reports');
// const budgetRoutes = require('./src/routes/budgets');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const { authenticateToken } = require('./src/middleware/auth');

// Import database
const database = require('./src/config/database');
const { cleanupExpiredTokens } = require('./src/utils/jwt');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
async function initializeDatabase() {
  try {
    await database.init();
    console.log('✅ Database initialized successfully');
    
    // Schedule token cleanup every hour
    setInterval(async () => {
      try {
        await cleanupExpiredTokens();
      } catch (error) {
        console.error('Error during token cleanup:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8081'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/auth`, authRoutes);
// Comment out these routes until they're implemented
// app.use(`/api/${apiVersion}/user`, authenticateToken, userRoutes);
// app.use(`/api/${apiVersion}/expenses`, authenticateToken, expenseRoutes);
// app.use(`/api/${apiVersion}/income`, authenticateToken, incomeRoutes);
// app.use(`/api/${apiVersion}/categories`, authenticateToken, categoryRoutes);
// app.use(`/api/${apiVersion}/dashboard`, authenticateToken, dashboardRoutes);
// app.use(`/api/${apiVersion}/reports`, authenticateToken, reportRoutes);
// app.use(`/api/${apiVersion}/budgets`, authenticateToken, budgetRoutes);

// Fallback for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ExpenseWise API Server',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      api: `/api/${apiVersion}`,
      docs: `/api/${apiVersion}/docs`
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err.message);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

// Start server with database initialization
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 ExpenseWise API Server running on port ${PORT}`);
      console.log(`📖 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api/${apiVersion}`);
      console.log(`🏃 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n📄 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('🔴 HTTP server closed');
        
        try {
          await database.close();
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

module.exports = app;