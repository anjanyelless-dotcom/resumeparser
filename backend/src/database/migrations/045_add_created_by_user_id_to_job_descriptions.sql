-- ============================================================
-- MIGRATION 045: Add created_by_user_id to job_descriptions table
-- ============================================================
-- Adds created_by_user_id column to job_descriptions table for tracking
-- which user created a job description (for BDM/Client Manager filtering).
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Add created_by_user_id column if missing
ALTER TABLE job_descriptions
  ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(255);

-- Create index on created_by_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_by_user_id ON job_descriptions (created_by_user_id);

-- Add comment for documentation
COMMENT ON COLUMN job_descriptions.created_by_user_id IS 'ID of the user who created this job description (for BDM/Client Manager filtering)';

-- ============================================================
-- DONE
-- ============================================================