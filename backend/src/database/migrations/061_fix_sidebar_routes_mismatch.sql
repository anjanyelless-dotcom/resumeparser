BEGIN;

-- Fix the routing mismatch between sidebar links and frontend React routes (App.tsx)
UPDATE sidebar_modules SET route = '/admin/clients' WHERE name = 'clients';
UPDATE sidebar_modules SET route = '/bdm/pipeline' WHERE name = 'client_pipeline';
UPDATE sidebar_modules SET route = '/recruiter/requirements' WHERE name = 'requirements';
UPDATE sidebar_modules SET route = '/recruiter/submissions' WHERE name = 'submissions';
UPDATE sidebar_modules SET route = '/client-manager/interviews' WHERE name = 'interviews';
UPDATE sidebar_modules SET route = '/team-lead/team-kpis' WHERE name = 'team_kpis';
UPDATE sidebar_modules SET route = '/settings' WHERE name IN ('general_settings', 'general_settings_menu', 'settings_admin');

COMMIT;
