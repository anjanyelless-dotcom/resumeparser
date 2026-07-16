-- ============================================================
-- RECRUITER PERMISSIONS - 033_seed_recruiter_permissions.sql
-- ============================================================
-- Adds recruiter-specific permissions and grants them to the recruiter role.
-- This migration extends the existing permissions system to support
-- recruiter-level access controls for their assigned requirements and candidates.
--
-- Usage (psql):
--   \i backend/src/database/migrations/033_seed_recruiter_permissions.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Add recruiter-specific permissions
-- ============================================================

-- Insert recruiter permissions (only if they don't already exist)
INSERT INTO permissions (id, module_name, action_name, description) VALUES
    (uuid_generate_v4(), 'requirements', 'view_assigned', 'View job requirements assigned to the recruiter'),
    (uuid_generate_v4(), 'candidates', 'create', 'Create new candidates'),
    (uuid_generate_v4(), 'candidates', 'edit_own', 'Edit own candidates'),
    (uuid_generate_v4(), 'candidates', 'search', 'Search and view candidates'),
    (uuid_generate_v4(), 'submissions', 'create', 'Submit candidates to jobs'),
    (uuid_generate_v4(), 'submissions', 'view_own', 'View own submissions'),
    (uuid_generate_v4(), 'interviews', 'view_own', 'View own scheduled interviews'),
    (uuid_generate_v4(), 'interviews', 'schedule', 'Schedule interviews')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- ============================================================
-- 2. Grant permissions to recruiter role
-- ============================================================

-- Get the recruiter role ID
DO $$
DECLARE
    recruiter_role_id UUID;
    perm_id UUID;
BEGIN
    -- Find the recruiter role
    SELECT id INTO recruiter_role_id FROM roles WHERE name = 'recruiter';
    
    IF recruiter_role_id IS NULL THEN
        RAISE EXCEPTION 'Recruiter role not found';
    END IF;
    
    -- Grant each permission to the recruiter role
    -- requirements:view_assigned
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'requirements' AND action_name = 'view_assigned';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (recruiter_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- candidates:create
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'candidates' AND action_name = 'create';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (recruiter_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- candidates:edit_own
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'candidates' AND action_name = 'edit_own';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (recruiter_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- candidates:search
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'candidates' AND action_name = 'search';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (recruiter_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- submissions:create
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'submissions' AND action_name = 'create';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (recruiter_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- submissions:view_own
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'submissions' AND action_name = 'view_own';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (recruiter_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- interviews:view_own
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'interviews' AND action_name = 'view_own';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (recruiter_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- interviews:schedule
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'interviews' AND action_name = 'schedule';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (recruiter_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '✅ Recruiter permissions granted successfully';
END $$;

-- ============================================================
-- 3. Verification
-- ============================================================

-- Verify recruiter permissions were added
DO $$
DECLARE
    permission_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO permission_count 
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    WHERE r.name = 'recruiter'
    AND p.module_name IN ('requirements', 'candidates', 'submissions', 'interviews');
    
    IF permission_count >= 8 THEN
        RAISE NOTICE '✅ Recruiter permissions verified: % permissions found', permission_count;
    ELSE
        RAISE EXCEPTION '❌ Recruiter permissions verification failed: only % permissions found', permission_count;
    END IF;
END $$;

-- Show recruiter permissions for reference
DO $$
BEGIN
    RAISE NOTICE '📋 Recruiter role permissions:';
    PERFORM pg_notify('recruiter_permissions', 
        'module: requirements, action: view_assigned | ' ||
        'module: candidates, action: create | ' ||
        'module: candidates, action: edit_own | ' ||
        'module: candidates, action: search | ' ||
        'module: submissions, action: create | ' ||
        'module: submissions, action: view_own | ' ||
        'module: interviews, action: view_own | ' ||
        'module: interviews, action: schedule'
    );
END $$;

DO $$ BEGIN RAISE NOTICE '🎯 Migration 033_seed_recruiter_permissions.sql completed successfully'; END $$;
DO $$ BEGIN RAISE NOTICE '👥 Recruiter role now has appropriate permissions for recruitment activities'; END $$;