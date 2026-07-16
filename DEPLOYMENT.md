# Production Deployment Guide

## Backend Deployment (DigitalOcean/Render)

### Prerequisites
- SSH access to production server
- PostgreSQL database configured
- Redis instance configured
- Node.js 18+ installed
- PM2 installed globally

### Step 1: Prepare Environment Variables
```bash
# Create production .env file
cd backend/src
cp production.env.example .env

# Edit .env with production values:
# - DATABASE_URL (production PostgreSQL connection string)
# - JWT_SECRET (secure random string, min 32 chars)
# - AI_SERVICE_URL (AI service endpoint)
# - REDIS_HOST (Redis host)
# - REDIS_PORT (Redis port)
# - ALLOWED_ORIGINS (comma-separated frontend URLs)
# - HOSTNAME (server hostname for logs)
```

### Step 2: Deploy Backend Code
```bash
# SSH into production server
ssh user@165.232.182.65

# Navigate to application directory
cd /path/to/lakshya_resume_parsers/backend

# Pull latest code
git pull origin main

# Install dependencies
cd src
npm install

# Build TypeScript
npm run build

# Apply database schema (if fresh deployment)
psql -U postgres -d resume_parser -f database/schema.sql

# Or apply migrations (if updating existing deployment)
# Run migration files in order from backend/src/database/migrations/

# Restart application with PM2
pm2 restart app
# OR if first time:
pm2 start dist/server.js --name "resume-parser-backend"
pm2 save
pm2 startup
```

### Step 3: Verify Backend
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs resume-parser-backend

# Test health endpoint
curl http://165.232.182.65:3001/health
```

## Frontend Deployment (Vercel)

### Step 1: Configure Environment Variables in Vercel
Go to Vercel Dashboard → Project Settings → Environment Variables:

```
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
VITE_GEONAMES_USERNAME=your_geonames_username
```

### Step 2: Deploy to Vercel
```bash
# From frontend directory
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Step 3: Verify Frontend
- Open deployed URL
- Check browser console for errors
- Test login functionality
- Verify API calls are working

## Post-Deployment Checks

### Backend Health Checks
```bash
# Health check
curl https://your-backend-domain.com/health

# Test authentication
curl -X POST https://your-backend-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

### Database Verification
```bash
# Connect to database
psql -U postgres -d resume_parser

# Check tables exist
\dt

# Check candidates table
SELECT COUNT(*) FROM candidates;
```

### Rollback Plan
```bash
# Backend rollback
pm2 resume resume-parser-backend  # If stopped
pm2 restart resume-parser-backend  # If issues
git revert <commit-hash>
npm run build
pm2 restart resume-parser-backend

# Frontend rollback
vercel rollback [deployment-url]
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL in .env
   - Verify PostgreSQL is running
   - Check firewall rules

2. **Redis Connection Failed**
   - Check REDIS_HOST and REDIS_PORT
   - Verify Redis is running
   - Check firewall rules

3. **CORS Errors**
   - Verify ALLOWED_ORIGINS includes frontend URL
   - Check backend CORS configuration

4. **Build Failures**
   - Check Node.js version (18+)
   - Clear node_modules: rm -rf node_modules && npm install
   - Check TypeScript errors: npm run build

## Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs resume-parser-backend

# View metrics
pm2 show resume-parser-backend
```

### Application Logs
```bash
# Backend logs
pm2 logs resume-parser-backend --lines 100

# Error logs
pm2 logs resume-parser-backend --err
```
