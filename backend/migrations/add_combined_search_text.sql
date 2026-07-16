-- Migration: Add combined_search_text column for Boolean search
-- This column combines title, company, summary, and skills for unified ILIKE-based search

-- Enable pg_trgm extension for trigram matching support
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add combined_search_text column (nullable to allow gradual backfill)
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS combined_search_text TEXT;

-- Add GIN trigram index for efficient ILIKE pattern matching
-- This index significantly speeds up queries like: combined_search_text ILIKE '%term%'
CREATE INDEX IF NOT EXISTS idx_candidates_combined_search_text_gin
ON candidates
USING gin (combined_search_text gin_trgm_ops);

-- Add a comment for documentation
COMMENT ON COLUMN candidates.combined_search_text IS 'Concatenated text field combining title, company, summary, and skills for unified Boolean search';
COMMENT ON INDEX idx_candidates_combined_search_text_gin IS 'GIN trigram index for efficient ILIKE pattern matching on combined_search_text';