# Database Schema Deployment Workflow

## Overview

This workflow ensures database schema consistency across Local, Staging, and Production environments, preventing "column does not exist" errors.

## Current Issues Resolved

✅ **Missing `total_experience_years` column** - Added to all environments  
✅ **Code references to non-existent columns** - Fixed in all controllers  
✅ **Schema drift between environments** - Synchronized with master schema  
✅ **No migration tracking** - Implemented migration table  

## Deployment Process

### Phase 1: Pre-Deployment Checks

```bash
# 1. Backup current database
pg_dump -U postgres -h localhost resume_parser > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run schema validation
npm run validate-schema

# 3. Check for pending migrations
npm run check-migrations
```

### Phase 2: Schema Synchronization

```bash
# Apply comprehensive schema fix
psql -U postgres -d resume_parser -f database/deployment_schema_fix.sql

# Verify schema matches expectations
npm run verify-schema
```

### Phase 3: Code Deployment

```bash
# Deploy updated code with fixed column references
git pull origin main
npm install
npm run build
pm2 restart lakshya-backend
```

### Phase 4: Post-Deployment Verification

```bash
# Test critical functionality
npm run test-candidate-creation
npm run test-candidate-search
npm run test-matching

# Monitor for errors
pm2 logs lakshya-backend --lines 50
```

## Environment-Specific Instructions

### Local Development

```bash
# Reset local database to match master schema
dropdb resume_parser
createdb resume_parser
psql -U postgres -d resume_parser -f database/schema.sql
psql -U postgres -d resume_parser -f database/deployment_schema_fix.sql
```

### Production Deployment

```bash
# Connect to production server
ssh root@165.232.182.65

# Navigate to application directory
cd /var/www/lakshya_resume_parsers

# Create backup
pg_dump -U postgres resume_parser > prod_backup_$(date +%Y%m%d_%H%M%S).sql

# Apply schema fix
psql -U postgres -d resume_parser -f backend/src/database/deployment_schema_fix.sql

# Deploy code
cd backend
git pull origin main
npm install
npm run build
pm2 restart lakshya-backend

# Verify deployment
pm2 status
pm2 logs lakshya-backend --lines 20
```

## Migration Tracking

### Migration Table Structure

```sql
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT
);
```

### Checking Migration Status

```sql
SELECT version, applied_at, description 
FROM schema_migrations 
ORDER BY applied_at DESC;
```

## Schema Validation Scripts

### validate-schema.js

```javascript
// Check for missing columns
const missingColumns = await checkMissingColumns();
if (missingColumns.length > 0) {
    console.error('Missing columns:', missingColumns);
    process.exit(1);
}

// Check for orphaned columns
const orphanedColumns = await checkOrphanedColumns();
if (orphanedColumns.length > 0) {
    console.warn('Orphaned columns:', orphanedColumns);
}

// Check data consistency
const dataIssues = await checkDataConsistency();
if (dataIssues.length > 0) {
    console.error('Data consistency issues:', dataIssues);
    process.exit(1);
}
```

## Monitoring and Alerting

### Error Monitoring

Monitor for these specific errors:
- `column "total_experience_years" does not exist`
- `relation "table_name" does not exist`
- `constraint "constraint_name" does not exist`

### Automated Checks

```bash
# Add to crontab for daily checks
0 2 * * * /path/to/validate-schema.sh >> /var/log/schema-validation.log
```

## Rollback Plan

### If Deployment Fails

```bash
# 1. Stop application
pm2 stop lakshya-backend

# 2. Restore database backup
psql -U postgres -d resume_parser < backup_20241201_143000.sql

# 3. Revert code changes
git checkout previous-commit-hash

# 4. Restart application
pm2 start lakshya-backend
```

### Partial Rollback

```sql
-- If specific columns cause issues
ALTER TABLE candidates DROP COLUMN IF EXISTS total_experience_years;

-- Restore from backup
UPDATE candidates SET years_experience = total_experience_years 
WHERE total_experience_years IS NOT NULL;
```

## Best Practices

### Development

1. **Always test schema changes locally first**
2. **Create migration scripts for all changes**
3. **Update code references immediately after schema changes**
4. **Run validation scripts before committing**

### Deployment

1. **Backup before any schema changes**
2. **Apply schema changes before code deployment**
3. **Monitor for errors after deployment**
4. **Have rollback plan ready**

### Monitoring

1. **Set up alerts for database errors**
2. **Regular schema consistency checks**
3. **Monitor migration execution**
4. **Track deployment success/failure rates**

## Troubleshooting Guide

### Common Issues

#### "column does not exist" Error

**Cause**: Schema drift between environments  
**Fix**: Run `deployment_schema_fix.sql` on affected environment

#### Migration Failed

**Cause**: Partial migration execution  
**Fix**: Check `schema_migrations` table, re-run failed migration

#### Performance Issues

**Cause**: Missing indexes after schema changes  
**Fix**: Run `ANALYZE` and `REINDEX` commands

### Debug Commands

```bash
# Check current schema
psql -U postgres -d resume_parser -c "\d candidates"

# Compare schemas
diff local_schema.sql production_schema.sql

# Check for errors
grep -i "error" /var/log/postgresql/postgresql-*.log
```

## Future Improvements

### Automated Migration System

1. **Implement proper migration framework**
2. **Add automatic rollback capability**
3. **Create migration testing suite**
4. **Set up continuous integration for schema changes**

### Schema Versioning

1. **Semantic versioning for schema**
2. **Automatic compatibility checks**
3. **Backward compatibility validation**
4. **Schema changelog generation**

## Emergency Contacts

- **Database Administrator**: [Contact Info]
- **Development Team**: [Contact Info]
- **DevOps Team**: [Contact Info]

## Documentation

- **Schema Documentation**: `database/schema.sql`
- **Migration History**: `database/migrations/`
- **API Documentation**: `docs/api.md`
- **Deployment Guide**: `docs/deployment.md`
