# Backend Setup Guide

This backend provides authentication, analysis history storage, and analytics tracking for the SEO Analytics app.

## Features Implemented

1. **User Authentication (JWT-based)**
   - Register new users
   - Login with email/password
   - JWT token generation and validation

2. **Analysis History Storage**
   - Save analysis results to database
   - Retrieve user's analysis history
   - Delete previous analyses

3. **Analytics Tracking**
   - Track user events (e.g., website analyzed)
   - Get analytics summary (total analyses, top domains, average scores)
   - JSONB storage for flexible event data

4. **Secure API Key Management**
   - Environment variables for sensitive data
   - No hardcoded secrets
   - JWT authentication middleware

## Prerequisites

- Docker and Docker Compose (recommended) OR
- Node.js 18+
- PostgreSQL 12+

## Option 1: Quick Start with Docker Compose (Recommended)

```bash
cd /home/user/workspace
docker-compose up -d
```

This will:
- Start PostgreSQL database on port 5432
- Start Express API on port 5000
- Initialize all database tables automatically

Access the API at: `http://localhost:5000`

## Option 2: Manual Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set Up PostgreSQL
```bash
# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Linux (Ubuntu)
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start

# Windows: Download from https://www.postgresql.org/download/windows/
```

### 3. Create Database
```bash
psql -U postgres -c "CREATE DATABASE seo_analytics;"
```

### 4. Configure Environment
Edit `backend/.env`:
```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seo_analytics
```

### 5. Start Server
```bash
npm start
```

The server will automatically initialize the database tables.

## API Endpoints

### Authentication

**Register**
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

Response:
{
  "token": "jwt-token-here",
  "user": { "id": 1, "email": "user@example.com" }
}
```

**Login**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

Response:
{
  "token": "jwt-token-here",
  "user": { "id": 1, "email": "user@example.com" }
}
```

### Analysis History

**Get History**
```
GET /api/analysis/history
Authorization: Bearer {token}

Response: Array of analysis records
```

**Save Analysis**
```
POST /api/analysis/save
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://example.com",
  "performanceScore": 85,
  "seoScore": 90,
  "accessibilityScore": 88,
  "bestPracticesScore": 92,
  "overallScore": 88,
  "mobileOptimized": true,
  "sslCertificate": true,
  "issues": ["Issue 1", "Issue 2"],
  "advantages": ["Advantage 1"],
  "opportunities": ["Opportunity 1"]
}
```

**Delete Analysis**
```
DELETE /api/analysis/{id}
Authorization: Bearer {token}
```

### Analytics

**Track Event**
```
POST /api/analytics/track
Authorization: Bearer {token}
Content-Type: application/json

{
  "eventType": "website_analyzed",
  "eventData": { "url": "https://example.com" }
}
```

**Get Analytics Summary**
```
GET /api/analytics/summary
Authorization: Bearer {token}

Response:
{
  "totalAnalyses": 42,
  "topDomains": [
    { "url": "https://example.com", "count": 5 },
    ...
  ],
  "averageScores": {
    "avg_performance": 82.5,
    "avg_seo": 88.2,
    ...
  }
}
```

## Frontend Integration

The frontend is automatically configured to use the backend. Set the API endpoint in your `.env` file:

```
EXPO_PUBLIC_API_BASE_URL=https://analysis.seoh.ca/api
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Analysis History Table
```sql
CREATE TABLE analysis_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(2048) NOT NULL,
  performance_score INTEGER,
  seo_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  overall_score INTEGER,
  mobile_optimized BOOLEAN,
  ssl_certificate BOOLEAN,
  issues TEXT[],
  advantages TEXT[],
  opportunities TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Analytics Events Table
```sql
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Production Deployment

### Important Security Steps

1. **Change JWT Secret**
   ```
   Generate a secure secret: openssl rand -base64 32
   Update in .env or environment variables
   ```

2. **Use Environment Variables**
   - Never commit `.env` file to version control
   - Use your hosting platform's environment variable management

3. **Database Security**
   - Use strong passwords
   - Restrict database access to application only
   - Use SSL for database connections in production

4. **CORS Configuration**
   - Update CORS origin in `server.js` to match your frontend domain
   - Currently allows all origins (`*`)

5. **Rate Limiting**
   - Consider adding rate limiting middleware for production
   - Protects against brute force attacks

### Deployment Examples

**Heroku**
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

**Railway, Render, Fly.io**
- Follow their Node.js deployment guides
- Connect PostgreSQL addon
- Set environment variables

## Troubleshooting

**Connection Refused**
- Ensure PostgreSQL is running
- Check DATABASE_URL or individual DB connection variables
- Verify port 5432 is not blocked by firewall

**JWT Errors**
- Ensure token is passed in Authorization header
- Format: `Authorization: Bearer {token}`
- Check token hasn't expired

**Table Already Exists**
- This is normal, tables are only created if they don't exist
- To reset: `DROP DATABASE seo_analytics; CREATE DATABASE seo_analytics;`

## Next Steps

- [ ] Set up CI/CD pipeline
- [ ] Add logging system (Winston, Morgan)
- [ ] Implement refresh tokens
- [ ] Add email verification
- [ ] Set up monitoring and alerts
- [ ] Add API documentation (Swagger/OpenAPI)
