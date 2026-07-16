-- Migration 034: Add created_by_user_id to candidates table
-- This enables tracking which user created each candidate for recruiter-specific filtering

-- Add created_by_user_id column to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(255);

-- Add index for performance on recruiter-specific queries
CREATE INDEX IF NOT EXISTS idx_candidates_created_by_user_id ON candidates (created_by_user_id);

-- Add comment for documentation
COMMENT ON COLUMN candidates.created_by_user_id IS 'ID of the user who created this candidate record (for recruiter-specific filtering)';