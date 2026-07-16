-- Migration 037: Add submission_reviews table
-- This table tracks the review history of submissions, allowing multiple reviews over time
-- Unlike submissions.status, this preserves the complete audit trail of review decisions

-- ============================================================
-- 1. Create submission_reviews table
-- ============================================================

CREATE TABLE IF NOT EXISTS submission_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reviewed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_changes')),
    notes TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE submission_reviews IS 'Tracks the complete review history of submissions, allowing multiple reviews over time while preserving the audit trail';

-- Add column comments
COMMENT ON COLUMN submission_reviews.id IS 'Unique identifier for the review record';
COMMENT ON COLUMN submission_reviews.submission_id IS 'Reference to the submission being reviewed';
COMMENT ON COLUMN submission_reviews.reviewed_by IS 'User who performed the review';
COMMENT ON COLUMN submission_reviews.decision IS 'Review decision: approved, rejected, or needs_changes';
COMMENT ON COLUMN submission_reviews.notes IS 'Optional notes explaining the review decision';
COMMENT ON COLUMN submission_reviews.reviewed_at IS 'When the review was performed';
COMMENT ON COLUMN submission_reviews.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN submission_reviews.updated_at is 'Record last update timestamp';

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================

-- Index on submission_id for quickly finding all reviews for a submission
CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission_id ON submission_reviews(submission_id);

-- Index on reviewed_by for finding all reviews performed by a user
CREATE INDEX IF NOT EXISTS idx_submission_reviews_reviewed_by ON submission_reviews(reviewed_by);

-- Index on decision for filtering by review outcome
CREATE INDEX IF NOT EXISTS idx_submission_reviews_decision ON submission_reviews(decision);

-- Index on reviewed_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_submission_reviews_reviewed_at ON submission_reviews(reviewed_at DESC);

-- Composite index for submission + date (common query pattern)
CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission_date ON submission_reviews(submission_id, reviewed_at DESC);

-- ============================================================
-- 3. Create trigger for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_submission_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_submission_reviews_updated_at
    BEFORE UPDATE ON submission_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_submission_reviews_updated_at();

-- ============================================================
-- 4. Create views for common queries
-- ============================================================

-- View: Latest review for each submission
CREATE OR REPLACE VIEW latest_submission_reviews AS
SELECT DISTINCT ON (sr.submission_id)
    sr.id,
    sr.submission_id,
    sr.reviewed_by,
    sr.decision,
    sr.notes,
    sr.reviewed_at,
    sr.created_at,
    sr.updated_at,
    u.email as reviewer_email,
    u.role as reviewer_role
FROM submission_reviews sr
JOIN users u ON sr.reviewed_by = u.id
ORDER BY sr.submission_id, sr.reviewed_at DESC;

COMMENT ON VIEW latest_submission_reviews IS 'Shows the most recent review for each submission';

-- View: Review history for a submission with reviewer details
CREATE OR REPLACE VIEW submission_review_history AS
SELECT
    sr.id,
    sr.submission_id,
    sr.reviewed_by,
    sr.decision,
    sr.notes,
    sr.reviewed_at,
    sr.created_at,
    sr.updated_at,
    u.email as reviewer_email,
    u.role as reviewer_role,
    s.job_id,
    s.candidate_id,
    s.status as current_submission_status
FROM submission_reviews sr
JOIN users u ON sr.reviewed_by = u.id
JOIN submissions s ON sr.submission_id = s.id
ORDER BY sr.reviewed_at DESC;

COMMENT ON VIEW submission_review_history IS 'Complete review history with reviewer and submission details';

-- View: Review statistics by decision type
CREATE OR REPLACE VIEW submission_review_stats AS
SELECT
    decision,
    COUNT(*) as review_count,
    COUNT(DISTINCT submission_id) as unique_submissions,
    COUNT(DISTINCT reviewed_by) as unique_reviewers,
    MIN(reviewed_at) as first_review,
    MAX(reviewed_at) as last_review
FROM submission_reviews
GROUP BY decision;

COMMENT ON VIEW submission_review_stats IS 'Statistics about review decisions';

-- ============================================================
-- 5. Verification
-- ============================================================

DO $$
BEGIN
    -- Check if table was created
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'submission_reviews'
    ) THEN
        RAISE NOTICE '✅ submission_reviews table created successfully';
    ELSE
        RAISE EXCEPTION '❌ submission_reviews table was not created';
    END IF;

    -- Check if indexes were created
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'submission_reviews' AND indexname = 'idx_submission_reviews_submission_id'
    ) THEN
        RAISE NOTICE '✅ idx_submission_reviews_submission_id index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_submission_reviews_submission_id index was not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'submission_reviews' AND indexname = 'idx_submission_reviews_reviewed_by'
    ) THEN
        RAISE NOTICE '✅ idx_submission_reviews_reviewed_by index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_submission_reviews_reviewed_by index was not created';
    END IF;

    -- Check if views were created
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'latest_submission_reviews'
    ) THEN
        RAISE NOTICE '✅ latest_submission_reviews view created successfully';
    ELSE
        RAISE EXCEPTION '❌ latest_submission_reviews view was not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'submission_review_history'
    ) THEN
        RAISE NOTICE '✅ submission_review_history view created successfully';
    ELSE
        RAISE EXCEPTION '❌ submission_review_history view was not created';
    END IF;
END $$;

-- ============================================================
-- 6. Sample data (optional - for testing)
-- ============================================================

-- This is commented out by default. Uncomment if you want to add sample review data.
/*
-- Add sample reviews for existing submissions
INSERT INTO submission_reviews (submission_id, reviewed_by, decision, notes)
SELECT 
    s.id,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    CASE 
        WHEN RANDOM() < 0.6 THEN 'approved'
        WHEN RANDOM() < 0.8 THEN 'needs_changes'
        ELSE 'rejected'
    END,
    CASE 
        WHEN RANDOM() < 0.6 THEN 'Good candidate match for the role requirements.'
        WHEN RANDOM() < 0.8 THEN 'Please provide more details about candidate experience.'
        ELSE 'Candidate skills do not match the job requirements.'
    END
FROM submissions s
WHERE s.id IN (
    SELECT id FROM submissions LIMIT 5
)
ON CONFLICT DO NOTHING;
*/

-- ============================================================
-- Migration complete
-- ============================================================