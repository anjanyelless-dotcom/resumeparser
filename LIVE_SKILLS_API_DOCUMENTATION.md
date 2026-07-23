# Live Skills Taxonomy Management API

## Overview

The Live Skills Taxonomy Management API enables dynamic addition and management of skills without requiring code changes or server restarts. Skills are stored in the PostgreSQL database and automatically loaded by the AI service's parser, making new skills immediately available for resume parsing.

## Architecture

### Database Schema

**Skills Table Structure:**
```sql
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    normalized_name VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(100) DEFAULT 'IT',
    sub_domain VARCHAR(255),
    category VARCHAR(100) DEFAULT 'technical',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- **Global Skills Catalog**: Skills are stored once and referenced by candidates
- **Domain/Sub-domain Support**: Organize skills by domain (IT, Healthcare, Finance, etc.)
- **Normalization**: Automatic case-insensitive matching via `normalized_name` column
- **Deduplication**: UNIQUE constraints prevent duplicate skills

### AI Service Integration

**Database Skills Loader** (`database_skills_loader.py`):
- Loads skills from PostgreSQL on AI service startup
- Provides in-memory caching for fast lookups
- Supports automatic cache refresh (configurable interval)
- Thread-safe operations with locking
- Fallback to JSON file if database unavailable

**RuleBasedParser Enhancement** (`parsers/rule_parser.py`):
- Modified `_load_comprehensive_taxonomy()` to load from database first
- Falls back to `unified_skills.json` if database unavailable
- Added `reload_skills_from_database()` method for manual refresh
- Maintains backward compatibility with existing JSON-based system

## API Endpoints

### 1. Bulk Insert Skills

**Endpoint:** `POST /api/admin/skills/bulk`

**Authentication:** Admin role required

**Request Body:**
```json
{
  "domain": "Accounting",
  "subDomain": "Taxation",
  "skills": "Tally Prime,GST Filing,TDS,Income Tax,Payroll,Finalization of Accounts"
}
```

Or with array:
```json
{
  "domain": "IT",
  "subDomain": "Frontend",
  "skills": ["React", "Angular", "Vue.js", "Svelte", "Next.js"]
}
```

**Response:**
```json
{
  "added": 5,
  "skipped": 2,
  "newSkills": ["React", "Angular", "Vue.js", "Svelte", "Next.js"],
  "existingSkills": ["JavaScript", "TypeScript"],
  "message": "Successfully added 5 skills, skipped 2 existing skills"
}
```

**Features:**
- Accepts comma-separated string or array
- Automatic deduplication
- Space trimming
- Case normalization (Title Case)
- Skips existing skills
- Auto-triggers AI service cache reload

### 2. Get All Skills

**Endpoint:** `GET /api/admin/skills`

**Authentication:** Admin role required

**Query Parameters:**
- `keyword` (optional): Search by skill name
- `domain` (optional): Filter by domain
- `subDomain` (optional): Filter by sub-domain
- `limit` (optional): Max results (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```
GET /api/admin/skills?domain=IT&limit=50&offset=0
GET /api/admin/skills?keyword=python
GET /api/admin/skills?subDomain=Taxation
```

**Response:**
```json
{
  "skills": [
    {
      "id": "uuid",
      "name": "React",
      "normalized_name": "react",
      "domain": "IT",
      "sub_domain": "Frontend",
      "category": "technical",
      "created_at": "2026-07-20T10:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### 3. Get Skill by ID

**Endpoint:** `GET /api/admin/skills/:id`

**Authentication:** Admin role required

**Response:**
```json
{
  "id": "uuid",
  "name": "React",
  "normalized_name": "react",
  "domain": "IT",
  "sub_domain": "Frontend",
  "category": "technical",
  "created_at": "2026-07-20T10:00:00Z"
}
```

### 4. Update Skill

**Endpoint:** `PUT /api/admin/skills/:id`

**Authentication:** Admin role required

**Request Body:**
```json
{
  "name": "React.js",
  "domain": "IT",
  "subDomain": "Frontend Web Development",
  "category": "technical"
}
```

**Response:** Updated skill object

### 5. Delete Skill

**Endpoint:** `DELETE /api/admin/skills/:id`

**Authentication:** Admin role required

**Response:**
```json
{
  "message": "Skill deleted successfully",
  "deletedSkill": "React"
}
```

### 6. Get Skills Statistics

**Endpoint:** `GET /api/admin/skills/stats`

**Authentication:** Admin role required

**Response:**
```json
{
  "total": 18500,
  "byDomain": [
    {"domain": "IT", "count": 15000},
    {"domain": "Healthcare", "count": 2000},
    {"domain": "Finance", "count": 1500}
  ],
  "bySubDomain": [
    {"sub_domain": "Frontend", "count": 500},
    {"sub_domain": "Taxation", "count": 300}
  ],
  "recentAdditions": [
    {"name": "React 19", "domain": "IT", "created_at": "2026-07-20T10:00:00Z"}
  ]
}
```

### 7. Reload AI Service Cache

**Endpoint:** `POST /api/admin/skills/reload`

**Authentication:** Admin role required

**Description:** Manually triggers AI service to reload skills cache from database. Use this if auto-reload fails.

**Response:**
```json
{
  "success": true,
  "message": "Skills cache reloaded successfully in AI service",
  "aiServiceResponse": {
    "success": true,
    "message": "Skills cache reloaded successfully",
    "cache_info": {
      "total_skills": 18500,
      "cache_timestamp": "2026-07-20T10:00:00Z",
      "domains": ["IT", "Healthcare", "Finance"],
      "cache_age_seconds": 0
    }
  }
}
```

## AI Service Endpoints

### 1. Reload Skills Cache

**Endpoint:** `POST /admin/skills/reload`

**Description:** Internal endpoint called by backend to refresh skills cache.

**Response:**
```json
{
  "success": true,
  "message": "Skills cache reloaded successfully",
  "cache_info": {
    "total_skills": 18500,
    "cache_timestamp": "2026-07-20T10:00:00Z",
    "domains": ["IT", "Healthcare", "Finance"],
    "cache_age_seconds": 0
  }
}
```

### 2. Get Cache Info

**Endpoint:** `GET /admin/skills/cache-info`

**Description:** Get current cache information including age and total skills.

**Response:**
```json
{
  "success": true,
  "cache_info": {
    "total_skills": 18500,
    "cache_timestamp": "2026-07-20T10:00:00Z",
    "domains": ["IT", "Healthcare", "Finance"],
    "cache_age_seconds": 120
  }
}
```

## Environment Variables

### Backend (.env)
```
# Database connection (for skills management)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_parser
DB_USER=resume_parser
DB_PASSWORD=your_password

# AI Service URL (for cache reload)
AI_SERVICE_URL=http://127.0.0.1:8000
```

### AI Service (.env)
```
# Database connection (for skills loading)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_parser
DB_USER=resume_parser
DB_PASSWORD=your_password

# Skills cache refresh interval (seconds)
SKILLS_CACHE_REFRESH_INTERVAL=300
```

## Usage Examples

### Example 1: Add Accounting Skills

```bash
curl -X POST http://localhost:3001/api/admin/skills/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "Accounting",
    "subDomain": "Taxation",
    "skills": "Tally Prime,GST Filing,TDS,Income Tax,Payroll,Finalization of Accounts,Bank Reconciliation,Audit,Bookkeeping,Zoho Books,SAP FICO"
  }'
```

### Example 2: Add IT Skills

```bash
curl -X POST http://localhost:3001/api/admin/skills/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "IT",
    "subDomain": "Cloud Computing",
    "skills": ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Ansible"]
  }'
```

### Example 3: Search Skills

```bash
curl -X GET "http://localhost:3001/api/admin/skills?keyword=python&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 4: Get Statistics

```bash
curl -X GET http://localhost:3001/api/admin/skills/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Deployment Steps

### 1. Run Database Migration

```bash
cd backend/src/database
psql -U resume_parser -d resume_parser -f migrations/022_add_domain_to_skills.sql
```

### 2. Restart Backend

```bash
cd backend
npm run build
pm2 restart resume-parser-backend
```

### 3. Restart AI Service

```bash
cd ai-service
pm2 restart ai-service
```

### 4. Verify Database Connection

Check that AI service can connect to database:
```bash
curl http://localhost:8000/admin/skills/cache-info
```

## Performance Considerations

### Database Optimization
- **Indexes**: Created on `domain`, `sub_domain`, `name`, `normalized_name`
- **UNIQUE Constraints**: Prevent duplicates at database level
- **Connection Pooling**: Reuses database connections

### Cache Performance
- **In-Memory Cache**: Skills loaded once and cached in AI service
- **Thread-Safe**: Locking prevents race conditions
- **Auto-Refresh**: Configurable refresh interval (default: 5 minutes)
- **Manual Reload**: Available via API endpoint

### Bulk Insert Performance
- **Batch Processing**: Skills inserted in single transaction
- **Deduplication**: Checked before insertion to avoid duplicates
- **Auto-Reload**: Cache refresh triggered only if new skills added

## Limitations

1. **Database Dependency**: AI service requires database connection to load skills
2. **Fallback Mode**: If database unavailable, falls back to JSON file (static)
3. **Cache Latency**: New skills available after cache refresh (auto or manual)
4. **No Fuzzy Matching**: Exact case-insensitive matching only
5. **No Synonym Support**: Each variant must be added separately

## Troubleshooting

### Skills Not Being Detected

1. **Check Database Connection:**
   ```bash
   curl http://localhost:8000/admin/skills/cache-info
   ```

2. **Manual Cache Reload:**
   ```bash
   curl -X POST http://localhost:3001/api/admin/skills/reload \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Check AI Service Logs:**
   ```bash
   pm2 logs ai-service
   ```

4. **Verify Skills in Database:**
   ```sql
   SELECT name, domain, sub_domain FROM skills ORDER BY created_at DESC LIMIT 10;
   ```

### Database Connection Errors

1. **Verify Environment Variables:**
   - Check `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - Ensure AI service has correct database credentials

2. **Test Connection:**
   ```bash
   psql -h localhost -p 5432 -U resume_parser -d resume_parser
   ```

3. **Check Network:**
   - Ensure database port is accessible
   - Check firewall rules

### Cache Not Refreshing

1. **Check Auto-Refresh Interval:**
   - Verify `SKILLS_CACHE_REFRESH_INTERVAL` in AI service .env
   - Default is 300 seconds (5 minutes)

2. **Manual Reload:**
   ```bash
   curl -X POST http://localhost:3001/api/admin/skills/reload \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Check Backend Logs:**
   ```bash
   pm2 logs resume-parser-backend
   ```

## Future Enhancements

1. **Fuzzy Matching**: Add Levenshtein distance for typo tolerance
2. **Synonym Mapping**: Support skill variants and aliases
3. **Skill Embeddings**: Semantic matching using vector embeddings
4. **Skill Relationships**: Define related skills and hierarchies
5. **Skill Validation**: AI-powered skill suggestion and validation
6. **Bulk Export/Import**: Excel/CSV export and import functionality
7. **Skill Analytics**: Usage statistics and trending skills
8. **Auto-Discovery**: Automatic skill extraction from parsed resumes

## Backward Compatibility

The implementation maintains full backward compatibility:

- **JSON Fallback**: If database unavailable, AI service uses `unified_skills.json`
- **Existing APIs**: No changes to existing resume parsing APIs
- **Database Schema**: Non-breaking migration (adds columns, doesn't remove)
- **Client Compatibility**: Frontend continues to work without changes

## Security

- **JWT Authentication**: All admin endpoints require valid JWT token
- **Role-Based Access**: Only admin role can access skills management
- **SQL Injection Prevention**: Parameterized queries throughout
- **Input Validation**: All inputs validated and sanitized
- **Rate Limiting**: Can be added to prevent abuse

## Support

For issues or questions:
1. Check AI service logs: `pm2 logs ai-service`
2. Check backend logs: `pm2 logs resume-parser-backend`
3. Verify database connectivity
4. Test cache reload endpoint
5. Check environment variables
