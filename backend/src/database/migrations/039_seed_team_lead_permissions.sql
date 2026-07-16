-- Migration 039: Add team lead specific permissions
-- Adds permissions for team lead role: submissions:review, submissions:view_team, team:view_kpis, reports:view_team

-- ============================================================
-- 1. Add missing permissions
-- ============================================================

-- submissions:review permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('submissions', 'review', 'Review and approve/reject submissions', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- submissions:view_team permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('submissions', 'view_team', 'View submissions from team members', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- team:view_kpis permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('team', 'view_kpis', 'View team performance KPIs and metrics', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- reports:view_team permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('reports', 'view_team', 'View team reports and analytics', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- ============================================================
-- 2. Grant permissions to team_lead role
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
    
    -- Grant submissions:review
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'submissions' AND action_name = 'review';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (team_lead_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        RAISE NOTICE '✅ submissions:review granted to team_lead';
    END IF;
    
    -- Grant submissions:view_team
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'submissions' AND action_name = 'view_team';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (team_lead_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        RAISE NOTICE '✅ submissions:view_team granted to team_lead';
    END IF;
    
    -- Grant team:view_kpis
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'team' AND action_name = 'view_kpis';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (team_lead_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        RAISE NOTICE '✅ team:view_kpis granted to team_lead';
    END IF;
    
    -- Grant reports:view_team
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'reports' AND action_name = 'view_team';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (team_lead_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        RAISE NOTICE '✅ reports:view_team granted to team_lead';
    END IF;
    
    -- Also ensure requirements:assign_recruiters is granted (should already exist from migration 038)
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'requirements' AND action_name = 'assign_recruiters';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (team_lead_role_id, perm_id, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        RAISE NOTICE '✅ requirements:assign_recruiters granted to team_lead';
    END IF;
END $$;

-- ============================================================
-- 3. Verification
-- ============================================================

DO $$
DECLARE
    perm_count INTEGER;
    role_perm_count INTEGER;
BEGIN
    -- Verify permissions were created
    SELECT COUNT(*) INTO perm_count FROM permissions 
    WHERE action_name IN ('review', 'view_team', 'view_kpis', 'assign_recruiters');
    
    IF perm_count >= 4 THEN
        RAISE NOTICE '✅ Team lead permissions created successfully (found % permissions)', perm_count;
    ELSE
        RAISE EXCEPTION '❌ Some team lead permissions were not created (found % permissions)', perm_count;
    END IF;

    -- Verify team lead role has all required permissions
    SELECT COUNT(*) INTO role_perm_count FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE r.name = 'team_lead' 
    AND p.action_name IN ('assign_recruiters', 'review', 'view_team', 'view_kpis');
    
    IF role_perm_count >= 5 THEN
        RAISE NOTICE '✅ Team lead role has all required permissions (found % permissions)', role_perm_count;
    ELSE
        RAISE EXCEPTION '❌ Team lead role is missing some permissions (found % permissions)', role_perm_count;
    END IF;

    -- Display all team lead permissions
    RAISE NOTICE '📋 Team Lead Role Permissions:';
END $$;

-- ============================================================
-- Migration complete
-- ============================================================