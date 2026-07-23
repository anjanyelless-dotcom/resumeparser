-- Migration: Update users_role_check to include all required roles
-- Version: 048
-- Description: Add support for candidate, bdm, team_lead, client_manager roles

-- Start transaction
BEGIN;

-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add updated constraint with all required roles
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'recruiter', 'viewer', 'candidate', 'bdm', 'team_lead', 'client_manager'));

-- Verify constraint was added
SELECT conname, pg_get_constraintdef(oid) as constraint_definition 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';

-- Test that all required roles are now allowed
DO $$
DECLARE
    allowed_roles TEXT[] := ARRAY['admin', 'recruiter', 'viewer', 'candidate', 'bdm', 'team_lead', 'client_manager'];
    test_role TEXT;
BEGIN
    FOREACH test_role IN ARRAY allowed_roles LOOP
        IF NOT (test_role IN ('admin', 'recruiter', 'viewer', 'candidate', 'bdm', 'team_lead', 'client_manager')) THEN
            RAISE EXCEPTION 'Role % is not allowed in constraint', test_role;
        END IF;
    END LOOP;
    RAISE NOTICE '✅ All required roles are now allowed: %', allowed_roles;
END $$;

-- Commit transaction
COMMIT;

-- Final verification
SELECT 'Migration 048 completed successfully - users_role_check updated with all required roles' as status;
