-- Migration 044: Seed BDM role permissions
-- Grants specific permissions to the BDM (Business Development Manager) role
-- The 'bdm' role was already seeded in migration 023, so we only add permissions here

-- ============================================================
-- 1. Ensure required permissions exist
-- ============================================================

-- Clients module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('clients', 'create', 'Create new clients'),
    ('clients', 'edit_own', 'Edit own clients'),
    ('clients', 'manage_pipeline', 'Manage client pipeline stages')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Contacts module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('contacts', 'manage_own', 'Manage own client contacts')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Requirements module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('requirements', 'create', 'Create job requirements'),
    ('requirements', 'edit_own', 'Edit own job requirements')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Communications module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('communications', 'log', 'Log client communications')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Reports module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('reports', 'view_own', 'View own reports')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- ============================================================
-- 2. Grant permissions to BDM role
-- ============================================================

-- Get the BDM role_id and grant permissions
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
    (SELECT id FROM roles WHERE name = 'bdm'),
    p.id,
    NULL
FROM permissions p
WHERE (p.module_name, p.action_name) IN (
    ('clients', 'create'),
    ('clients', 'edit_own'),
    ('clients', 'manage_pipeline'),
    ('contacts', 'manage_own'),
    ('requirements', 'create'),
    ('requirements', 'edit_own'),
    ('communications', 'log'),
    ('reports', 'view_own')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- 3. Verification
-- ============================================================

DO $$
DECLARE
    bdm_role_id UUID;
    permission_count INTEGER;
BEGIN
    -- Get BDM role_id
    SELECT id INTO bdm_role_id FROM roles WHERE name = 'bdm';
    
    IF bdm_role_id IS NULL THEN
        RAISE EXCEPTION '❌ BDM role not found';
    ELSE
        RAISE NOTICE '✅ BDM role found with ID: %', bdm_role_id;
    END IF;
    
    -- Count permissions granted to BDM
    SELECT COUNT(*) INTO permission_count 
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = bdm_role_id
    AND (p.module_name, p.action_name) IN (
        ('clients', 'create'),
        ('clients', 'edit_own'),
        ('clients', 'manage_pipeline'),
        ('contacts', 'manage_own'),
        ('requirements', 'create'),
        ('requirements', 'edit_own'),
        ('communications', 'log'),
        ('reports', 'view_own')
    );
    
    IF permission_count = 8 THEN
        RAISE NOTICE '✅ All 8 BDM permissions granted successfully';
    ELSE
        RAISE NOTICE '⚠️  Only % out of 8 BDM permissions granted', permission_count;
    END IF;
END $$;

-- ============================================================
-- Migration complete
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🎯 Migration 044_seed_bdm_permissions.sql completed successfully';
END $$;