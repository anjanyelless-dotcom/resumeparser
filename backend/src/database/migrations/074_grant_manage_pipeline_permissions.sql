-- Migration 074: Grant manage_pipeline permission to Admin and BDM roles
-- This ensures that users with 'admin' or 'bdm' roles can update client pipeline stages.

-- Ensure action 'manage_pipeline' exists
INSERT INTO actions (name, display_name) 
VALUES ('manage_pipeline', 'Manage Pipeline') 
ON CONFLICT (name) DO NOTHING;

-- Ensure module 'clients' exists
INSERT INTO modules (name, display_name) 
VALUES ('clients', 'Clients') 
ON CONFLICT (name) DO NOTHING;

-- Grant 'clients:manage_pipeline' to Admin and BDM
INSERT INTO role_permissions (role_id, module_id, action, allowed, scope_id, sidebar_visible)
SELECT r.id, m.id, a.name, true, s.id, true
FROM roles r
CROSS JOIN modules m
CROSS JOIN actions a
CROSS JOIN scopes s
WHERE r.name IN ('admin', 'bdm', 'Super Admin')
  AND m.name = 'clients' 
  AND a.name = 'manage_pipeline'
  AND s.name = 'all'
ON CONFLICT (role_id, module_id, action) DO UPDATE SET allowed = true;
