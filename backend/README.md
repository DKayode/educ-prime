# Backend API - Educ Prime

This is a NestJS backend API for the Educ Prime educational platform that includes user management, authentication, and file management with Firebase integration.

## Features

- Authentication with JWT (inscription and connexion)
- Academic profile management (étudiants, professeurs, administrateurs)
- File upload and management with Google Firebase Storage
- Institution and program management
- Course materials and resources management
- Secure access control and file URL retrieval

## Testing Strategy

The application uses a comprehensive testing approach:

1. **End-to-End Tests**
   - Complete authentication flow
   - File upload with Firebase Storage
   - Error handling and edge cases

2. **Mock Implementations**
   - Firebase Storage mocked for testing
   - Test database with separate configuration
   - JWT token validation in test environment

3. **Test Coverage**
   - Authentication endpoints
   - Protected route access
   - File upload validation
   - Error handling scenarios

## Prerequisites

1. Node.js (v16 or higher)
2. PostgreSQL (v14 or higher)
3. Firebase project with Storage enabled
4. Environment variables properly configured

## Configuration Requirements

### 1. Database Setup

1. Create a PostgreSQL database
2. Initialize the database schema:
   ```bash
   psql -U your_username -d your_database_name -f config/schema.sql
   ```
   This will create all necessary tables:
   - utilisateurs (Users)
   - etablissement (Institutions)
   - filiere (Programs)
   - niveau_etude (Study Levels)
   - matiere (Subjects)
   - epreuves (Exams)
   - ressources (Resources)

### 2. Firebase Configuration

1. Create a Firebase project in the Firebase Console
2. Enable Firebase Storage
3. Download your Firebase Admin SDK service account key
4. Place it in `config/firebase-admin.json`

### 3. Environment Variables

Create a `.env` file in the root directory with the following variables:
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name

# JWT Authentication
JWT_SECRET=your_jwt_secret        # Used for signing JWT tokens
JWT_EXPIRATION=24h               # Token expiration time

# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=./config/firebase-admin.json
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_bucket_name
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"  # Keep the quotes for multiline key

# Server Configuration
PORT=3000
NODE_ENV=development             # Options: development, production, test
```

For testing, create a separate `.env.test` file or configure variables in `test/jest.setup.js`.

```
backend
├── src
│   ├── app.module.ts              # Main application module
│   ├── app.service.ts             # Main application service
│   ├── app.controller.ts          # Main application controller
│   ├── auth                       # Authentication module
│   │   ├── auth.module.ts         # Auth module configuration
│   │   ├── auth.service.ts        # Auth business logic
│   │   ├── auth.controller.ts     # Auth endpoints
│   │   ├── guards
│   │   │   └── jwt-auth.guard.ts  # JWT authentication guard
│   │   ├── strategies
│   │   │   └── jwt.strategy.ts    # JWT validation strategy
│   │   └── dto
│   │       ├── login.dto.ts       # Login payload validation
│   │       └── register.dto.ts    # Registration payload validation
│   ├── files                      # Files module
│   │   ├── files.module.ts        # Files module configuration
│   │   ├── files.service.ts       # File management logic
│   │   ├── files.controller.ts    # File upload endpoints
│   │   ├── entities
│   │   │   └── file.entity.ts     # File metadata entity
│   │   └── dto
│   │       └── file.dto.ts        # File upload validation
│   ├── config
│   │   └── firebase.config.ts     # Firebase configuration
│   └── main.ts                    # Application entry point
├── test
│   ├── app.e2e-spec.ts           # End-to-end tests
│   ├── jest-e2e.json             # Jest e2e configuration
│   ├── jest.setup.js             # Test environment setup
│   ├── firebase-admin.test.json  # Test Firebase credentials
│   └── test-upload.txt          # Test file for upload tests
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
├── nest-cli.json               # NestJS configuration
├── package.json                # Project dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Project documentation
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DKayode/educ-prime.git
   cd educ-prime/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   # Create database
   createdb educ_prime

   # Initialize schema
   psql -d educ_prime -f config/schema.sql
   ```

4. Configure Firebase:
   - Place your `firebase-admin.json` in the `config` directory
   - Update `.env` with your Firebase project details

5. Configure environment variables:
   - Copy `.env.example` to `.env` (if available)
   - Update all required variables

6. Start the application:
   ```bash
   # Development
   npm run start:dev

   # Production
   npm run build
   npm run start:prod
   ```

## API Documentation

Detailed API documentation is available in `API_DOC.md`. The API includes endpoints for:
- Authentication (register, login, logout)
- File Upload and Management
- Educational Resources Management

## Testing

## Setting Up the Test Environment

1. Create a test database:
   ```bash
   createdb educ_prime_test
   psql -d educ_prime_test -f config/schema.sql
   ```

2. Configure test environment in `test/jest.setup.js`:
   ```javascript
   process.env.JWT_SECRET = 'test-secret';
   process.env.DB_HOST = 'localhost';
   process.env.DB_PORT = '5432';
   process.env.DB_USERNAME = 'your_username';
   process.env.DB_PASSWORD = 'your_password';
   process.env.DB_NAME = 'educ_prime_test';
   ```

3. Set up Firebase test configuration:
   - Create `test/firebase-admin.test.json` with mock credentials
   - Configure test environment variables:
     ```javascript
     process.env.GOOGLE_APPLICATION_CREDENTIALS = './test/firebase-admin.test.json';
     process.env.FIREBASE_PROJECT_ID = 'educ-prime-test';
     process.env.FIREBASE_STORAGE_BUCKET = 'educ-prime-test.appspot.com';
     ```

## Running Tests

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

The test suite includes:
- Authentication flow (register, login)
- Protected endpoint access control
- User profile management
- File upload with Firebase Storage
- Error handling and validation

## Database Schema

The application uses a PostgreSQL database with the following main entities:
- `utilisateurs`: User management and authentication
- `etablissement`: Educational institutions
- `filiere`: Study programs/majors
- `niveau_etude`: Academic levels
- `matiere`: Subjects/Courses
- `epreuves`: Exams and assessments
- `ressources`: Educational resources (documents, quizzes, exercises)

See `config/schema.sql` for the complete schema definition.

## 🔐 Security

**Important:** Never commit sensitive files to Git!

- `config/firebase-serviceaccount.json` - Contains Firebase credentials (in `.gitignore`)
- `.env` - Contains database passwords and secrets (in `.gitignore`)

## 🐳 Docker Deployment

### Quick Deploy
```bash
# On your VPS
docker-compose pull
docker-compose up -d
```

The project includes:
- Multi-stage Dockerfile for optimized production images
- Docker Compose for orchestration
- Automated GitHub Actions deployment (CI/CD)

### GitHub Actions Workflows
- `docker-build.yml` - Builds and pushes Docker images to GitHub Container Registry
- `deploy.yml` - Automatically deploys to VPS after successful build

## 📚 Documentation

- **[API_DOC.md](./API_DOC.md)** - Complete API endpoints documentation
- **QUICKSTART.md** - Quick reference commands (local only)
- **AUTO_DEPLOY_SETUP.md** - GitHub Actions deployment setup (local only)

**Note:** Deployment documentation is kept local only to protect sensitive VPS information. 