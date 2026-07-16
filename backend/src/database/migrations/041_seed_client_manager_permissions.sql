-- Migration 041: Seed client_manager role permissions
-- Adds client-specific permissions for the client_manager role
-- The client_manager role itself was already seeded in the original roles migration

-- ============================================================
-- 1. Add client manager specific permissions
-- ============================================================

-- clients:view_own permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('clients', 'view_own', 'View clients that the user manages or owns', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- clients:edit_own permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('clients', 'edit_own', 'Edit clients that the user manages or owns', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- requirements:clarify_own permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('requirements', 'clarify_own', 'Clarify and provide details for requirements from own clients', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- requirements:edit_own permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('requirements', 'edit_own', 'Edit requirements from own clients', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- submissions:view_own_clients permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('submissions', 'view_own_clients', 'View submissions for requirements from own clients', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- interviews:coordinate permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('interviews', 'coordinate', 'Coordinate and schedule interviews for own clients', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- interviews:collect_feedback permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('interviews', 'collect_feedback', 'Collect and manage interview feedback for own clients', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- communications:log permission
INSERT INTO permissions (module_name, action_name, description, created_at)
VALUES ('communications', 'log', 'Log communications with clients (calls, emails, meetings)', NOW())
ON CONFLICT (module_name, action_name) DO NOTHING;

-- ============================================================
-- 2. Grant permissions to client_manager role
-- ============================================================

DO $$
DECLARE
    client_manager_role_id UUID;
    perm_id UUID;
    perm_count INTEGER := 0;
    admin_user_id UUID;
BEGIN
    -- Find client_manager role
    SELECT id INTO client_manager_role_id FROM roles WHERE name = 'client_manager';
    
    IF client_manager_role_id IS NULL THEN
        RAISE EXCEPTION 'Client manager role not found';
    END IF;
    
    -- Find an admin user to use as granted_by
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- If no admin user exists, use NULL for granted_by
    IF admin_user_id IS NULL THEN
        RAISE NOTICE '⚠️ No admin user found, using NULL for granted_by';
    END IF;
    
    -- Grant clients:view_own
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'clients' AND action_name = 'view_own';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
        VALUES (client_manager_role_id, perm_id, admin_user_id, NOW())
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        perm_count := perm_count + 1;
    END IF;
    
    -- Grant clients:edit_own
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'clients' AND action_name = 'edit_own';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
        VALUES (client_manager_role_id, perm_id, admin_user_id, NOW())
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        perm_count := perm_count + 1;
    END IF;
    
    -- Grant requirements:clarify_own
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'requirements' AND action_name = 'clarify_own';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
        VALUES (client_manager_role_id, perm_id, admin_user_id, NOW())
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        perm_count := perm_count + 1;
    END IF;
    
    -- Grant requirements:edit_own
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'requirements' AND action_name = 'edit_own';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
        VALUES (client_manager_role_id, perm_id, admin_user_id, NOW())
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        perm_count := perm_count + 1;
    END IF;
    
    -- Grant submissions:view_own_clients
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'submissions' AND action_name = 'view_own_clients';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
        VALUES (client_manager_role_id, perm_id, admin_user_id, NOW())
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        perm_count := perm_count + 1;
    END IF;
    
    -- Grant interviews:coordinate
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'interviews' AND action_name = 'coordinate';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
        VALUES (client_manager_role_id, perm_id, admin_user_id, NOW())
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        perm_count := perm_count + 1;
    END IF;
    
    -- Grant interviews:collect_feedback
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'interviews' AND action_name = 'collect_feedback';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
        VALUES (client_manager_role_id, perm_id, admin_user_id, NOW())
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        perm_count := perm_count + 1;
    END IF;
    
    -- Grant communications:log
    SELECT id INTO perm_id FROM permissions WHERE module_name = 'communications' AND action_name = 'log';
    IF perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
        VALUES (client_manager_role_id, perm_id, admin_user_id, NOW())
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        perm_count := perm_count + 1;
    END IF;
    
    RAISE NOTICE '✅ Client manager permissions created successfully (found % permissions)', perm_count::text;
END $$;

-- ============================================================
-- 3. Verification
-- ============================================================

DO $$
DECLARE
    client_manager_role_id UUID;
    permission_count INTEGER;
    perm_record RECORD;
BEGIN
    -- Find client_manager role
    SELECT id INTO client_manager_role_id FROM roles WHERE name = 'client_manager';
    
    IF client_manager_role_id IS NULL THEN
        RAISE EXCEPTION 'Client manager role not found';
    END IF;
    
    -- Count permissions for client_manager role
    SELECT COUNT(*) INTO permission_count 
    FROM role_permissions 
    WHERE role_id = client_manager_role_id;
    
    IF permission_count >= 8 THEN
        RAISE NOTICE '✅ Client manager role has all required permissions (found % permissions)', permission_count::text;
    ELSE
        RAISE NOTICE '⚠️ Client manager role has % permissions (expected at least 8)', permission_count::text;
    END IF;
    
    -- Display the permissions
    RAISE NOTICE '📋 Client Manager Role Permissions:';
    FOR perm_record IN 
        SELECT p.module_name, p.action_name, p.description
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = client_manager_role_id
        ORDER BY p.module_name, p.action_name
    LOOP
        RAISE NOTICE '   - %.%: %', perm_record.module_name, perm_record.action_name, perm_record.description;
    END LOOP;
END $$;

DO $$
BEGIN
    RAISE NOTICE '🎯 Migration 041_seed_client_manager_permissions.sql completed successfully';
END $$;