-- Migration: Update users_role_check to include candidate role
-- Version: 036
-- Description: Add candidate role to allowed roles in users table

-- Start transaction
BEGIN;

-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add updated constraint with all required roles
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'recruiter', 'team_lead', 'client_manager', 'bdm', 'viewer', 'candidate'));

-- Verify constraint was added
SELECT conname, pg_get_constraintdef(oid) as constraint_definition 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';

-- Test that all required roles are now allowed
DO $$
DECLARE
    allowed_roles TEXT[] := ARRAY['admin', 'recruiter', 'team_lead', 'client_manager', 'bdm', 'viewer', 'candidate'];
    test_role TEXT;
BEGIN
    FOREACH test_role IN ARRAY allowed_roles LOOP
        IF NOT (test_role IN ('admin', 'recruiter', 'team_lead', 'client_manager', 'bdm', 'viewer', 'candidate')) THEN
            RAISE EXCEPTION 'Role % is not allowed in constraint', test_role;
        END IF;
    END LOOP;
    RAISE NOTICE '✅ All required roles are now allowed: %', allowed_roles;
END $$;

-- Commit transaction
COMMIT;

-- Final verification
SELECT 'Migration completed successfully' as status;
