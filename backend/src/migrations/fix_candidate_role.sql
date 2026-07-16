-- Fix candidate role constraint
-- This migration adds 'candidate' to the allowed roles in the users table

-- First, drop the existing constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with candidate role included
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'recruiter', 'team_lead', 'client_manager', 'bdm', 'viewer', 'candidate'));

-- Verify the constraint was added
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND contype = 'c' AND conname = 'users_role_check';
