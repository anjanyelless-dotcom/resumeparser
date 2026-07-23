-- ============================================================
-- ACTIVITY LOG - 032_add_activity_log.sql
-- ============================================================
-- Creates the activity_log table to track user activities automatically.
-- This table captures recruitment activities like calls made, candidates sourced,
-- candidates submitted, and interviews scheduled. It's written to automatically
-- by other controllers and never exposed as a manual logging interface.
--
-- Usage (psql):
--   \i backend/src/database/migrations/032_add_activity_log.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. activity_log table
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    related_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_activity_type CHECK (activity_type IN (
        'call_made',
        'candidate_sourced', 
        'candidate_submitted',
        'interview_scheduled'
    ))
);

-- ============================================================
-- 2. Indexes for performance
-- ============================================================

-- Index for finding activities by user
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);

-- Index for finding activities by type
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);

-- Index for finding activities by related_id
CREATE INDEX IF NOT EXISTS idx_activity_log_related_id ON activity_log(related_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user_type ON activity_log(user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON activity_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_type_date ON activity_log(activity_type, created_at);

-- ============================================================
-- 3. Views for common queries
-- ============================================================

-- View for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    al.id,
    al.user_id,
    al.activity_type,
    al.related_id,
    al.created_at,
    u.email as user_email,
    u.role as user_role,
    -- Related entity details when possible
    CASE 
        WHEN al.activity_type = 'candidate_submitted' AND al.related_id IS NOT NULL THEN
            (SELECT c.full_name FROM submissions s JOIN candidates c ON s.candidate_id = c.id WHERE s.id = al.related_id)
        WHEN al.activity_type = 'interview_scheduled' AND al.related_id IS NOT NULL THEN
            (SELECT c.full_name FROM interviews i JOIN submissions s ON i.submission_id = s.id JOIN candidates c ON s.candidate_id = c.id WHERE i.id = al.related_id)
        WHEN al.activity_type = 'candidate_sourced' AND al.related_id IS NOT NULL THEN
            (SELECT c.full_name FROM candidates c WHERE c.id = al.related_id)
        ELSE NULL
    END as related_entity_name,
    -- Related entity type
    CASE 
        WHEN al.activity_type = 'candidate_submitted' THEN 'submission'
        WHEN al.activity_type = 'interview_scheduled' THEN 'interview'
        WHEN al.activity_type = 'candidate_sourced' THEN 'candidate'
        WHEN al.activity_type = 'call_made' THEN 'candidate'
        ELSE NULL
    END as related_entity_type
FROM activity_log al
JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC;

-- View for activity statistics
CREATE OR REPLACE VIEW activity_stats AS
SELECT 
    activity_type,
    COUNT(*) as count,
    DATE(created_at) as activity_date,
    user_id
FROM activity_log
GROUP BY activity_type, DATE(created_at), user_id
ORDER BY activity_date DESC, activity_type;

-- View for daily activity summary
CREATE OR REPLACE VIEW daily_activity_summary AS
SELECT 
    DATE(created_at) as activity_date,
    COUNT(*) as total_activities,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT CASE WHEN activity_type = 'candidate_sourced' THEN related_id END) as candidates_sourced,
    COUNT(DISTINCT CASE WHEN activity_type = 'candidate_submitted' THEN related_id END) as candidates_submitted,
    COUNT(DISTINCT CASE WHEN activity_type = 'interview_scheduled' THEN related_id END) as interviews_scheduled,
    COUNT(DISTINCT CASE WHEN activity_type = 'call_made' THEN related_id END) as calls_made
FROM activity_log
GROUP BY DATE(created_at)
ORDER BY activity_date DESC;

-- ============================================================
-- 4. Helper function for logging activities (to be used by controllers)
-- ============================================================

CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_related_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    -- Validate activity type
    IF p_activity_type NOT IN ('call_made', 'candidate_sourced', 'candidate_submitted', 'interview_scheduled') THEN
        RAISE EXCEPTION 'Invalid activity type: %', p_activity_type;
    END IF;
    
    -- Insert activity log
    INSERT INTO activity_log (user_id, activity_type, related_id)
    VALUES (p_user_id, p_activity_type, p_related_id)
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'Invalid user_id: %', p_user_id;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to log activity: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Verification
-- ============================================================

-- Verify table was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ activity_log table created successfully';
    ELSE
        RAISE EXCEPTION '❌ activity_log table creation failed';
    END IF;
END $$;

-- Verify indexes were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'activity_log' AND indexname = 'idx_activity_log_user_id') THEN
        RAISE NOTICE '✅ activity_log indexes created successfully';
    ELSE
        RAISE EXCEPTION '❌ activity_log indexes creation failed';
    END IF;
END $$;

-- Verify views were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_activity_summary' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ activity_log views created successfully';
    ELSE
        RAISE EXCEPTION '❌ activity_log views creation failed';
    END IF;
END $$;

-- Verify function was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_activity') THEN
        RAISE NOTICE '✅ log_activity function created successfully';
    ELSE
        RAISE EXCEPTION '❌ log_activity function creation failed';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '🎯 Migration 032_add_activity_log.sql completed successfully'; END $$;
DO $$ BEGIN RAISE NOTICE '📝 Note: Use log_activity() function in controllers to automatically track user activities'; END $$;