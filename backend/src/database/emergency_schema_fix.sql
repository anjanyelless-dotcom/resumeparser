-- ============================================================
-- EMERGENCY SCHEMA FIX - Resolve Missing Columns Issue
-- Run this immediately to fix production errors
-- ============================================================

-- Add missing total_experience_years column
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS 
total_experience_years DOUBLE PRECISION;

-- Migrate data from years_experience to total_experience_years
UPDATE candidates SET total_experience_years = years_experience 
WHERE total_experience_years IS NULL AND years_experience IS NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_candidates_total_experience_years 
ON candidates (total_experience_years);

-- Remove orphaned columns that were marked for removal
-- Only run these if you're sure they're not being used
-- ALTER TABLE candidates DROP COLUMN IF EXISTS ssn;
-- ALTER TABLE candidates DROP COLUMN IF EXISTS current_title;
-- ALTER TABLE candidates DROP COLUMN IF EXISTS resume_path;
-- ALTER TABLE candidates DROP COLUMN IF EXISTS total_years_exp;

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    'FIXED' as status
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND table_schema = 'public'
  AND column_name IN ('total_experience_years', 'years_experience')
ORDER BY column_name;

-- Show data migration status
SELECT 
    COUNT(*) as total_candidates,
    COUNT(total_experience_years) as with_total_experience_years,
    COUNT(years_experience) as with_years_experience,
    COUNT(CASE WHEN total_experience_years IS NOT NULL THEN 1 END) as migrated_count
FROM candidates;
