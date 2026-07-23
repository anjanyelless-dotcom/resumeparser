BEGIN;

DO $$
DECLARE
    v_target_role_id UUID;
    v_source_role_id UUID;
    r RECORD;
BEGIN
    -- 1. Deduplicate Roles
    -- Merge lowercase roles into Capitalized ones to remove duplicates
    FOR r IN SELECT 'Admin' as keep_name, 'admin' as drop_name
             UNION SELECT 'Manager', 'manager'
             UNION SELECT 'Recruiter', 'recruiter'
             UNION SELECT 'BDM', 'bdm'
             UNION SELECT 'Candidate', 'candidate'
    LOOP
        SELECT id INTO v_target_role_id FROM roles WHERE name = r.keep_name LIMIT 1;
        SELECT id INTO v_source_role_id FROM roles WHERE name = r.drop_name LIMIT 1;

        IF v_target_role_id IS NOT NULL AND v_source_role_id IS NOT NULL THEN
            -- Update user references
            UPDATE users SET role_id = v_target_role_id WHERE role_id = v_source_role_id;
            
            -- Ignore duplicates in permissions joins by checking existence first
            UPDATE role_permissions rp1 
            SET role_id = v_target_role_id 
            WHERE role_id = v_source_role_id 
            AND NOT EXISTS (
                SELECT 1 FROM role_permissions rp2 
                WHERE rp2.role_id = v_target_role_id 
                AND rp2.module_id = rp1.module_id 
                AND rp2.action = rp1.action
            );
            DELETE FROM role_permissions WHERE role_id = v_source_role_id;

            UPDATE role_sidebar_permissions rsp1 
            SET role_id = v_target_role_id 
            WHERE role_id = v_source_role_id 
            AND NOT EXISTS (
                SELECT 1 FROM role_sidebar_permissions rsp2 
                WHERE rsp2.role_id = v_target_role_id 
                AND rsp2.sidebar_module_id = rsp1.sidebar_module_id
            );
            DELETE FROM role_sidebar_permissions WHERE role_id = v_source_role_id;
            
            -- Delete the duplicate lowercase role
            DELETE FROM roles WHERE id = v_source_role_id;
        END IF;
    END LOOP;
END;
$$;

-- 2. Seed Admin Permissions and Sidebar
DO $$
DECLARE
    v_admin_role_id UUID;
    v_all_scope_id UUID;
    v_module RECORD;
    v_action RECORD;
    v_sidebar RECORD;
BEGIN
    -- Get Admin Role ID
    SELECT id INTO v_admin_role_id FROM roles WHERE name IN ('Admin', 'admin') LIMIT 1;
    
    IF v_admin_role_id IS NULL THEN
        RAISE NOTICE 'Admin role not found';
        RETURN;
    END IF;

    -- Get All Scope ID
    SELECT id INTO v_all_scope_id FROM scopes WHERE name = 'all' LIMIT 1;

    -- Grant full access to all modules and actions
    FOR v_module IN SELECT id FROM modules LOOP
        FOR v_action IN SELECT name FROM actions LOOP
            INSERT INTO role_permissions (role_id, module_id, action, allowed, scope_id, sidebar_visible)
            VALUES (v_admin_role_id, v_module.id, v_action.name, true, v_all_scope_id, true)
            ON CONFLICT (role_id, module_id, action) DO UPDATE 
            SET allowed = true, sidebar_visible = true, scope_id = v_all_scope_id;
        END LOOP;
    END LOOP;
    
    -- Grant visibility for all sidebar items
    FOR v_sidebar IN SELECT id FROM sidebar_modules LOOP
        INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible)
        VALUES (v_admin_role_id, v_sidebar.id, true)
        ON CONFLICT (role_id, sidebar_module_id) DO UPDATE 
        SET visible = true;
    END LOOP;
    
    RAISE NOTICE 'Admin permissions and sidebar access seeded successfully';
END;
$$;

COMMIT;
