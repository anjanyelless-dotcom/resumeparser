-- ============================================================
-- INTERVIEWS AND FEEDBACK - 031_add_interviews_and_feedback.sql
-- ============================================================
-- Creates the interviews and interview_feedback tables to track
-- interview scheduling, execution, and feedback collection.
-- This enables complete interview management with multiple rounds
-- and structured feedback collection.
--
-- Usage (psql):
--   \i backend/src/database/migrations/031_add_interviews_and_feedback.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. interviews table
-- ============================================================

CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    round_name VARCHAR(100) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'video',
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    scheduled_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_round_name CHECK (round_name ~ '^[A-Za-z0-9\s\-]+$'),
    CONSTRAINT valid_mode CHECK (mode IN ('phone', 'video', 'in-person')),
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'completed', 'rescheduled', 'cancelled')),
    CONSTRAINT unique_submission_round UNIQUE(submission_id, round_name)
);

-- ============================================================
-- 2. interview_feedback table
-- ============================================================

CREATE TABLE IF NOT EXISTS interview_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    outcome VARCHAR(20) NOT NULL,
    notes TEXT,
    rating INTEGER,
    given_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_outcome CHECK (outcome IN ('pass', 'fail', 'hold')),
    CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
    -- Note: Feedback validation will be handled at application level
-- due to PostgreSQL limitation on subqueries in CHECK constraints
);

-- ============================================================
-- 3. Indexes for performance
-- ============================================================

-- Interviews indexes
CREATE INDEX IF NOT EXISTS idx_interviews_submission_id ON interviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_by ON interviews(scheduled_by);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interviews_mode ON interviews(mode);
CREATE INDEX IF NOT EXISTS idx_interviews_round_name ON interviews(round_name);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_interviews_submission_status ON interviews(submission_id, status);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_date_status ON interviews(scheduled_at, status);

-- Interview feedback indexes
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON interview_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_given_by ON interview_feedback(given_by);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_outcome ON interview_feedback(outcome);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_rating ON interview_feedback(rating);

-- ============================================================
-- 4. Triggers for updated_at timestamps
-- ============================================================

-- Interview trigger
CREATE OR REPLACE FUNCTION update_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_interviews_updated_at ON interviews;
CREATE TRIGGER set_interviews_updated_at
    BEFORE UPDATE ON interviews
    FOR EACH ROW
    EXECUTE FUNCTION update_interviews_updated_at();

-- ============================================================
-- 5. Views for common queries
-- ============================================================

-- View for interview schedule with candidate and job details
CREATE OR REPLACE VIEW interview_schedule AS
SELECT 
    i.id,
    i.submission_id,
    i.round_name,
    i.scheduled_at,
    i.mode,
    i.status,
    i.scheduled_by,
    i.created_at,
    i.updated_at,
    s.job_id,
    s.candidate_id,
    s.status as submission_status,
    jd.title as job_title,
    COALESCE(cl.company_name, 'Unknown Company') as company_name,
    c.full_name as candidate_name,
    c.email as candidate_email,
    u.email as scheduled_by_email
FROM interviews i
JOIN submissions s ON i.submission_id = s.id
JOIN job_descriptions jd ON s.job_id = jd.id
LEFT JOIN clients cl ON jd.client_id = cl.id
JOIN candidates c ON s.candidate_id = c.id
JOIN users u ON i.scheduled_by = u.id
ORDER BY i.scheduled_at ASC;

-- View for interview feedback summary
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

-- View for interview statistics
CREATE OR REPLACE VIEW interview_stats AS
SELECT 
    status,
    COUNT(*) as count,
    DATE(scheduled_at) as interview_date,
    mode
FROM interviews
GROUP BY status, DATE(scheduled_at), mode
ORDER BY interview_date DESC, status;

-- ============================================================
-- 6. Sample data (optional - for development)
-- ============================================================

-- Insert sample interviews (only if no data exists and we have sample data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM interviews LIMIT 1) THEN
        -- Check if we have sample submissions and users
        IF EXISTS (SELECT 1 FROM submissions LIMIT 1) AND 
           EXISTS (SELECT 1 FROM users LIMIT 1) THEN
            
            -- Get sample data
            INSERT INTO interviews (submission_id, round_name, scheduled_at, mode, scheduled_by)
            SELECT 
                s.id,
                'L1',
                NOW() + INTERVAL '1 day',
                'video',
                u.id
            FROM submissions s
            CROSS JOIN users u
            WHERE s.id = (SELECT id FROM submissions LIMIT 1)
            AND u.id = (SELECT id FROM users LIMIT 1)
            AND NOT EXISTS (
                SELECT 1 FROM interviews 
                WHERE submission_id = s.id AND round_name = 'L1'
            )
            LIMIT 1;
            
            RAISE NOTICE '✅ Sample interview data inserted';
        ELSE
            RAISE NOTICE 'Skipping sample data for interviews - requires existing submissions and users';
        END IF;
    END IF;
END $$;

-- ============================================================
-- 7. Verification
-- ============================================================

-- Verify tables were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interviews' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ interviews table created successfully';
    ELSE
        RAISE EXCEPTION '❌ interviews table creation failed';
    END IF;
END $$;

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
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'interviews' AND indexname = 'idx_interviews_submission_id') THEN
        RAISE NOTICE '✅ interviews indexes created successfully';
    ELSE
        RAISE EXCEPTION '❌ interviews indexes creation failed';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'interview_feedback' AND indexname = 'idx_interview_feedback_interview_id') THEN
        RAISE NOTICE '✅ interview_feedback indexes created successfully';
    ELSE
        RAISE EXCEPTION '❌ interview_feedback indexes creation failed';
    END IF;
END $$;

-- Verify views were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'interview_schedule' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ interview views created successfully';
    ELSE
        RAISE EXCEPTION '❌ interview views creation failed';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '🎯 Migration 031_add_interviews_and_feedback.sql completed successfully'; END $$;