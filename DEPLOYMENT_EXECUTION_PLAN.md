# Complete Deployment Execution Plan

## PHASE 1: VERIFY LOCAL PROJECT ✅ COMPLETED

**Status: PASSED**

### Results:
- ✅ Backend build: SUCCESS (TypeScript compilation successful)
- ✅ Frontend build: SUCCESS (TypeScript + Vite build successful)
- ✅ TypeScript errors: FIXED (3 errors resolved)
  - `database/db.ts:15` - Added null check for connectionString
  - `RolesAutocomplete.tsx:78` - Added optional chaining for baseUrl
  - `SkillsAutocomplete.tsx:76` - Added optional chaining for baseUrl
- ✅ Imports/exports: No broken imports detectedx
- ✅ Environment variables: Configured in .env.example and .env.production
- ✅ API URL configuration: Uses VITE_API_URL (no localhost fallback)
- ✅ Socket URL configuration: Uses VITE_SOCKET_URL (no localhost fallback)
- ✅ Database configuration: Uses DATABASE_URL (no localhost fallback)

**Files Modified:**
- `backend/src/database/db.ts`
- `frontend/src/components/common/RolesAutocomplete.tsx`
- `frontend/src/components/common/SkillsAutocomplete.tsx`

---

## PHASE 2: DATABASE REPLACEMENT PLAN

**Strategy:** Complete database replacement since production contains only test data.

### Step 1: Backup Production Database

```bash
# SSH into production server
ssh user@165.232.182.65

# Create backup directory
mkdir -p /backups/$(date +%Y%m%d)

# Backup entire database
pg_dump -U postgres -d resume_parser > /backups/$(date +%Y%m%d)/resume_parser_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file exists
ls -lh /backups/$(date +%Y%m%d)/
```

### Step 2: Drop Old Schema

```sql
-- Connect to PostgreSQL
psql -U postgres -d resume_parser

-- Drop all tables (CASCADE to handle dependencies)
DROP TABLE IF EXISTS labeled_data CASCADE;
DROP TABLE IF EXISTS match_scores CASCADE;
DROP TABLE IF EXISTS job_skills CASCADE;
DROP TABLE IF EXISTS job_descriptions CASCADE;
DROP TABLE IF EXISTS duplicate_candidates CASCADE;
DROP TABLE IF EXISTS certifications CASCADE;
DROP TABLE IF EXISTS education CASCADE;
DROP TABLE IF EXISTS work_history CASCADE;
DROP TABLE IF EXISTS candidate_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS candidate_achievements CASCADE;
DROP TABLE IF EXISTS corrections CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS parsing_jobs CASCADE;
DROP TABLE IF EXISTS skill_suggestions CASCADE;
DROP TABLE IF EXISTS correction_stats CASCADE;
DROP TABLE IF EXISTS correction_patterns CASCADE;
DROP TABLE IF EXISTS revoked_tokens CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop ENUM types
DROP TYPE IF EXISTS review_status CASCADE;
DROP TYPE IF EXISTS proficiency_level CASCADE;
DROP TYPE IF EXISTS parsing_job_status CASCADE;
DROP TYPE IF EXISTS candidate_status CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

### Step 3: Apply Latest Schema

```bash
# From backend/src directory
cd /path/to/lakshya_resume_parsers/backend/src

# Apply schema.sql
psql -U postgres -d resume_parser -f database/schema.sql
```

### Step 4: Verify Tables

```sql
-- List all tables
\dt

-- Expected tables:
-- users
-- api_keys
-- revoked_tokens
-- audit_logs
-- system_settings
-- skill_suggestions
-- correction_patterns
-- correction_stats
-- candidates
-- candidate_achievements
-- corrections
-- skills
-- candidate_skills
-- work_history
-- education
-- certifications
-- duplicate_candidates
-- parsing_jobs
-- job_descriptions
-- job_skills
-- match_scores
-- labeled_data
```

### Step 5: Verify Indexes

```sql
-- Check indexes on candidates table
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'candidates'
ORDER BY indexname;

-- Expected indexes:
-- idx_candidates_email
-- idx_candidates_full_name
-- idx_candidates_match_score
-- idx_candidates_resume_hash
-- idx_candidates_status
-- idx_candidates_email_hash
-- idx_candidates_created_at
```

### Step 6: Verify Foreign Keys

```sql
-- Check foreign key constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### Step 7: Verify Seed Data (if required)

```sql
-- Check if users table is empty
SELECT COUNT(*) FROM users;

-- If seed data is needed, create default admin user
INSERT INTO users (id, email, hashed_password, is_active, role, tenant_id)
VALUES (
    uuid_generate_v4(),
    'admin@lakshya.com',
    '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', -- Replace with actual hash
    true,
    'admin',
    'default'
);
```

---

## PHASE 3: BACKEND DEPLOYMENT

### Step 1: SSH into Production Server

```bash
ssh user@165.232.182.65
```

### Step 2: Navigate to Application Directory

```bash
cd /path/to/lakshya_resume_parsers/backend
```

### Step 3: Pull Latest Code

```bash
git pull origin main
```

### Step 4: Install Dependencies

```bash
cd src
npm install
```

### Step 5: Build TypeScript

```bash
npm run build
```

**Note:** The build script now includes a step to copy `.js` files from `services/companyIntel` to the dist folder to fix MODULE_NOT_FOUND errors.

### Step 6: Verify Environment Variables

```bash
# Check if .env file exists
ls -la .env

# If not exists, create from example
cp production.env.example .env

# Edit .env with production values
nano .env
```

**Required Environment Variables:**
```bash
PORT=3001
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database_name

# JWT Configuration
JWT_SECRET=your_secure_random_string_min_32_characters

# AI Service Configuration
AI_SERVICE_URL=http://your-ai-service:8000

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# CORS Configuration
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://another-frontend.com

# Hostname
HOSTNAME=your-server-hostname

# File Upload Configuration
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE_MB=10
UPLOAD_MAX_SIZE_MB=10

# LLM Configuration
LLM_PROVIDER=gemini
OPENAI_API_KEY=your_openai_api_key
```

### Step 7: Stop Current Application

```bash
pm2 stop resume-parser-backend
# OR if process name is different
pm2 list
pm2 stop <process-name>
```

### Step 8: Start/Restart Application with PM2

```bash
# If first time deployment
pm2 start dist/server.js --name "resume-parser-backend"

# If updating existing deployment
pm2 restart resume-parser-backend

# Save PM2 configuration
pm2 save
```

### Step 9: Verify Application Status

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs resume-parser-backend

# Check for errors
pm2 logs resume-parser-backend --err
```

### Step 10: Health Check Verification

```bash
# Test health endpoint
curl http://165.232.182.65:3001/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-09T..."}
```

---

## PHASE 4: FRONTEND DEPLOYMENT

### Step 1: Navigate to Frontend Directory

```bash
cd /path/to/lakshya_resume_parsers/frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build for Production

```bash
npm run build
```

### Step 4: Deploy to Vercel

```bash
# If Vercel CLI is not installed
npm install -g vercel

# Deploy to production
vercel --prod

# Follow the prompts:
# - Link to existing project
# - Confirm production deployment
```

### Step 5: Verify Environment Variables in Vercel

**Option 1: Via Vercel Dashboard**
1. Go to Vercel Dashboard
2. Select project
3. Go to Settings → Environment Variables
4. Verify the following are set:

```
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
VITE_GEONAMES_USERNAME=your_geonames_username
```

**Option 2: Via Vercel CLI**
```bash
# List environment variables
vercel env ls

# Add if missing
vercel env add VITE_API_URL production
vercel env add VITE_SOCKET_URL production
vercel env add VITE_GEONAMES_USERNAME production
```

### Step 6: Redeploy if Environment Variables Changed

```bash
vercel --prod
```

### Step 7: Verify Frontend Deployment

```bash
# Open deployed URL in browser
open https://your-frontend-domain.com

# Or test with curl
curl -I https://your-frontend-domain.com
```

---

## PHASE 5: POST DEPLOYMENT TESTING

### Testing Checklist

#### 1. Login Functionality
- [ ] Navigate to login page
- [ ] Enter valid credentials
- [ ] Click login button
- [ ] Verify successful login
- [ ] Verify redirect to dashboard
- [ ] Check browser console for errors

#### 2. Dashboard
- [ ] Verify dashboard loads
- [ ] Check statistics display
- [ ] Verify charts render
- [ ] Check for console errors

#### 3. Candidate List
- [ ] Navigate to candidates page
- [ ] Verify list loads
- [ ] Check pagination works
- [ ] Verify filters work
- [ ] Check for console errors

#### 4. Resume Upload
- [ ] Navigate to upload page
- [ ] Select a valid resume file (PDF/DOCX)
- [ ] Click upload button
- [ ] Verify upload progress indicator
- [ ] Check for success message
- [ ] Verify candidate created

#### 5. Resume Parsing
- [ ] After upload, verify parsing starts
- [ ] Check real-time progress updates
- [ ] Verify parsing completes
- [ ] Check parsed data accuracy
- [ ] Verify candidate details populated

#### 6. Job Creation
- [ ] Navigate to jobs page
- [ ] Click create job button
- [ ] Fill job details
- [ ] Submit job
- [ ] Verify job created
- [ ] Check job details page

#### 7. Search Functionality
- [ ] Navigate to search page
- [ ] Enter search query
- [ ] Click search button
- [ ] Verify results display
- [ ] Check filters work
- [ ] Verify result accuracy

#### 8. Socket Connection
- [ ] Open browser developer tools → Network → WS
- [ ] Verify WebSocket connection established
- [ ] Check for socket connection message in console
- [ ] Verify real-time updates work
- [ ] Check for socket errors

#### 9. API Calls
- [ ] Open browser developer tools → Network
- [ ] Verify API calls are successful (200 OK)
- [ ] Check response times
- [ ] Verify no 4xx/5xx errors
- [ ] Check API response data

#### 10. Browser Console Errors
- [ ] Open browser developer tools → Console
- [ ] Verify no JavaScript errors
- [ ] Verify no warnings
- [ ] Check for any failed resource loads
- [ ] Verify no network errors

#### 11. Backend Logs
```bash
# Check PM2 logs
pm2 logs resume-parser-backend

# Look for:
# - Database connection errors
# - Socket.io errors
# - API request errors
# - Unhandled exceptions

# Check error logs specifically
pm2 logs resume-parser-backend --err
```

---

## PHASE 6: PRODUCTION READINESS

### 1. Deployment Risks

**High Risk:**
- None identified

**Medium Risk:**
- Database replacement requires complete data wipe (acceptable since only test data)
- Frontend bundle size >500 kB may affect initial load time
- ESLint errors remain (code quality, not functional)

**Low Risk:**
- Environment variable misconfiguration
- Network connectivity issues during deployment
- PM2 process management issues

### 2. Files Requiring Review

**Configuration Files:**
- `backend/src/.env` - Must be created with production values
- `frontend/.env.production` - Verify Vercel environment variables

**Critical Files:**
- `backend/src/database/schema.sql` - Single source of truth for database
- `backend/src/database/db.ts` - Database connection (recently fixed)
- `backend/src/app.ts` - CORS configuration
- `backend/src/socket.ts` - Socket.io configuration
- `frontend/src/services/api.ts` - API base URL
- `frontend/src/services/socket.ts` - Socket connection

### 3. Required Environment Variables

**Backend (.env):**
```bash
PORT=3001
NODE_ENV=production
DATABASE_URL=<production_postgresql_connection_string>
JWT_SECRET=<secure_random_string_min_32_chars>
AI_SERVICE_URL=<ai_service_endpoint>
REDIS_HOST=<redis_host>
REDIS_PORT=<redis_port>
ALLOWED_ORIGINS=<comma_separated_frontend_urls>
HOSTNAME=<server_hostname>
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE_MB=10
UPLOAD_MAX_SIZE_MB=10
LLM_PROVIDER=gemini
OPENAI_API_KEY=<openai_api_key>
```

**Frontend (Vercel):**
```bash
VITE_API_URL=<production_backend_url>/api
VITE_SOCKET_URL=<production_backend_url>
VITE_GEONAMES_USERNAME=<geonames_username>
```

### 4. Rollback Plan

**Backend Rollback:**
```bash
# 1. Stop current application
pm2 stop resume-parser-backend

# 2. Revert to previous commit
git revert HEAD
# OR
git checkout <previous-commit-hash>

# 3. Rebuild
npm run build

# 4. Restore database from backup
psql -U postgres -d resume_parser < /backups/YYYYMMDD/resume_parser_backup_YYYYMMDD_HHMMSS.sql

# 5. Restart application
pm2 restart resume-parser-backend
```

**Frontend Rollback:**
```bash
# Via Vercel CLI
vercel rollback <deployment-url>

# OR via Vercel Dashboard
# 1. Go to Deployments
# 2. Find previous successful deployment
# 3. Click "Promote to Production"
```

**Database Rollback:**
```bash
# Restore from backup
psql -U postgres -d resume_parser < /backups/YYYYMMDD/resume_parser_backup_YYYYMMDD_HHMMSS.sql
```

### 5. Final Go/No-Go Decision

**GO Criteria:**
- ✅ Backend build successful
- ✅ Frontend build successful
- ✅ TypeScript errors fixed
- ✅ Hardcoded localhost URLs removed
- ✅ Database schema reviewed and validated
- ✅ Environment variables documented
- ✅ Deployment scripts created
- ✅ Rollback plan documented

**BLOCKING Issues:**
- None

**RECOMMENDATION: ✅ GO FOR DEPLOYMENT**

**Pre-Deployment Actions Required:**
1. Set all required environment variables in production
2. Change JWT_SECRET to secure random string (min 32 chars)
3. Configure ALLOWED_ORIGINS with production frontend URLs
4. Create database backup before deployment
5. Verify network connectivity to production server

**Post-Deployment Actions Required:**
1. Complete all testing checklist items
2. Monitor backend logs for 24 hours
3. Verify all critical functionality works
4. Document any issues found

---

## EXECUTION SUMMARY

**Total Phases:** 6
**Completed Phases:** 1 (Phase 1)
**Remaining Phases:** 5 (Phases 2-6)
**Estimated Deployment Time:** 30-45 minutes
**Risk Level:** LOW

**Next Immediate Action:** Execute PHASE 2 (Database Replacement Plan) on production server.

**Deployment Command Sequence:**
1. SSH into production server
2. Backup database
3. Drop old schema
4. Apply new schema.sql
5. Verify database
6. Deploy backend
7. Deploy frontend
8. Test all functionality
9. Monitor logs

**Status:** READY TO EXECUTE PHASE 2
