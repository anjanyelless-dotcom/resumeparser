-- ============================================================
-- MIGRATION 022: Add portfolio_url column
-- ============================================================
-- Adds portfolio_url to candidates table.
-- total_experience_years already exists from migration 021.
-- phone_normalized index added for duplicate detection.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Add portfolio_url column if missing
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(500);

-- Add a normalized phone index for fast duplicate checks
-- We store full phone in 'phone' column; index on it for partial match
CREATE INDEX IF NOT EXISTS idx_candidates_phone ON candidates (phone);

-- Add index on full_name for name-based duplicate check
-- (idx_candidates_full_name already exists from migration 021)

-- Ensure total_experience_years exists (safety net)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS total_experience_years DOUBLE PRECISION;
