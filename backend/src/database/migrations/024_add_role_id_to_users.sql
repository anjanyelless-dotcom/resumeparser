-- ============================================================
-- MIGRATION 024: Add role_id to users table
-- ============================================================
-- Adds role_id foreign key to users table linking to the new roles system.
-- Backfills existing users with corresponding role_id based on legacy role column.
-- Keeps the old role column for backward compatibility during transition.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Add role_id column if missing
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles (id);

-- Create index on role_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);

-- ============================================================
-- Backfill existing users with role_id based on legacy role column
-- ============================================================

-- Map legacy role strings to new role names
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE role = 'admin' AND role_id IS NULL;

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'recruiter')
WHERE role = 'recruiter' AND role_id IS NULL;

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'recruiter')
WHERE role = 'viewer' AND role_id IS NULL;

-- Handle any other legacy roles by defaulting to recruiter
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'recruiter')
WHERE role_id IS NULL AND role IS NOT NULL;

-- ============================================================
-- Add constraint to ensure role_id is not null for future records
-- ============================================================

-- Note: We don't add NOT NULL constraint yet to allow gradual migration
-- This can be added in a future migration after the old role column is dropped

-- ============================================================
-- DONE
-- ============================================================