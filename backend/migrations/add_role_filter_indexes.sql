-- Migration: Add indexes for role and skills filtering
-- Purpose: Improve performance of candidate search by filters
-- Date: 2025-01-XX

-- Index on current_title for role filtering
CREATE INDEX IF NOT EXISTS idx_candidates_current_title
ON candidates(current_title)
WHERE current_title IS NOT NULL AND current_title != '';

-- GIN index on job_titles JSONB for array contains queries
CREATE INDEX IF NOT EXISTS idx_candidates_job_titles_gin
ON candidates USING GIN(job_titles)
WHERE job_titles IS NOT NULL;

-- Composite index for common filter combinations (location + experience)
CREATE INDEX IF NOT EXISTS idx_candidates_location_experience
ON candidates(location, years_experience)
WHERE location IS NOT NULL AND years_experience IS NOT NULL;

-- Composite index for company + experience
CREATE INDEX IF NOT EXISTS idx_candidates_company_experience
ON candidates(current_company, years_experience)
WHERE current_company IS NOT NULL AND years_experience IS NOT NULL;

-- Index on years_experience for range queries
CREATE INDEX IF NOT EXISTS idx_candidates_years_experience
ON candidates(years_experience)
WHERE years_experience IS NOT NULL;

-- Index on location for location filtering
CREATE INDEX IF NOT EXISTS idx_candidates_location
ON candidates(location)
WHERE location IS NOT NULL AND location != '';

-- Index on current_company for company filtering
CREATE INDEX IF NOT EXISTS idx_candidates_current_company
ON candidates(current_company)
WHERE current_company IS NOT NULL AND current_company != '';

-- Index on notice_period for notice period filtering
CREATE INDEX IF NOT EXISTS idx_candidates_notice_period
ON candidates(notice_period)
WHERE notice_period IS NOT NULL AND notice_period != '';

-- Index on employment_type for employment type filtering
CREATE INDEX IF NOT EXISTS idx_candidates_employment_type
ON candidates(employment_type)
WHERE employment_type IS NOT NULL AND employment_type != '';

-- Add comments to document the purpose of indexes
COMMENT ON INDEX idx_candidates_current_title IS 'Index for role filtering by current_title';
COMMENT ON INDEX idx_candidates_job_titles_gin IS 'GIN index for role filtering by job_titles JSONB array';
COMMENT ON INDEX idx_candidates_location_experience IS 'Composite index for location + experience filters';
COMMENT ON INDEX idx_candidates_company_experience IS 'Composite index for company + experience filters';