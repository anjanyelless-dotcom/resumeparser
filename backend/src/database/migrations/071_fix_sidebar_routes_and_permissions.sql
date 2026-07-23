-- Fix incorrect sidebar routes that caused 404s or redirects
UPDATE sidebar_modules SET route = '/bdm/pipeline' WHERE name = 'client_pipeline';
UPDATE sidebar_modules SET route = '/clients' WHERE name = 'clients';
UPDATE sidebar_modules SET route = '/requirements' WHERE name = 'requirements';
UPDATE sidebar_modules SET route = '/team-lead/team-kpis' WHERE name = 'team_kpis';

-- Grant 'my_assignments' visibility to manager, team_lead, and recruiter roles
INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible)
SELECT r.id, sm.id, true
FROM roles r
CROSS JOIN sidebar_modules sm
WHERE r.name IN ('manager', 'team_lead', 'recruiter') 
  AND sm.name = 'my_assignments'
  AND NOT EXISTS (
    SELECT 1 FROM role_sidebar_permissions rsp 
    WHERE rsp.role_id = r.id AND rsp.sidebar_module_id = sm.id
  );
