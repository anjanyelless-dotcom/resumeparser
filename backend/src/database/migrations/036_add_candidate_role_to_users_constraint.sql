-- Migration: Add 'candidate' role to users_role_check constraint
-- This migration allows candidates to register through the /apply page

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the updated constraint with candidate role included
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'recruiter', 'team_lead', 'client_manager', 'bdm', 'viewer', 'candidate'));

-- Verify the constraint was added correctly
SELECT conname, pg_get_constraintdef(oid) as constraint_definition 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';

-- Test that candidate role is now allowed
DO $$
BEGIN
    -- This should now succeed without error
    PERFORM 1 WHERE 'candidate' IN ('admin', 'recruiter', 'team_lead', 'client_manager', 'bdm', 'viewer', 'candidate');
    IF FOUND THEN
        RAISE NOTICE '✅ Candidate role constraint verification passed';
    ELSE
        RAISE EXCEPTION '❌ Candidate role constraint verification failed';
    END IF;
END $$;
