BEGIN;

-- Update child sidebar items (Recruitment)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), icon = 'User', route = '/candidates', sort_order = 10 WHERE name = 'candidates';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), icon = 'Database', route = '/talent-pool', sort_order = 20 WHERE name = 'talent_pool';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), icon = 'Upload', route = '/upload', sort_order = 30 WHERE name = 'upload_resume';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), icon = 'FileText', route = '/resume-parser', sort_order = 40 WHERE name = 'resume_parser';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), icon = 'Search', route = '/boolean-search', sort_order = 50 WHERE name = 'boolean_search';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), icon = 'Target', route = '/xray-search', sort_order = 60 WHERE name = 'xray_search';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='recruitment'), icon = 'Copy', route = '/duplicates', sort_order = 70 WHERE name = 'duplicates';

-- Update child sidebar items (Job Management)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='job_management'), icon = 'Briefcase', route = '/jobs', sort_order = 10 WHERE name = 'jobs';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='job_management'), icon = 'List', route = '/requirements', sort_order = 20 WHERE name = 'requirements';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='job_management'), icon = 'Zap', route = '/matching', sort_order = 30 WHERE name = 'ai_matching';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='job_management'), icon = 'Zap', route = '/matching', sort_order = 30 WHERE name = 'matching';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='job_management'), icon = 'FileSearch', route = '/jd-matching', sort_order = 40 WHERE name = 'jd_matching';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='job_management'), icon = 'GitBranch', route = '/pipeline', sort_order = 50 WHERE name = 'pipeline';

-- Update child sidebar items (Client Management)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='client_mgmt'), icon = 'Building', route = '/clients', sort_order = 10 WHERE name = 'clients';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='client_mgmt'), icon = 'Globe', route = '/companies', sort_order = 20 WHERE name = 'companies';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='client_mgmt'), icon = 'UserPlus', route = '/contacts', sort_order = 30 WHERE name = 'contacts';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='client_mgmt'), icon = 'GitBranch', route = '/client-pipeline', sort_order = 40 WHERE name = 'client_pipeline';

-- Update child sidebar items (Hiring Process)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='hiring_process'), icon = 'Send', route = '/submissions', sort_order = 10 WHERE name = 'submissions';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='hiring_process'), icon = 'Video', route = '/interviews', sort_order = 20 WHERE name = 'interviews';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='hiring_process'), icon = 'FileCheck', route = '/offers', sort_order = 30 WHERE name = 'offers';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='hiring_process'), icon = 'CheckCircle', route = '/placements', sort_order = 40 WHERE name = 'placements';

-- Update child sidebar items (Activities)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='activities'), icon = 'Calendar', route = '/calendar', sort_order = 10 WHERE name = 'calendar';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='activities'), icon = 'CheckSquare', route = '/tasks', sort_order = 20 WHERE name = 'tasks';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='activities'), icon = 'Bell', route = '/follow-ups', sort_order = 30 WHERE name = 'follow_ups';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='activities'), icon = 'MessageSquare', route = '/communications', sort_order = 40 WHERE name = 'communications';

-- Update child sidebar items (Reports)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), icon = 'FileBarChart', route = '/reports', sort_order = 10 WHERE name = 'reports_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), icon = 'TrendingUp', route = '/analytics', sort_order = 20 WHERE name = 'analytics_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), icon = 'TrendingUp', route = '/analytics', sort_order = 20 WHERE name = 'analytics';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), icon = 'Award', route = '/reports/recruiter', sort_order = 30 WHERE name = 'recruiter_performance';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), icon = 'Users', route = '/reports/team', sort_order = 40 WHERE name = 'team_performance';

-- Update child sidebar items (User Management)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='user_management'), icon = 'Users', route = '/users', sort_order = 10 WHERE name = 'users_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='user_management'), icon = 'Users', route = '/users', sort_order = 10 WHERE name = 'users';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='user_management'), icon = 'Shield', route = '/settings/permissions', sort_order = 20 WHERE name = 'roles_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='user_management'), icon = 'Users', route = '/teams', sort_order = 30 WHERE name = 'teams_menu';

-- Update child sidebar items (Settings)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='settings_group'), icon = 'User', route = '/settings/profile', sort_order = 10 WHERE name = 'profile_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='settings_group'), icon = 'Settings', route = '/settings/general', sort_order = 20 WHERE name = 'general_settings_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='settings_group'), icon = 'Settings', route = '/settings', sort_order = 20 WHERE name = 'settings';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='settings_group'), icon = 'Tag', route = '/settings/labeling', sort_order = 30 WHERE name = 'labeling_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='settings_group'), icon = 'Mail', route = '/settings/email', sort_order = 40 WHERE name = 'email_templates_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='settings_group'), icon = 'Link', route = '/settings/integrations', sort_order = 50 WHERE name = 'integrations_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='settings_group'), icon = 'Server', route = '/settings/system', sort_order = 60 WHERE name = 'system_config_menu';

-- Update child sidebar items (AI Tools)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), icon = 'UploadCloud', route = '/ai/bulk-upload', sort_order = 10 WHERE name = 'bulk_upload_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), icon = 'DownloadCloud', route = '/ai/bulk-download', sort_order = 20 WHERE name = 'bulk_download_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), icon = 'Users', route = '/ai/bulk-assignment', sort_order = 30 WHERE name = 'bulk_assignment_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), icon = 'FileText', route = '/ai/export-excel', sort_order = 40 WHERE name = 'export_excel_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), icon = 'File', route = '/ai/export-csv', sort_order = 50 WHERE name = 'export_csv_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), icon = 'FileText', route = '/ai/export-pdf', sort_order = 60 WHERE name = 'export_pdf_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools'), icon = 'Code', route = '/ai/api', sort_order = 70 WHERE name = 'api_access_menu';

-- Update child sidebar items (Administration)
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='administration'), icon = 'Activity', route = '/audit-logs', sort_order = 10 WHERE name = 'audit_logs_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='administration'), icon = 'Settings', route = '/admin/settings', sort_order = 20 WHERE name = 'admin_settings_menu';
UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='administration'), icon = 'Database', route = '/admin/database', sort_order = 30 WHERE name = 'database_management_menu';

COMMIT;
