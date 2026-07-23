BEGIN;

-- 1. Hide everything first
UPDATE sidebar_modules SET is_active = false;

-- 2. Activate and structure parent modules
UPDATE sidebar_modules SET is_active = true, parent_id = NULL, sort_order = 10, icon = 'Home' WHERE name = 'dashboard';
UPDATE sidebar_modules SET is_active = true, parent_id = NULL, sort_order = 20, icon = 'Users' WHERE name = 'recruitment';
UPDATE sidebar_modules SET is_active = true, parent_id = NULL, sort_order = 30, icon = 'Briefcase' WHERE name = 'job_management';
UPDATE sidebar_modules SET is_active = true, parent_id = NULL, sort_order = 40, icon = 'Building' WHERE name = 'client_mgmt';
UPDATE sidebar_modules SET is_active = true, parent_id = NULL, sort_order = 50, icon = 'UserCheck' WHERE name = 'hiring_process';
UPDATE sidebar_modules SET is_active = true, parent_id = NULL, sort_order = 60, icon = 'BarChart' WHERE name = 'reports';
UPDATE sidebar_modules SET is_active = true, parent_id = NULL, sort_order = 70, icon = 'Zap' WHERE name = 'ai_tools';
UPDATE sidebar_modules SET is_active = true, parent_id = NULL, sort_order = 80, icon = 'Settings' WHERE name = 'settings';

-- 3. Activate and link children (Recruitment)
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), sort_order = 10 WHERE name = 'candidates';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), sort_order = 20 WHERE name = 'upload_resume';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), sort_order = 30 WHERE name = 'boolean_search';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), sort_order = 40 WHERE name = 'xray_search';

-- 4. Activate and link children (Job Management)
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='job_management'), sort_order = 10 WHERE name = 'jobs';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='job_management'), sort_order = 20 WHERE name = 'requirements';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='job_management'), sort_order = 30 WHERE name IN ('my_assignments');

-- 5. Activate and link children (Client Management)
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='client_mgmt'), sort_order = 10 WHERE name = 'clients';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='client_mgmt'), sort_order = 20 WHERE name = 'client_pipeline';

-- 6. Activate and link children (Hiring Process)
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='hiring_process'), sort_order = 10 WHERE name = 'submissions';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='hiring_process'), sort_order = 20 WHERE name = 'interviews';

-- 7. Activate and link children (Reports & Analytics)
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), sort_order = 10 WHERE name = 'analytics';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), sort_order = 20 WHERE name = 'accuracy';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), sort_order = 30 WHERE name = 'team_kpis';

-- 8. Activate and link children (AI Tools)
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), sort_order = 10 WHERE name IN ('matching', 'ai_matching');
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), sort_order = 20 WHERE name = 'jd_matching';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), sort_order = 30 WHERE name = 'model_test';
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), sort_order = 40 WHERE name = 'section_preview';

-- 9. Activate and link children (Settings)
UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='settings'), sort_order = 10 WHERE name IN ('general_settings', 'general_settings_menu', 'settings_admin');

-- Ensure all these have display names matching the user's request
UPDATE sidebar_modules SET display_name = 'Model Accuracy' WHERE name = 'accuracy';
UPDATE sidebar_modules SET display_name = 'Team KPIs' WHERE name = 'team_kpis';
UPDATE sidebar_modules SET display_name = 'Model Test' WHERE name = 'model_test';
UPDATE sidebar_modules SET display_name = 'Section Preview' WHERE name = 'section_preview';
UPDATE sidebar_modules SET display_name = 'General Settings' WHERE name IN ('general_settings', 'general_settings_menu', 'settings_admin');
UPDATE sidebar_modules SET display_name = 'Reports & Analytics' WHERE name = 'reports';
UPDATE sidebar_modules SET display_name = 'AI Matching' WHERE name IN ('matching', 'ai_matching');

COMMIT;
