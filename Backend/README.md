# Backend - Node.js REST API Service

The Backend service is a comprehensive Node.js REST API built with Express.js that handles all business logic, authentication, data management, and integrations for the AI Attendance System.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Running the Service](#-running-the-service)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Authentication](#-authentication)
- [User Roles](#-user-roles)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## ✨ Features

- **JWT Authentication**: Secure token-based authentication and authorization
- **Role-Based Access Control (RBAC)**: System Admin, Organisation Admin, Department Admin, Faculty
- **Multi-Organization Support**: Manage multiple organizations with hierarchical structure
- **Complete CRUD Operations**: 
  - Organizations and Departments
  - Users (Admins and Faculty)
  - Subjects and Students
  - Lectures and Attendance
- **AWS S3 Integration**: Automatic image upload for students and lectures
- **Face Recognition Integration**: Communicates with FaceRecognizer service
- **MongoDB Database**: Scalable NoSQL database with Mongoose ODM
- **Data Validation**: Input validation using Joi
- **File Upload Handling**: Multipart form data support with Multer
- **Error Handling**: Comprehensive error handling middleware
- **CORS Support**: Cross-origin resource sharing enabled
- **Environment-Based Config**: Separate configurations for development and production

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES6 modules)
- **Framework**: Express.js ^4.18.2
- **Database**: MongoDB with Mongoose ^8.16.5
- **Authentication**: 
  - jsonwebtoken ^9.0.3
  - bcryptjs ^3.0.3
- **Storage**: aws-sdk ^2.1692.0
- **Validation**: joi ^17.13.3
- **File Upload**: multer ^2.0.2
- **HTTP Client**: axios ^1.11.0
- **Environment**: dotenv ^17.2.1

## 📋 Prerequisites

- **Node.js**: Version 16.x or higher
- **npm**: Version 8.x or higher
- **MongoDB**: Version 4.4 or higher (local or MongoDB Atlas)
- **AWS Account**: S3 bucket for image storage

## 🚀 Installation

### 1. Navigate to Backend Directory

```bash
cd AttendanceSystemBackend/Backend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including Express, Mongoose, JWT, AWS SDK, and other dependencies.

## 🔧 Environment Variables

Create a `.env` file in the `Backend` directory with the following variables:

```env
# Server Configuration
NODE_ENV=development

# Database Configuration
MONGODB_URL=mongodb://localhost:27017/AI_Attendance_System
# For MongoDB Atlas (Cloud):
# MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/AI_Attendance_System

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=your-s3-bucket-name

# FaceRecognizer Service
FACE_RECOGNIZER_URL=http://localhost:10000
```

### Environment Variables Explained

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Application environment | `development` or `production` |
| `MONGODB_URL` | Yes | MongoDB connection string | `mongodb://localhost:27017/AI_Attendance_System` |
| `JWT_SECRET` | Yes | Secret key for JWT signing (min 32 chars) | `your-secret-key-here` |
| `AWS_ACCESS_KEY_ID` | Yes | AWS IAM user access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS IAM user secret key | `secret...` |
| `AWS_REGION` | Yes | AWS region where S3 bucket is located | `ap-south-1` |
| `AWS_BUCKET_NAME` | Yes | S3 bucket name for image storage | `ai-attendance-bucket` |
| `FACE_RECOGNIZER_URL` | Yes | URL of FaceRecognizer service | `http://localhost:10000` |

> **Security Note**: Never commit `.env` files to version control. The `.gitignore` file already excludes it.

## 🗄️ Database Setup

### Option 1: Local MongoDB

**Install MongoDB:**
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community

# macOS
brew install mongodb-community
```

**Start MongoDB Service:**
```bash
# Linux
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS
brew services start mongodb-community

# Windows
net start MongoDB
```

**Verify Connection:**
```bash
mongosh "mongodb://localhost:27017/AI_Attendance_System"
```

### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Add your IP address to the whitelist
4. Create a database user
5. Get the connection string and update `MONGODB_URL` in `.env`

### Seed Database with Test Data

After MongoDB is running, seed the database with initial data:

```bash
node seed.js
```

This creates:
- 1 System Admin
- 2 Organizations (Tech University, Management Institute)
- 4 Departments (Computer Science, Information IT, MBA, BBA)
- Multiple Organisation Admins, Department Admins, and Faculty members
- Sample subjects for each department

**Default Test Accounts:**

| Role | Email | Password |
|------|-------|----------|
| System Admin | `admin@system.com` | `password123` |
| Org Admin - Tech University | `admin@tech-u.com` | `password123` |
| Org Admin - Management Institute | `admin@biz-i.com` | `password123` |
| Dept Admin - Computer Science | `head@computerscience.com` | `password123` |
| Dept Admin - Information IT | `head@informationit.com` | `password123` |
| Faculty - Computer Science | `faculty@computerscience.com` | `password123` |

> **Important**: Change these credentials before deploying to production.

## 🚀 Running the Service

### Development Mode (with auto-reload)

```bash
npm run dev
```

This uses `nodemon` for automatic server restart on file changes.

### Production Mode

```bash
npm start
```

The server will start on **http://localhost:8080** (development) or port 80 (production).

**Expected Output:**
```
Server started on port 8080
MongoDB connected successfully
```

## 📁 Project Structure

```
Backend/
├── config.js                 # Configuration constants and environment setup
├── index.js                  # Main entry point, server initialization
├── seed.js                   # Database seeding script
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables (not in git)
├── .gitignore               # Git ignore rules
│
├── controllers/              # Route controllers (business logic)
│   ├── AuthController.js           # Login, authentication
│   ├── UserController.js           # User CRUD operations
│   ├── OrganisationController.js   # Organization management
│   ├── DepartmentController.js     # Department management
│   ├── SubjectController.js        # Subject management
│   ├── StudentController.js        # Student management
│   ├── LectureController.js        # Lecture and attendance
│   └── DashboardController.js      # Analytics and statistics
│
├── models/                   # Mongoose schemas and models
│   ├── User.model.js               # Base user model
│   ├── SystemAdmin.model.js        # System admin schema
│   ├── OrgAdmin.model.js           # Organization admin schema
│   ├── DeptAdmin.model.js          # Department admin schema
│   ├── Faculty.model.js            # Faculty schema
│   ├── Organisation.model.js       # Organization schema
│   ├── Department.model.js         # Department schema
│   ├── Subject.model.js            # Subject schema
│   ├── Student.model.js            # Student schema with embeddings
│   ├── Lecture.model.js            # Lecture and attendance schema
│   └── index.js                    # Model exports
│
├── routes/                   # Express route definitions
│   ├── index.js                    # Main router setup
│   ├── auth.routes.js              # Authentication routes
│   ├── user.routes.js              # User routes
│   ├── organisation.routes.js      # Organization routes
│   ├── department.routes.js        # Department routes
│   ├── subject.routes.js           # Subject routes
│   ├── student.routes.js           # Student routes
│   ├── lecture.routes.js           # Lecture routes
│   └── dashboard.routes.js         # Dashboard routes
│
├── middlewares/              # Express middlewares
│   ├── index.js                    # Middleware exports
│   ├── auth.middleware.js          # JWT verification
│   ├── role.middleware.js          # Role-based access control
│   ├── upload.middleware.js        # File upload handling (Multer)
│   ├── error.middleware.js         # Global error handler
│   ├── cors.middleware.js          # CORS configuration
│   └── timeout.middleware.js       # Request timeout
│
├── services/                 # Business logic services
│   ├── s3.service.js               # AWS S3 operations
│   └── faceRecognizer.service.js   # Face recognition API calls
│
├── utils/                    # Utility functions
│   ├── constants.js                # App constants (roles, statuses)
│   ├── response.js                 # Standard response formats
│   └── validators.js               # Data validation schemas
│
└── db/                       # Database connection
    └── index.js                    # MongoDB connection setup
```

## 🔌 API Endpoints

Complete API documentation is available in `../API_Documentation.txt`.

### Authentication
- `POST /auth/login` - User login (returns JWT token)

### Organizations
- `GET /organisation` - Get all organizations
- `POST /organisation` - Create new organization
- `GET /organisation/:id` - Get organization by ID
- `PUT /organisation/:id` - Update organization
- `DELETE /organisation/:id` - Delete organization

### Departments
- `GET /department` - Get all departments
- `POST /department` - Create new department
- `GET /department/:id` - Get department by ID
- `PUT /department/:id` - Update department
- `DELETE /department/:id` - Delete department

### Users
- `GET /user` - Get all users
- `POST /user` - Create new user
- `GET /user/:id` - Get user by ID
- `PUT /user/:id` - Update user
- `DELETE /user/:id` - Delete user

### Subjects
- `GET /subject` - Get all subjects
- `POST /subject` - Create subject
- `GET /subject/:id` - Get subject by ID
- `PUT /subject/:id` - Update subject
- `DELETE /subject/:id` - Delete subject

### Students
- `GET /student` - Get all students
- `POST /student` - Create student (with image upload)
- `GET /student/:id` - Get student by ID
- `GET /student/options` - Get divisions/batches
- `PUT /student/:id` - Update student
- `DELETE /student/:id` - Delete student

### Lectures
- `GET /lecture` - Get all lectures
- `POST /lecture` - Create lecture and process attendance
- `GET /lecture/:id` - Get lecture by ID
- `PUT /lecture/:id` - Update lecture
- `DELETE /lecture/:id` - Delete lecture

### Dashboard
- `GET /dashboard/dept-admin` - Get department analytics

## 🔐 Authentication

### JWT Token Flow

1. **Login**: User sends credentials to `/auth/login`
2. **Token Generation**: Server validates credentials and returns JWT token
3. **Token Storage**: Client stores token (localStorage/cookies)
4. **Authenticated Requests**: Client includes token in `Authorization` header
5. **Token Verification**: Server validates token on protected routes

### Making Authenticated Requests

```javascript
// Example: Fetch subjects with authentication
fetch('http://localhost:8080/subject', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

## 👥 User Roles

### Role Hierarchy

```
System Admin
├── Organisation Admin
    ├── Department Admin
        └── Faculty
```

### Role Permissions

| Feature | System Admin | Org Admin | Dept Admin | Faculty |
|---------|--------------|-----------|------------|---------|
| Manage Organizations | ✅ | ❌ | ❌ | ❌ |
| Manage Departments | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ✅ (within org) | ✅ (Faculty only) | ❌ |
| Manage Subjects | ✅ | ✅ | ✅ | ✅ (assigned) |
| Manage Students | ✅ | ✅ | ✅ | ✅ |
| Take Attendance | ✅ | ✅ | ✅ | ✅ |
| View Dashboard | ❌ | ❌ | ✅ | ❌ |

## 🐛 Troubleshooting

### Cannot connect to MongoDB

```bash
# Check MongoDB status
sudo systemctl status mongod  # Linux
brew services list  # macOS
net start | findstr MongoDB  # Windows

# Restart MongoDB
sudo systemctl restart mongod  # Linux
brew services restart mongodb-community  # macOS
net stop MongoDB && net start MongoDB  # Windows

# Test connection manually
mongosh "mongodb://localhost:27017/AI_Attendance_System"
```

### Port 8080 already in use

```bash
# Find process using port 8080
# Linux/macOS
lsof -i :8080
kill -9 <PID>

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### JWT Token errors

**"Invalid token" or "Token expired":**
- Check JWT_SECRET is correctly set in `.env`
- Ensure token is being sent in Authorization header
- Token may have expired (default: 24 hours), login again

### AWS S3 upload fails

**Check credentials:**
```bash
# Verify environment variables are loaded
console.log(process.env.AWS_ACCESS_KEY_ID)
```

**Common issues:**
- Invalid AWS credentials
- S3 bucket doesn't exist
- IAM user lacks S3 permissions
- Incorrect region configuration
- CORS not configured on S3 bucket

**Required IAM permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### Module not found errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Database seeding fails

```bash
# Ensure MongoDB is running
sudo systemctl status mongod

# Drop database and re-seed
mongosh
> use AI_Attendance_System
> db.dropDatabase()
> exit

node seed.js
```

### CORS errors in browser

- Ensure CORS middleware is properly configured
- Check that frontend URL is allowed in CORS settings
- Verify preflight requests are handled correctly

## 🧪 Testing API Endpoints

### Using cURL

```bash
# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.com","password":"password123"}'

# Get subjects (with token)
curl -X GET http://localhost:8080/subject \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. Import the API endpoints from `../API_Documentation.txt`
2. Set up environment variable for `baseUrl` and `token`
3. Use Bearer Token authentication type
4. For file uploads, use `form-data` with file fields

## 📄 License

**Copyright © 2025. All Rights Reserved.**

This software and its associated documentation are proprietary and confidential. Unauthorized copying, distribution, modification, or use of this software, via any medium, is strictly prohibited without explicit written permission from the copyright holder.

For more details, see the main project [LICENSE](../README.md#-license).

---

**Service Version**: 1.0.0  
**Last Updated**: December 2025  
**Port**: 8080 (development) / 80 (production)
