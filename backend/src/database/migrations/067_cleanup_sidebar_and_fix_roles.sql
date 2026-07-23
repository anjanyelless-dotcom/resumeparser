BEGIN;

DO $$
DECLARE
    v_correct_role_id UUID;
    v_wrong_role_id UUID;
    r RECORD;
BEGIN
    -- 1. Restore Roles to Lowercase
    -- We need to ensure roles are lowercase ('admin', 'manager', etc.) since the codebase expects them.
    FOR r IN SELECT 'admin' as correct_name, 'Admin' as wrong_name
             UNION SELECT 'manager', 'Manager'
             UNION SELECT 'recruiter', 'Recruiter'
             UNION SELECT 'bdm', 'BDM'
             UNION SELECT 'candidate', 'Candidate'
             UNION SELECT 'super_admin', 'Super Admin'
    LOOP
        SELECT id INTO v_correct_role_id FROM roles WHERE name = r.correct_name LIMIT 1;
        SELECT id INTO v_wrong_role_id FROM roles WHERE name = r.wrong_name LIMIT 1;

        IF v_correct_role_id IS NOT NULL AND v_wrong_role_id IS NOT NULL THEN
            -- BOTH exist. Merge wrong into correct, then delete wrong.
            UPDATE users SET role_id = v_correct_role_id WHERE role_id = v_wrong_role_id;
            
            -- Merge permissions safely
            UPDATE role_permissions rp1 
            SET role_id = v_correct_role_id 
            WHERE role_id = v_wrong_role_id 
            AND NOT EXISTS (
                SELECT 1 FROM role_permissions rp2 
                WHERE rp2.role_id = v_correct_role_id 
                AND rp2.module_id = rp1.module_id 
                AND rp2.action = rp1.action
            );
            DELETE FROM role_permissions WHERE role_id = v_wrong_role_id;

            UPDATE role_sidebar_permissions rsp1 
            SET role_id = v_correct_role_id 
            WHERE role_id = v_wrong_role_id 
            AND NOT EXISTS (
                SELECT 1 FROM role_sidebar_permissions rsp2 
                WHERE rsp2.role_id = v_correct_role_id 
                AND rsp2.sidebar_module_id = rsp1.sidebar_module_id
            );
            DELETE FROM role_sidebar_permissions WHERE role_id = v_wrong_role_id;
            
            -- Delete the wrong role
            DELETE FROM roles WHERE id = v_wrong_role_id;
            
            -- Ensure correct role is active
            UPDATE roles SET deleted_at = NULL WHERE id = v_correct_role_id;

        ELSIF v_wrong_role_id IS NOT NULL THEN
            -- ONLY wrong exists. Rename it to correct.
            UPDATE roles SET name = r.correct_name, deleted_at = NULL WHERE id = v_wrong_role_id;
        
        ELSIF v_correct_role_id IS NOT NULL THEN
            -- ONLY correct exists. Just ensure it's active.
            UPDATE roles SET deleted_at = NULL WHERE id = v_correct_role_id;
        END IF;
    END LOOP;
END;
$$;

-- Ensure all current roles are active (remove any soft deletes)
UPDATE roles SET deleted_at = NULL;

-- 2. Fix Users table role column (it's a string column used in JWT and frontend checks)
UPDATE users SET role = LOWER(role);

-- 3. Clean up the Legacy User Management Sidebar
-- The new design uses tabs under "Settings" for Permissions and Users.
-- We must permanently hide the old sidebar modules.
UPDATE sidebar_modules 
SET is_active = false 
WHERE name IN ('user_management', 'users', 'users_menu', 'roles_menu', 'teams_menu', 'permissions');

COMMIT;
