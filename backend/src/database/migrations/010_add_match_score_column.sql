-- Migration: Add match_score to candidates table
-- Run this in psql or programmatically to add match_score for ranking.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'match_score') THEN
            ALTER TABLE candidates ADD COLUMN match_score FLOAT;
            RAISE NOTICE 'Added match_score column to candidates table';
        END IF;
    END IF;
END $$;

-- Create index on match_score for sorting
CREATE INDEX IF NOT EXISTS idx_candidates_match_score ON candidates (match_score DESC);
