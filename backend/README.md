# Ration TDS Backend

Backend API for the Ration Distribution System (राशन वितरण प्रणाली)

## Prerequisites

- Node.js 18+ 
- MySQL 8+

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

Required variables:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL connection
- `JWT_SECRET` - Secret key for JWT tokens
- Email settings (optional for development)

### 3. Create Database

**Option A: Using MySQL Command Line**
```bash
mysql -u root -p < schema.sql
```

**Option B: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to your MySQL server
3. File → Run SQL Script
4. Select `backend/schema.sql`
5. Execute

**Option C: Manual**
```sql
CREATE DATABASE ration_tds;
USE ration_tds;
-- Then paste contents of schema.sql
```

### 4. Start Development Server
```bash
npm run dev
```

Server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/request-code` - Send verification code to email
  ```json
  {
    "email": "user@example.com",
    "role": "cardholder" // or "admin"
  }
  ```

- `POST /api/auth/verify-code` - Verify code and login/register
  ```json
  {
    "email": "user@example.com",
    "code": "123456",
    "role": "cardholder",
    "language": "english"
  }
  ```

### Health Check
- `GET /health` - Server status

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # MySQL connection pool
│   │   └── email.ts         # Nodemailer setup
│   ├── middleware/
│   │   └── auth.ts          # JWT authentication
│   ├── routes/
│   │   └── auth.ts          # Auth endpoints
│   ├── services/
│   │   └── authService.ts   # Auth business logic
│   └── server.ts            # Express app
├── schema.sql               # Database schema
├── .env                     # Environment variables
└── package.json
```

## Development Notes

- TypeScript compilation errors are expected until dependencies are installed
- Email service will show warning if not configured (non-blocking)
- Verification codes expire after 10 minutes by default
- Demo mode: Any 6-digit code works if email service is not configured

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Configure real email service credentials
3. Update `FRONTEND_URL` to production domain
4. Build: `npm run build`
5. Start: `npm start`
