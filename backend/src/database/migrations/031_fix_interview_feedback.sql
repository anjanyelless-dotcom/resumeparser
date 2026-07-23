-- ============================================================
-- FIX INTERVIEW FEEDBACK - 031_fix_interview_feedback.sql
-- ============================================================
-- Fixes the interview_feedback table creation and related views
-- after removing the problematic subquery constraint
-- ============================================================

-- Drop and recreate interview_feedback table
DROP TABLE IF EXISTS interview_feedback CASCADE;

CREATE TABLE interview_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    outcome VARCHAR(20) NOT NULL,
    notes TEXT,
    rating INTEGER,
    given_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_outcome CHECK (outcome IN ('pass', 'fail', 'hold')),
    CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- Create indexes for interview_feedback
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON interview_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_given_by ON interview_feedback(given_by);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_outcome ON interview_feedback(outcome);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_rating ON interview_feedback(rating);

-- Drop and recreate views that depend on interview_feedback
DROP VIEW IF EXISTS interview_feedback_summary;
DROP VIEW IF EXISTS interview_stats;

-- Recreate interview_feedback_summary view
CREATE OR REPLACE VIEW interview_feedback_summary AS
SELECT 
    i.id as interview_id,
    i.round_name,
    i.scheduled_at,
    i.mode,
    i.status,
    s.job_id,
    s.candidate_id,
    jd.title as job_title,
    COALESCE(cl.company_name, 'Unknown Company') as company_name,
    c.full_name as candidate_name,
    c.email as candidate_email,
    f.outcome,
    f.notes,
    f.rating,
    f.given_by,
    f.created_at as feedback_date,
    u.email as feedback_given_by_email
FROM interviews i
JOIN submissions s ON i.submission_id = s.id
JOIN job_descriptions jd ON s.job_id = jd.id
LEFT JOIN clients cl ON jd.client_id = cl.id
JOIN candidates c ON s.candidate_id = c.id
LEFT JOIN interview_feedback f ON i.id = f.interview_id
LEFT JOIN users u ON f.given_by = u.id
ORDER BY i.scheduled_at DESC;

-- Recreate interview_stats view
CREATE OR REPLACE VIEW interview_stats AS
SELECT 
    status,
    COUNT(*) as count,
    DATE(scheduled_at) as interview_date,
    mode
FROM interviews
GROUP BY status, DATE(scheduled_at), mode
ORDER BY interview_date DESC, status;

-- Verify interview_feedback table was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_feedback' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ interview_feedback table created successfully';
    ELSE
        RAISE EXCEPTION '❌ interview_feedback table creation failed';
    END IF;
END $$;

-- Verify indexes were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'interview_feedback' AND indexname = 'idx_interview_feedback_interview_id') THEN
        RAISE NOTICE '✅ interview_feedback indexes created successfully';
    ELSE
        RAISE EXCEPTION '❌ interview_feedback indexes creation failed';
    END IF;
END $$;

-- Verify views were recreated
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'interview_feedback_summary' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ interview views recreated successfully';
    ELSE
        RAISE EXCEPTION '❌ interview views recreation failed';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '🎯 Fixed interview feedback table and views successfully'; END $$;