# Database Schema Drift Analysis Report

## Executive Summary

**CRITICAL ISSUE IDENTIFIED**: The database schema has significant drift between local and production environments due to incomplete migration execution and schema cleanup. The `total_experience_years` column was removed from the master schema but still exists in some environments and is referenced in the code.

## Root Cause Analysis

### 1. Schema Cleanup vs Migration Conflict

**Issue**: The `schema.sql` file was cleaned up to remove duplicate columns, but existing databases still have the old columns.

**Evidence**:
- `schema.sql` line 19: `total_experience_years (dup)` - marked as removed
- Migration 020 line 51: `total_experience_years double precision` - still exists in migrations
- Code references: 11 files still reference `total_experience_years`

### 2. Column Naming Inconsistencies

**Local Database**:
- Has: `years_experience` (double precision)
- Has: `total_years_exp` (jsonb)
- Missing: `total_experience_years`

**Code Expects**:
- References: `total_experience_years` (double precision)

**Migration Files Show**:
- Migration 020: `total_experience_years double precision`
- Migration 021: `total_experience_years DOUBLE PRECISION`

### 3. Schema Drift Patterns

| Column | schema.sql | Migration 020 | Local DB | Code References | Status |
|--------|------------|---------------|----------|-----------------|---------|
| `total_experience_years` | ❌ Removed | ✅ Line 51 | ❌ Missing | ✅ 11 files | **CRITICAL** |
| `years_experience` | ✅ Line 200 | ✅ Line 17 | ✅ Present | ✅ Used | OK |
| `total_years_exp` | ❌ Not in schema | ❌ Not in migration | ✅ Present | ❌ Not used | **ORPHAN** |
| `ssn` | ❌ Removed | ✅ Line 12 | ✅ Present | ❌ Not used | **ORPHAN** |
| `current_title` | ❌ Removed | ✅ Line 18 | ✅ Present | ❌ Not used | **ORPHAN** |
| `resume_path` | ❌ Removed | ✅ Line 65 | ✅ Present | ❌ Not used | **ORPHAN** |

## Detailed Findings

### 1. Missing Columns in Local Database

```sql
-- Columns that should exist but don't:
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND column_name = 'total_experience_years';
-- Result: 0 rows (MISSING)
```

### 2. Orphaned Columns in Local Database

```sql
-- Columns that exist but shouldn't:
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND column_name IN ('ssn', 'current_title', 'resume_path');
-- Result: 3 rows (ORPHANED)
```

### 3. Code Reference Analysis

**Files referencing `total_experience_years`:**
1. `controllers/candidate.controller.ts` (lines 454, 458, 460, 778, 1032)
2. `controllers/upload.controller.ts` (lines 194, 199)
3. `controllers/matching.controller.ts` (line 612)
4. `controllers/candidate-search.controller.ts` (lines 48, 581, 604)
5. `models/candidate.model.ts` (line 27)
6. `check_real_columns.js` (line 62)
7. `examine_candidate_data.js` (line 42)

## Environment Comparison

### Local Database (Current State)
- **Tables**: 47 base tables, 23 views
- **Candidates Columns**: 42 columns
- **Key Issues**: Missing `total_experience_years`, has orphaned columns

### Production Database (Inferred)
- Based on error messages, production has different schema
- Sometimes works, sometimes fails with "column does not exist"
- Indicates partial migration execution

## Migration History Issues

### Migration Execution Problems

1. **Migration 020**: Contains `total_experience_years` but may not have run everywhere
2. **Migration 021**: Also contains `total_experience_years` 
3. **Schema Cleanup**: Created new `schema.sql` without migration tracking
4. **run_patch.sql**: May not have been applied consistently

### Missing Migration Tracking

```sql
-- No migration tracking table found
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%migration%';
-- Result: 0 rows (NO TRACKING)
```

## Immediate Impact

### Production Errors
```json
{
  "error": "Transaction failed",
  "message": "column \"total_experience_years\" does not exist",
  "code": "TRANSACTION_FAILED"
}
```

### Affected Features
1. Candidate creation/update
2. Resume parsing and experience calculation
3. Candidate search and filtering
4. Job matching algorithms
5. Export and reporting functions

## Recommended Fixes

### 1. Emergency Fix (Immediate)

```sql
-- Add missing column to local database
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
total_experience_years DOUBLE PRECISION;

-- Update existing data from years_experience
UPDATE candidates SET total_experience_years = years_experience 
WHERE total_experience_years IS NULL AND years_experience IS NOT NULL;
```

### 2. Code Fixes (Required)

Replace all references to `total_experience_years` with `years_of_experience`:

```typescript
// Before
total_experience_years: candidate.total_experience_years

// After  
total_experience_years: candidate.years_of_experience
```

### 3. Schema Synchronization

```sql
-- Remove orphaned columns
ALTER TABLE candidates DROP COLUMN IF EXISTS ssn;
ALTER TABLE candidates DROP COLUMN IF EXISTS current_title;
ALTER TABLE candidates DROP COLUMN IF EXISTS resume_path;
ALTER TABLE candidates DROP COLUMN IF EXISTS total_years_exp;
```

### 4. Migration System Implementation

Create proper migration tracking:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## Long-term Solution

### 1. Single Source of Truth

- Use `schema.sql` as the master schema
- Create proper migration scripts for all changes
- Implement migration tracking

### 2. Deployment Workflow

```
Developer Machine
↓
Create Migration
↓
Test Locally
↓
Git Commit
↓
CI/CD Pipeline
↓
Backup Production DB
↓
Run Migration
↓
Verify Schema
↓
Deploy Code
```

### 3. Environment Parity

- Use Docker for local development
- Automated schema validation in CI
- Regular schema audits
- Environment-specific configuration only

## Risk Assessment

### High Risk
- **Data Loss**: Column drops without data migration
- **Production Downtime**: Schema changes during business hours
- **Inconsistent States**: Partial migration execution

### Medium Risk
- **Performance Issues**: Schema changes affecting queries
- **Feature Breakage**: Code expecting different schema

### Low Risk
- **Development Delays**: Time needed for proper fixes

## Next Steps

1. **Immediate**: Apply emergency fix to restore functionality
2. **Short-term**: Update all code references
3. **Medium-term**: Implement proper migration system
4. **Long-term**: Establish deployment workflow with schema validation

## Monitoring Recommendations

1. Add schema validation to startup checks
2. Monitor for "column does not exist" errors
3. Regular automated schema comparisons
4. Alert on schema drift detection
