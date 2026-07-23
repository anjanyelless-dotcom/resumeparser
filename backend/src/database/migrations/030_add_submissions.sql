-- ============================================================
-- SUBMISSIONS - 030_add_submissions.sql
-- ============================================================
-- Creates the submissions table to track candidate submissions to jobs
-- with pipeline stage status, rejection reasons, and audit trails.
-- This enables tracking the complete candidate journey through the recruitment pipeline.
--
-- Usage (psql):
--   \i backend/src/database/migrations/030_add_submissions.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. submissions table
-- ============================================================

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted',
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_job_candidate UNIQUE(job_id, candidate_id),
    CONSTRAINT valid_status CHECK (status IN (
        'Submitted', 
        'Under Review', 
        'Shortlisted', 
        'Interview Scheduled', 
        'Interview Completed', 
        'Offer Extended', 
        'Offer Accepted', 
        'Rejected', 
        'On Hold'
    )),
    CONSTRAINT rejection_reason_required CHECK (
        (status != 'Rejected') OR (rejection_reason IS NOT NULL AND rejection_reason != '')
    )
);

-- ============================================================
-- 2. Indexes for performance
-- ============================================================

-- Index for finding submissions by job
CREATE INDEX IF NOT EXISTS idx_submissions_job_id ON submissions(job_id);

-- Index for finding submissions by candidate
CREATE INDEX IF NOT EXISTS idx_submissions_candidate_id ON submissions(candidate_id);

-- Index for finding submissions by submitted_by
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON submissions(submitted_by);

-- Index for status filtering (pipeline management)
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Index for submission date tracking
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);

-- Composite index for job pipeline views
CREATE INDEX IF NOT EXISTS idx_submissions_job_status ON submissions(job_id, status);

-- Composite index for candidate history
CREATE INDEX IF NOT EXISTS idx_submissions_candidate_status ON submissions(candidate_id, status);

-- ============================================================
-- 3. Trigger to update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_submissions_updated_at ON submissions;
CREATE TRIGGER set_submissions_updated_at
    BEFORE UPDATE ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_submissions_updated_at();

-- ============================================================
-- 4. Views for common queries
-- ============================================================

-- View for active submissions pipeline
CREATE OR REPLACE VIEW active_submissions AS
SELECT 
    s.id,
    s.job_id,
    s.candidate_id,
    s.submitted_by,
    s.status,
    s.submitted_at,
    s.updated_at,
    jd.title as job_title,
    COALESCE(cl.company_name, 'Unknown Company') as company_name,
    c.email as candidate_email,
    c.full_name as candidate_name,
    u.email as submitted_by_email,
    u.email as submitted_by_name
FROM submissions s
JOIN job_descriptions jd ON s.job_id = jd.id
LEFT JOIN clients cl ON jd.client_id = cl.id
JOIN candidates c ON s.candidate_id = c.id
JOIN users u ON s.submitted_by = u.id
WHERE s.status != 'Rejected'
ORDER BY s.submitted_at DESC;

-- View for submission statistics
CREATE OR REPLACE VIEW submission_stats AS
SELECT 
    status,
    COUNT(*) as count,
    DATE(submitted_at) as submission_date
FROM submissions
GROUP BY status, DATE(submitted_at)
ORDER BY submission_date DESC, status;

-- ============================================================
-- 5. Sample data (optional - for development)
-- ============================================================

-- Insert sample submissions (only if no data exists and we have sample data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM submissions LIMIT 1) THEN
        -- Check if we have sample jobs, candidates, and users
        IF EXISTS (SELECT 1 FROM job_descriptions LIMIT 1) AND 
           EXISTS (SELECT 1 FROM candidates LIMIT 1) AND 
           EXISTS (SELECT 1 FROM users LIMIT 1) THEN
            
            -- Get sample data
            INSERT INTO submissions (job_id, candidate_id, submitted_by, status)
            SELECT 
                jd.id,
                c.id,
                u.id,
                'Submitted'
            FROM job_descriptions jd
            CROSS JOIN candidates c
            CROSS JOIN users u
            WHERE jd.id = (SELECT id FROM job_descriptions LIMIT 1)
            AND c.id = (SELECT id FROM candidates LIMIT 1)
            AND u.id = (SELECT id FROM users LIMIT 1)
            AND NOT EXISTS (
                SELECT 1 FROM submissions 
                WHERE job_id = jd.id AND candidate_id = c.id
            )
            LIMIT 1;
            
            RAISE NOTICE '✅ Sample submission data inserted';
        ELSE
            RAISE NOTICE 'Skipping sample data for submissions - requires existing jobs, candidates, and users';
        END IF;
    END IF;
END $$;

-- ============================================================
-- 6. Verification
-- ============================================================

-- Verify table was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'submissions' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ submissions table created successfully';
    ELSE
        RAISE EXCEPTION '❌ submissions table creation failed';
    END IF;
END $$;

-- Verify indexes were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'submissions' AND indexname = 'idx_submissions_job_id') THEN
        RAISE NOTICE '✅ submissions indexes created successfully';
    ELSE
        RAISE EXCEPTION '❌ submissions indexes creation failed';
    END IF;
END $$;

-- Verify views were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'active_submissions' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ submissions views created successfully';
    ELSE
        RAISE EXCEPTION '❌ submissions views creation failed';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '🎯 Migration 030_add_submissions.sql completed successfully'; END $$;