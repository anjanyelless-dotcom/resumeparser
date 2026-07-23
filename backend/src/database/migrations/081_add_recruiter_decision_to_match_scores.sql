-- ============================================================
-- Migration: 081_add_recruiter_decision_to_match_scores.sql
-- Description: Adds recruiter_decision and recruiter_notes to match_scores for shortlisting candidates.
-- ============================================================

-- Forward Migration
ALTER TABLE match_scores 
ADD COLUMN IF NOT EXISTS recruiter_decision VARCHAR(50) DEFAULT 'Pending' CHECK (recruiter_decision IN ('Pending', 'Shortlisted', 'Rejected', 'Moved To Hiring Process')),
ADD COLUMN IF NOT EXISTS recruiter_notes TEXT;

-- Constraint Review
-- Ensured that recruiter_decision is constrained to a predefined set of values to maintain data integrity.

-- Index Review
-- Create index for performance on filtering by decision
CREATE INDEX IF NOT EXISTS idx_match_scores_recruiter_decision ON match_scores(recruiter_decision);

-- Verification
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_scores' AND column_name = 'recruiter_decision') THEN
        RAISE NOTICE 'recruiter_decision column created successfully';
    ELSE
        RAISE EXCEPTION 'recruiter_decision column creation failed';
    END IF;
END $$;

-- ============================================================
-- Rollback Migration (For reference)
-- ============================================================
/*
ALTER TABLE match_scores 
DROP COLUMN IF EXISTS recruiter_decision,
DROP COLUMN IF EXISTS recruiter_notes;

DROP INDEX IF EXISTS idx_match_scores_recruiter_decision;
*/
