-- Migration 038: Add assign_recruiters permission and grant to team_lead and admin roles

-- ============================================================
-- 1. Add assign_recruiters permission
-- ============================================================

INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('requirements', 'assign_recruiters', 'Assign recruiters to job requirements', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- ============================================================
-- 2. Grant permission to team_lead role
-- ============================================================

DO $$
DECLARE
    team_lead_role_id UUID;
    perm_id UUID;
BEGIN
    -- Find team_lead role
    SELECT id INTO team_lead_role_id FROM roles WHERE name = 'team_lead';
    
    IF team_lead_role_id IS NULL THEN
        RAISE EXCEPTION 'Team lead role not found';
    END IF;
    
    -- Find assign_recruiters permission
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'requirements' AND action_name = 'assign_recruiters';
    
    IF perm_id IS NULL THEN
        RAISE EXCEPTION 'assign_recruiters permission not found';
    END IF;
    
    -- Grant permission to team_lead role
    INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
    VALUES (team_lead_role_id, perm_id, NOW(), NULL)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE '✅ assign_recruiters permission granted to team_lead role';
END $$;

-- ============================================================
-- 3. Grant permission to admin role
-- ============================================================

DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Find admin role
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    IF admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Admin role not found';
    END IF;
    
    -- Find assign_recruiters permission
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'requirements' AND action_name = 'assign_recruiters';
    
    IF perm_id IS NULL THEN
        RAISE EXCEPTION 'assign_recruiters permission not found';
    END IF;
    
    -- Grant permission to admin role
    INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
    VALUES (admin_role_id, perm_id, NOW(), NULL)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE '✅ assign_recruiters permission granted to admin role';
END $$;

-- ============================================================
-- 4. Verification
-- ============================================================

DO $$
BEGIN
    -- Verify permission was created
    IF EXISTS (
        SELECT 1 FROM permissions 
        WHERE module_name = 'requirements' AND action_name = 'assign_recruiters'
    ) THEN
        RAISE NOTICE '✅ assign_recruiters permission created successfully';
    ELSE
        RAISE EXCEPTION '❌ assign_recruiters permission was not created';
    END IF;

    -- Verify team_lead has permission
    IF EXISTS (
        SELECT 1 FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE r.name = 'team_lead' AND p.action_name = 'assign_recruiters'
    ) THEN
        RAISE NOTICE '✅ Team lead role has assign_recruiters permission';
    ELSE
        RAISE EXCEPTION '❌ Team lead role does not have assign_recruiters permission';
    END IF;

    -- Verify admin has permission
    IF EXISTS (
        SELECT 1 FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE r.name = 'admin' AND p.action_name = 'assign_recruiters'
    ) THEN
        RAISE NOTICE '✅ Admin role has assign_recruiters permission';
    ELSE
        RAISE EXCEPTION '❌ Admin role does not have assign_recruiters permission';
    END IF;
END $$;

-- ============================================================
-- Migration complete
-- ============================================================