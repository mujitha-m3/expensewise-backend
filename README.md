# ExpenseWise API Backend

Complete REST API backend for the ExpenseWise mobile application - Final project for Mobile Application Module.

**Team Members:**
- Kasun Chathuranga Dissanayaka
- Asitha Govinnage  
- Mujitha Manorathna

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm 8+

### Installation
```bash
# Navigate to backend directory
cd backend-template

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your configuration
# Update JWT secrets, database paths, etc.

# Start development server
npm run dev
```

### Production Start
```bash
npm start
```

## 📁 Project Structure

```
backend-template/
├── server.js                 # Main application entry point
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
├── README.md                # This file
├── database/                # SQLite database files (auto-created)
└── src/
    ├── config/
    │   └── database.js       # Database connection & schema
    ├── controllers/
    │   └── authController.js # Authentication logic
    ├── middleware/
    │   ├── auth.js          # JWT authentication middleware
    │   └── errorHandler.js  # Global error handling
    ├── routes/
    │   └── auth.js          # Authentication routes
    ├── services/
    │   └── userService.js   # User business logic
    └── utils/
        ├── jwt.js           # JWT token utilities
        └── password.js      # Password hashing utilities
```

## 🔐 Authentication System

### Features
- **JWT-based authentication** with access & refresh tokens
- **Secure password hashing** using bcrypt (12 salt rounds)
- **Token management** with automatic cleanup
- **Password strength validation**
- **Email validation**
- **Session management** across devices

### Security Features
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection protection
- Password complexity requirements

## 📊 Database Schema

### Users Table
- **id** (Primary Key)
- **email** (Unique, validated)
- **password_hash** (bcrypt hashed)
- **name** (User display name)
- **currency** (Default: LKR)
- **is_active** (Account status)
- **email_verified** (Email verification status)
- **created_at** / **updated_at** (Timestamps)

### Refresh Tokens Table
- **id** (Primary Key)
- **user_id** (Foreign Key → users.id)
- **token** (JWT refresh token)
- **expires_at** (Token expiration)
- **created_at** (Creation timestamp)

### Default Categories (Pre-populated)
- Food & Dining, Transportation, Shopping
- Entertainment, Bills & Utilities, Healthcare
- Education, Other (with colors & icons)

## 🛣️ API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "currency": "LKR"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt_refresh_token_here"
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer jwt_access_token_here
```

#### Update Profile
```http
PUT /auth/profile
Authorization: Bearer jwt_access_token_here
Content-Type: application/json

{
  "name": "Updated Name",
  "currency": "USD"
}
```

#### Change Password
```http
POST /auth/change-password
Authorization: Bearer jwt_access_token_here
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

#### Logout
```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "jwt_refresh_token_here"
}
```

#### Logout All Devices
```http
POST /auth/logout-all
Authorization: Bearer jwt_access_token_here
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "user": { ... },
    "tokens": { ... }
  }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field": "Specific field error"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database Configuration
DB_PATH=./database/expensewise.db

# CORS Configuration
CORS_ORIGIN=http://localhost:8081,exp://localhost:8081

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## 🔄 Integration with Mobile App

### Mobile App Configuration
Update your mobile app's `src/services/api/apiService.js`:

```javascript
// Change API_BASE_URL to your backend
const API_BASE_URL = 'http://your-backend-ip:3000/api/v1';

// Your mobile app is already configured to work with this API!
// Just update the base URL and you're ready to go.
```

### Switching from Local to API Mode
In your mobile app's `src/services/auth/hybridAuthService.js`:

```javascript
// Change mode from 'local' to 'api'
let currentMode = 'api'; // Was 'local'
```

## 🧪 Testing

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login user
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Automated Testing
```bash
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## 🚀 Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "expensewise-api"
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong JWT secrets (64+ characters)
3. Configure proper CORS origins
4. Set up reverse proxy (nginx/apache)
5. Enable HTTPS
6. Configure monitoring and logging

## 🛠️ Development Scripts

```bash
npm run dev          # Start with nodemon
npm run lint         # Check code style
npm run lint:fix     # Fix code style issues
npm run cleanup:tokens # Clean expired tokens manually
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure database directory exists
   - Check file permissions
   - Verify SQLite3 installation

2. **JWT Token Error**
   - Check JWT secrets in .env
   - Verify token expiration settings
   - Ensure proper token format

3. **CORS Issues**
   - Update CORS_ORIGIN in .env
   - Include mobile app URLs
   - Check protocol (http/https)

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and stack traces.

## 📚 Next Steps

1. **Extend API**: Add expense, income, category endpoints
2. **Add Validation**: Implement request validation middleware  
3. **Add Logging**: Structured logging with winston
4. **Add Monitoring**: Health checks and metrics
5. **Add Documentation**: Swagger/OpenAPI specs
6. **Add Testing**: Unit and integration tests

## 🤝 Team Collaboration

### Git Workflow
1. Create feature branches: `feature/api-expenses`
2. Make commits with clear messages
3. Test before pushing
4. Create pull requests for review
5. Merge to main after approval

### Code Standards
- Use consistent formatting (eslint)
- Add comments for complex logic
- Follow RESTful API conventions
- Maintain security best practices

---

**Built with ❤️ by the ExpenseWise Team**

*This backend perfectly complements your React Native mobile app and provides a solid foundation for your final project demonstration.*