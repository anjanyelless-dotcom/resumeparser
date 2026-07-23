-- Migration 076: Grant submissions:view_own_clients to BDM
-- This ensures that users with the 'bdm' role can view submissions for their clients

DO $$
DECLARE
    v_role_id UUID;
    v_module_id UUID;
    v_scope_id UUID;
BEGIN
    SELECT id INTO v_role_id FROM roles WHERE name = 'bdm' LIMIT 1;
    SELECT id INTO v_module_id FROM modules WHERE name = 'submissions' LIMIT 1;
    SELECT id INTO v_scope_id FROM scopes WHERE name = 'own' LIMIT 1;

    IF v_role_id IS NOT NULL AND v_module_id IS NOT NULL AND v_scope_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_id, action, allowed, scope_id, sidebar_visible)
        VALUES (v_role_id, v_module_id, 'view_own_clients', true, v_scope_id, true)
        ON CONFLICT (role_id, module_id, action) DO NOTHING;
        
        RAISE NOTICE 'Granted submissions:view_own_clients to BDM role';
    ELSE
        RAISE NOTICE 'Failed to grant: BDM role, module, or scope not found';
    END IF;
END $$;
