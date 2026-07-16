-- Migration to add missing raw_resume_text column to candidates table
-- Run this in psql with: \i backend/src/database/migrations/005_add_raw_resume_text.sql

-- Add raw_resume_text column if it doesn't exist
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS raw_resume_text TEXT;

-- Add file_path and file_type columns if they don't exist
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) CHECK (file_type IN ('pdf', 'docx', 'txt', 'image'));

-- Add updated_at column if it doesn't exist
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_candidates_updated_at ON candidates;
CREATE TRIGGER set_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
