-- Migration: Add external source columns to candidates table
-- Purpose: Track external candidate imports (LinkedIn, GitHub, etc.)
-- Date: 2025-01-XX

-- Add nullable columns for external source tracking
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS external_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS external_source_url TEXT;

-- Add comments to document the purpose of columns
COMMENT ON COLUMN candidates.external_source IS 'Source of external candidate import: linkedin, github, etc.';
COMMENT ON COLUMN candidates.external_source_url IS 'Original profile URL from external source';

-- Add index for filtering by external source
CREATE INDEX IF NOT EXISTS idx_candidates_external_source
ON candidates(external_source)
WHERE external_source IS NOT NULL;