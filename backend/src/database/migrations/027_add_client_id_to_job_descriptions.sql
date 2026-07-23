-- ============================================================
-- MIGRATION 027: Add client_id to job_descriptions table
-- ============================================================
-- Adds client_id foreign key to job_descriptions table for client-owned jobs.
-- Nullable column - existing jobs remain client-less until manually reassigned.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Add client_id column if missing
ALTER TABLE job_descriptions
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Create index on client_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_descriptions_client_id ON job_descriptions (client_id);

-- ============================================================
-- DONE
-- ============================================================