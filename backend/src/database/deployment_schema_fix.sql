-- ============================================================
-- PRODUCTION DEPLOYMENT SCHEMA FIX
-- Complete schema synchronization for all environments
-- ============================================================

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT
);

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('2024-01-01-schema-sync', 'Fix missing columns and remove orphaned columns')
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- STEP 1: Add missing columns that code expects
-- ============================================================

-- Add total_experience_years if missing (for backward compatibility)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
total_experience_years DOUBLE PRECISION;

-- Migrate data from years_of_experience to total_experience_years
UPDATE candidates SET total_experience_years = years_of_experience 
WHERE total_experience_years IS NULL AND years_of_experience IS NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_candidates_total_experience_years 
ON candidates (total_experience_years);

-- ============================================================
-- STEP 2: Ensure all required columns exist
-- ============================================================

-- Check and add any missing columns from schema.sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
resume_file_path VARCHAR(500);

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
original_filename VARCHAR(255);

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
file_type VARCHAR(20) CHECK (file_type IN ('pdf', 'docx', 'txt', 'image'));

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
raw_resume_text TEXT;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
expected_salary_min NUMERIC;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
expected_salary_max NUMERIC;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
projects JSONB DEFAULT '[]'::jsonb;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
companies JSONB DEFAULT '[]'::jsonb;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
job_titles JSONB DEFAULT '[]'::jsonb;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
education_degrees JSONB DEFAULT '[]'::jsonb;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
universities JSONB DEFAULT '[]'::jsonb;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
consent_given BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
consent_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
other_information TEXT;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
summary_manually_edited BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
error_message TEXT;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
deleted_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- STEP 3: Remove orphaned columns (optional - commented out for safety)
-- ============================================================

-- Uncomment these lines if you're sure the columns are not being used
-- ALTER TABLE candidates DROP COLUMN IF EXISTS ssn;
-- ALTER TABLE candidates DROP COLUMN IF EXISTS current_title;
-- ALTER TABLE candidates DROP COLUMN IF EXISTS resume_path;
-- ALTER TABLE candidates DROP COLUMN IF EXISTS total_years_exp;

-- ============================================================
-- STEP 4: Update data consistency
-- ============================================================

-- Ensure all candidates have proper status
UPDATE candidates SET status = 'pending' WHERE status IS NULL;

-- Ensure all candidates have proper review_status
UPDATE candidates SET review_status = 'pending' WHERE review_status IS NULL;

-- ============================================================
-- STEP 5: Create missing indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_candidates_resume_file_path 
ON candidates (resume_file_path);

CREATE INDEX IF NOT EXISTS idx_candidates_original_filename 
ON candidates (original_filename);

CREATE INDEX IF NOT EXISTS idx_candidates_resume_hash 
ON candidates (resume_hash);

CREATE INDEX IF NOT EXISTS idx_candidates_status 
ON candidates (status);

CREATE INDEX IF NOT EXISTS idx_candidates_review_status 
ON candidates (review_status);

CREATE INDEX IF NOT EXISTS idx_candidates_tenant_id 
ON candidates (tenant_id);

CREATE INDEX IF NOT EXISTS idx_candidates_deleted_at 
ON candidates (deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- STEP 6: Verification queries
-- ============================================================

-- Show current schema status
SELECT 
    'candidates' as table_name,
    COUNT(*) as total_columns,
    COUNT(CASE WHEN data_type = 'double precision' THEN 1 END) as numeric_columns,
    COUNT(CASE WHEN data_type = 'jsonb' THEN 1 END) as jsonb_columns,
    COUNT(CASE WHEN is_nullable = 'NO' THEN 1 END) as required_columns
FROM information_schema.columns 
WHERE table_name = 'candidates' AND table_schema = 'public';

-- Show critical columns status
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('id', 'email', 'full_name', 'tenant_id', 'created_at') THEN 'CRITICAL'
        WHEN column_name IN ('years_experience', 'total_experience_years') THEN 'EXPERIENCE'
        WHEN column_name IN ('status', 'review_status') THEN 'WORKFLOW'
        ELSE 'STANDARD'
    END as importance_level
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND table_schema = 'public'
  AND column_name IN (
    'id', 'email', 'full_name', 'tenant_id', 'created_at',
    'years_experience', 'total_experience_years',
    'status', 'review_status'
  )
ORDER BY importance_level, column_name;

-- Show data migration status
SELECT 
    COUNT(*) as total_candidates,
    COUNT(total_experience_years) as with_total_experience_years,
    COUNT(years_experience) as with_years_experience,
    COUNT(CASE WHEN total_experience_years IS NOT NULL THEN 1 END) as migrated_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_status,
    COUNT(CASE WHEN review_status = 'pending' THEN 1 END) as pending_review
FROM candidates;

-- ============================================================
-- STEP 7: Clean up and optimization
-- ============================================================

-- Update table statistics
ANALYZE candidates;

-- Rebuild indexes if needed
REINDEX INDEX CONCURRENTLY idx_candidates_email;
REINDEX INDEX CONCURRENTLY idx_candidates_full_name;

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '=== SCHEMA FIX COMPLETED ===';
    RAISE NOTICE '1. Added missing columns: total_experience_years and others';
    RAISE NOTICE '2. Migrated data from years_experience to total_experience_years';
    RAISE NOTICE '3. Created necessary indexes for performance';
    RAISE NOTICE '4. Updated data consistency';
    RAISE NOTICE '5. Verification queries executed above';
    RAISE NOTICE 'Schema is now synchronized with code expectations';
END $$;
