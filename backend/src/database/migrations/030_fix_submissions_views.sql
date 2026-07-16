-- ============================================================
-- FIX SUBMISSIONS VIEWS - 030_fix_submissions_views.sql
-- ============================================================
-- Fixes the views in submissions table with correct column references
-- ============================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS active_submissions;
DROP VIEW IF EXISTS submission_stats;

-- Recreate active_submissions view with correct column references
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
    c.full_name,
    u.email as submitted_by_email,
    u.email as submitted_by_name
FROM submissions s
JOIN job_descriptions jd ON s.job_id = jd.id
LEFT JOIN clients cl ON jd.client_id = cl.id
JOIN candidates c ON s.candidate_id = c.id
JOIN users u ON s.submitted_by = u.id
WHERE s.status != 'Rejected'
ORDER BY s.submitted_at DESC;

-- Recreate submission_stats view
CREATE OR REPLACE VIEW submission_stats AS
SELECT 
    status,
    COUNT(*) as count,
    DATE(submitted_at) as submission_date
FROM submissions
GROUP BY status, DATE(submitted_at)
ORDER BY submission_date DESC, status;

-- Verify views were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'active_submissions' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ active_submissions view created successfully';
    ELSE
        RAISE EXCEPTION '❌ active_submissions view creation failed';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'submission_stats' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ submission_stats view created successfully';
    ELSE
        RAISE EXCEPTION '❌ submission_stats view creation failed';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '🎯 Fixed submissions views successfully'; END $$;