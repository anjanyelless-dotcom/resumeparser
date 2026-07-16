-- Run this in psql with: \i backend/src/database/migrations/004_fix_parsing_jobs.sql

-- Add missing columns to parsing_jobs table
ALTER TABLE parsing_jobs
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(10),
  ADD COLUMN IF NOT EXISTS processing_duration_ms INTEGER;

-- Fix the labeled_data table to allow multiple labeling rounds
-- (Remove unique constraint on candidate_id so a resume can be re-labeled)
ALTER TABLE IF EXISTS labeled_data
  DROP CONSTRAINT IF EXISTS labeled_data_candidate_id_key;

ALTER TABLE IF EXISTS labeled_data
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS model_version VARCHAR(50);

-- Add useful indexes
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_status ON parsing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_candidate ON parsing_jobs(candidate_id);
