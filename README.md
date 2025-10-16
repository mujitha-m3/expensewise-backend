# ExpenseWise API Backend

Complete REST API backend for the ExpenseWise mobile application - Final project for Mobile Application Module.

**Team Members:**
- Kasun Chathuranga Dissanayaka
- Asitha Govinnage  
- Mujitha Manorathna

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm 8+
- MongoDB Atlas account (or local MongoDB)

### Installation
```bash
# Clone the repository
git clone https://github.com/mujitha-m3/expensewise-backend.git
cd expensewise-backend

# Install dependencies
npm install

# Set up environment variables
# Create .env file with your MongoDB connection string and JWT secrets
# See Environment Variables section below

# Start development server
npm run dev
```

### Production Start
```bash
npm start
```

## Authentication System

### Features
- **JWT-based authentication** with secure tokens
- **Secure password hashing** using bcrypt (12 salt rounds)
- **Token management** with expiration
- **Password strength validation**
- **Email validation**
- **Session management** across devices

### Security Features
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation and sanitization
- NoSQL injection protection
- Password complexity requirements

## Database Schema (MongoDB)

### Users Collection
- **_id** (MongoDB ObjectId)
- **email** (Unique, validated)
- **password** (bcrypt hashed)
- **name** (User display name)
- **currency** (Default: LKR)
- **isActive** (Account status)
- **createdAt** / **updatedAt** (Timestamps)

### Categories Collection
- **_id** (MongoDB ObjectId)
- **name** (Category name)
- **type** (income/expense)
- **color** (Hex color code)
- **icon** (Icon identifier)
- **userId** (Reference to User)
- **createdAt** / **updatedAt** (Timestamps)

### Expenses Collection
- **_id** (MongoDB ObjectId)
- **amount** (Expense amount)
- **description** (Description)
- **categoryId** (Reference to Category)
- **userId** (Reference to User)
- **date** (Expense date)
- **createdAt** / **updatedAt** (Timestamps)

### Income Collection
- **_id** (MongoDB ObjectId)
- **amount** (Income amount)
- **description** (Description)
- **categoryId** (Reference to Category)
- **userId** (Reference to User)
- **date** (Income date)
- **createdAt** / **updatedAt** (Timestamps)

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Expense Endpoints

#### Get All Expenses
```http
GET /api/expenses
Authorization: Bearer jwt_access_token_here
```

#### Create Expense
```http
POST /api/expenses
Authorization: Bearer jwt_access_token_here
Content-Type: application/json

{
  "amount": 25.50,
  "description": "Coffee and lunch",
  "categoryId": "category_id_here",
  "date": "2025-10-16"
}
```

### Income Endpoints

#### Get All Income
```http
GET /api/income
Authorization: Bearer jwt_access_token_here
```

#### Create Income
```http
POST /api/income
Authorization: Bearer jwt_access_token_here
Content-Type: application/json

{
  "amount": 1500.00,
  "description": "Freelance work",
  "categoryId": "category_id_here",
  "date": "2025-10-16"
}
```

### Category Endpoints

#### Get All Categories
```http
GET /api/categories
Authorization: Bearer jwt_access_token_here
```

#### Create Category
```http
POST /api/categories
Authorization: Bearer jwt_access_token_here
Content-Type: application/json

{
  "name": "Groceries",
  "type": "expense",
  "color": "#FF6B6B",
  "icon": "shopping-cart"
}
```

### Analytics Endpoints

#### Get Financial Summary
```http
GET /api/analytics/summary
Authorization: Bearer jwt_access_token_here
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "expenses": [...],
    "total": 1250.75
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
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/expensewise?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration (comma separated)
CORS_ORIGIN=http://localhost:3000,http://localhost:19006
```

## Integration with Mobile App

### Mobile App Configuration
Update your mobile app's API service configuration:

```javascript
// Update API_BASE_URL to your backend
const API_BASE_URL = 'http://your-backend-ip:3000/api';

// Your mobile app can now connect to this API!
// Make sure to include JWT tokens in Authorization headers
```

## Testing

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

## Features Implemented

**Authentication System** - JWT-based auth with secure password hashing  
**Expense Management** - CRUD operations for expenses  
**Income Management** - CRUD operations for income  
**Category Management** - Organize expenses and income by categories  
**Analytics** - Financial summaries and insights  
**Security** - Rate limiting, CORS, input validation  
**MongoDB Integration** - Mongoose ODM with proper schemas  


**Built with ❤️ by the ExpenseWise Team**

*This backend provides a complete API for the ExpenseWise React Native mobile application with MongoDB Atlas integration and comprehensive expense management features.*