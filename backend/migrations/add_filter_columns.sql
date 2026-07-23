-- Migration: Add filter columns to candidates table
-- Purpose: Add notice_period and employment_type columns for filter search feature
-- Date: 2025-01-XX

-- Add new columns to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS notice_period VARCHAR(50),
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_notice_period ON candidates(notice_period);
CREATE INDEX IF NOT EXISTS idx_candidates_employment_type ON candidates(employment_type);
CREATE INDEX IF NOT EXISTS idx_candidates_location ON candidates(location);
CREATE INDEX IF NOT EXISTS idx_candidates_years_experience ON candidates(years_experience);
CREATE INDEX IF NOT EXISTS idx_candidates_current_company ON candidates(current_company);
CREATE INDEX IF NOT EXISTS idx_candidates_current_title ON candidates(current_title);
