-- Migration: Convert notice_period and employment_type to ENUM types
-- Purpose: Add type safety and enforce valid values for filter search
-- Date: 2025-01-XX
-- Prerequisite: Migration 001 (add_filter_columns.sql) must be run first

-- Step 1: Create ENUM types
CREATE TYPE notice_period_enum AS ENUM (
    'immediately',
    '15_days',
    '30_days',
    '45_days',
    '60_days',
    '90_days',
    'more_than_90_days',
    'not_serving'
);

CREATE TYPE employment_type_enum AS ENUM (
    'full_time',
    'part_time',
    'contract',
    'internship',
    'freelance',
    'unknown'
);

-- Step 2: Backfill NULL values with safe defaults
-- For notice_period: NULL -> 'not_serving' (candidate not actively serving notice)
UPDATE candidates 
SET notice_period = 'not_serving' 
WHERE notice_period IS NULL OR notice_period = '';

-- For employment_type: NULL -> 'unknown' (employment type not specified)
UPDATE candidates 
SET employment_type = 'unknown' 
WHERE employment_type IS NULL OR employment_type = '';

-- Step 3: Normalize existing data to match ENUM values
-- Normalize common notice period variations
UPDATE candidates 
SET notice_period = 'immediately' 
WHERE notice_period ILIKE '%immediate%';

UPDATE candidates 
SET notice_period = '15_days' 
WHERE notice_period ILIKE '%15%';

UPDATE candidates 
SET notice_period = '30_days' 
WHERE notice_period ILIKE '%30%';

UPDATE candidates 
SET notice_period = '45_days' 
WHERE notice_period ILIKE '%45%';

UPDATE candidates 
SET notice_period = '60_days' 
WHERE notice_period ILIKE '%60%';

UPDATE candidates 
SET notice_period = '90_days' 
WHERE notice_period ILIKE '%90%';

UPDATE candidates 
SET notice_period = 'more_than_90_days' 
WHERE notice_period ILIKE '%more%' OR notice_period ILIKE '%>90%';

-- Normalize common employment type variations
UPDATE candidates 
SET employment_type = 'full_time' 
WHERE employment_type ILIKE '%full%';

UPDATE candidates 
SET employment_type = 'part_time' 
WHERE employment_type ILIKE '%part%';

UPDATE candidates 
SET employment_type = 'contract' 
WHERE employment_type ILIKE '%contract%';

UPDATE candidates 
SET employment_type = 'internship' 
WHERE employment_type ILIKE '%intern%';

UPDATE candidates 
SET employment_type = 'freelance' 
WHERE employment_type ILIKE '%freelance%';

-- Step 4: Handle any remaining invalid values by setting to default
UPDATE candidates 
SET notice_period = 'not_serving' 
WHERE notice_period NOT IN ('immediately', '15_days', '30_days', '45_days', '60_days', '90_days', 'more_than_90_days', 'not_serving');

UPDATE candidates 
SET employment_type = 'unknown' 
WHERE employment_type NOT IN ('full_time', 'part_time', 'contract', 'internship', 'freelance', 'unknown');

-- Step 5: Alter columns to use ENUM type
-- Drop the existing indexes first (they will be recreated after type change)
DROP INDEX IF EXISTS idx_candidates_notice_period;
DROP INDEX IF EXISTS idx_candidates_employment_type;

-- Alter columns to ENUM type (USING clause converts existing VARCHAR values to ENUM)
ALTER TABLE candidates 
ALTER COLUMN notice_period TYPE notice_period_enum 
USING notice_period::notice_period_enum;

ALTER TABLE candidates 
ALTER COLUMN employment_type TYPE employment_type_enum 
USING employment_type::employment_type_enum;

-- Step 6: Recreate indexes on ENUM columns (more efficient than VARCHAR indexes)
CREATE INDEX idx_candidates_notice_period ON candidates(notice_period);
CREATE INDEX idx_candidates_employment_type ON candidates(employment_type);

-- Step 7: Add comment to document the change
COMMENT ON COLUMN candidates.notice_period IS 'Candidate notice period - ENUM type for type safety';
COMMENT ON COLUMN candidates.employment_type IS 'Candidate employment type - ENUM type for type safety';

-- Verification queries (run after migration to verify)
-- SELECT notice_period, COUNT(*) FROM candidates GROUP BY notice_period;
-- SELECT employment_type, COUNT(*) FROM candidates GROUP BY employment_type;