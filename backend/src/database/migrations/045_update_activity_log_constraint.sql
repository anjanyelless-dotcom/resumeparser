-- ============================================================
-- ACTIVITY LOG CONSTRAINT UPDATE - 045_update_activity_log_constraint.sql
-- ============================================================
-- Updates the activity_log table constraint to include all activity types
-- used throughout the application.
--
-- Activity types used in the application:
-- - candidate_created (candidate.controller.ts)
-- - candidate_submitted (submission.controller.ts)
-- - recruiter_assigned (job.controller.ts)
-- - interview_scheduled (interview.controller.ts)
-- - interview_feedback (interview.controller.ts)
-- - call_made (existing)
-- - candidate_sourced (existing)
--
-- Usage (psql):
--   \i backend/src/database/migrations/045_update_activity_log_constraint.sql
-- ============================================================

-- Drop the old constraint
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS valid_activity_type;

-- Add the updated constraint with all allowed activity types
ALTER TABLE activity_log 
ADD CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'call_made',
    'candidate_sourced',
    'candidate_submitted',
    'interview_scheduled',
    'candidate_created',
    'recruiter_assigned',
    'interview_feedback'
));

-- Update the log_activity function to accept the new activity types
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_related_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    -- Validate activity type
    IF p_activity_type NOT IN ('call_made', 'candidate_sourced', 'candidate_submitted', 'interview_scheduled', 'candidate_created', 'recruiter_assigned', 'interview_feedback') THEN
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

-- Verify constraint was updated
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_activity_type' 
        AND conrelid::regclass = 'activity_log'::regclass
    ) THEN
        RAISE NOTICE '✅ activity_log constraint updated successfully';
    ELSE
        RAISE EXCEPTION '❌ activity_log constraint update failed';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '🎯 Migration 045_update_activity_log_constraint.sql completed successfully'; END $$;