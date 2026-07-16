-- ============================================================
-- ADD MISSING SUBMISSION PERMISSIONS - 035_add_submission_permissions.sql
-- ============================================================
-- Adds additional submission permissions that are missing from the
-- recruiter permissions migration for full submission functionality.
--
-- Usage (psql):
--   \i backend/src/database/migrations/035_add_submission_permissions.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Add missing submission permissions
-- ============================================================

-- Insert missing submission permissions (only if they don't already exist)
INSERT INTO permissions (id, module_name, action_name, description) VALUES
    (uuid_generate_v4(), 'submissions', 'view', 'View all submissions'),
    (uuid_generate_v4(), 'submissions', 'edit', 'Edit submission status')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- ============================================================
-- 2. Grant permissions to appropriate roles
-- ============================================================

-- Grant submission permissions to admin role (full access)
DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Find the admin role
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    IF admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Admin role not found';
    END IF;
    
    -- Grant submissions:view to admin
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'submissions' AND action_name = 'view';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (admin_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- Grant submissions:edit to admin
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'submissions' AND action_name = 'edit';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (admin_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '✅ Admin submission permissions granted successfully';
END $$;

-- Grant submissions:view and submissions:edit to team_lead role
DO $$
DECLARE
    team_lead_role_id UUID;
    perm_id UUID;
BEGIN
    -- Find the team_lead role
    SELECT id INTO team_lead_role_id FROM roles WHERE name = 'team_lead';
    
    IF team_lead_role_id IS NULL THEN
        RAISE EXCEPTION 'Team lead role not found';
    END IF;
    
    -- Grant submissions:view to team_lead
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'submissions' AND action_name = 'view';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (team_lead_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- Grant submissions:edit to team_lead
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'submissions' AND action_name = 'edit';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (team_lead_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '✅ Team lead submission permissions granted successfully';
END $$;

-- ============================================================
-- 3. Verification
-- ============================================================

-- Verify all submission permissions exist
DO $$
DECLARE
    permission_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO permission_count 
    FROM permissions 
    WHERE module_name = 'submissions';
    
    IF permission_count >= 4 THEN
        RAISE NOTICE '✅ Submission permissions verified: % permissions found', permission_count;
    ELSE
        RAISE EXCEPTION '❌ Submission permissions verification failed: only % permissions found', permission_count;
    END IF;
END $$;

-- Show all submission permissions for reference
DO $$
BEGIN
    RAISE NOTICE '📋 All submission permissions:';
    PERFORM pg_notify('submission_permissions', 
        'module: submissions, action: create | ' ||
        'module: submissions, action: view | ' ||
        'module: submissions, action: view_own | ' ||
        'module: submissions, action: edit'
    );
END $$;

DO $$ BEGIN RAISE NOTICE '🎯 Migration 035_add_submission_permissions.sql completed successfully'; END $$;
DO $$ BEGIN RAISE NOTICE '📝 Submission endpoints now have proper permission controls'; END $$;