# MongoDB Integration Setup Guide

## Prerequisites
1. Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
2. Make sure MongoDB is running on your system

## Installation Steps

### 1. Install Dependencies
```bash
npm install mongodb mongoose bcryptjs jsonwebtoken dotenv
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

### 2. Environment Configuration
Create a `.env` file in your project root with the following variables:
```env
MONGODB_URI=mongodb://localhost:27017/admin_dashboard
MONGODB_DB_NAME=admin_dashboard
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### 3. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# On Windows (if MongoDB is installed as a service)
net start MongoDB

# On macOS/Linux
brew services start mongodb/brew/mongodb-community
# or
sudo systemctl start mongod
```

### 4. Default Admin User
The system will automatically create a default admin user with these credentials:
- **Email:** admin@example.com
- **Password:** admin123

You can change these in the `.env` file.

## Features Implemented

### Authentication
- **JWT-based authentication** with secure token management
- **Password hashing** using bcryptjs
- **Role-based access control** (super-admin, admin, moderator)
- **Session management** with localStorage
- **Auto-logout** on token expiration

### Database Models
- **Admin Model** with roles, authentication, and profile management
- **Customer Model** with all required fields and validation
- **Proper indexing** for better performance
- **Data validation** and error handling

### API Services
- **Admin API** for authentication and user management
- **Customer API** for CRUD operations with pagination
- **Search functionality** for customers
- **Statistics** and analytics data

### Frontend Integration
- **Authentication service** for login/logout
- **Customer service** integrated with MongoDB
- **Error handling** and loading states
- **Real-time updates** after database operations

## Database Structure

### Admin Collection
- Authentication and profile data
- Role-based permissions
- Last login tracking
- Password hashing

### Customer Collection
- Complete customer information
- Technical details (MAC, Box ID)
- Payment information
- Credit management
- Notes and history

## Security Features
- Password hashing with bcryptjs
- JWT token expiration
- Role-based access control
- Input validation and sanitization
- Protected routes

## Running the Application
1. Make sure MongoDB is running
2. Start the development server: `npm run dev`
3. The database will be automatically initialized with sample data
4. Login with admin@example.com / admin123

## Next Steps
- Set up proper production environment variables
- Configure MongoDB Atlas for production
- Add data backup and recovery procedures
- Implement advanced security measures
- Add logging and monitoring
