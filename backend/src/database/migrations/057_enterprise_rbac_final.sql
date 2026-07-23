-- ============================================================
-- 057_enterprise_rbac_final.sql
-- Enterprise RBAC Full Architecture Migration
-- Adds: actions, modules (registration), sidebar_modules,
--       role_sidebar_permissions, extends roles table
-- ============================================================
BEGIN;

-- ============================================================
-- 1. ACTIONS TABLE (Dynamic Permission Actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- Ensure columns exist in case the table was created by an older migration
ALTER TABLE actions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Seed standard actions
INSERT INTO actions (name, display_name, sort_order) VALUES
  ('view',            'View',             10),
  ('create',          'Create',           20),
  ('edit',            'Edit',             30),
  ('delete',          'Delete',           40),
  ('export',          'Export',           50),
  ('import',          'Import',           60),
  ('upload',          'Upload',           70),
  ('download',        'Download',         80),
  ('approve',         'Approve',          90),
  ('reject',          'Reject',          100),
  ('assign',          'Assign',          110),
  ('reassign',        'Reassign',        120),
  ('archive',         'Archive',         130),
  ('restore',         'Restore',         140),
  ('run',             'Run',             150),
  ('execute',         'Execute',         160),
  ('comment',         'Comment',         170)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. MODULES TABLE (Module Registration — source of truth)
-- ============================================================
CREATE TABLE IF NOT EXISTS rbac_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    route VARCHAR(255),
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- Seed all application modules, merged with advanced features
INSERT INTO rbac_modules (name, display_name, category, route, sort_order) VALUES
  -- Dashboard
  ('dashboard',           'Dashboard',           'Dashboard',      '/dashboard',          10),
  ('analytics_dashboard', 'Analytics Dashboard', 'Dashboard',      '/analytics',          20),
  -- Recruitment
  ('candidates',          'Candidates',          'Recruitment',    '/candidates',         10),
  ('talent_pool',         'Talent Pool',         'Recruitment',    '/talent-pool',        20),
  ('upload_resume',       'Upload Resume',       'Recruitment',    '/upload',             30),
  ('resume_parser',       'Resume Parser',       'Recruitment',    '/resume-parser',      40),
  ('boolean_search',      'Boolean Search',      'Recruitment',    '/boolean-search',     50),
  ('xray_search',         'X-Ray Search',        'Recruitment',    '/xray-search',        60),
  ('duplicate_review',    'Duplicate Review',    'Recruitment',    '/duplicates',         70),
  -- Jobs
  ('jobs',                'Jobs',                'Jobs',           '/jobs',               10),
  ('requirements',        'Requirements',        'Jobs',           '/requirements',       20),
  -- Matching
  ('ai_matching',         'AI Matching',         'Matching',       '/matching',           10),
  ('jd_matching',         'JD Matching',         'Matching',       '/jd-matching',        20),
  ('pipeline_stages',     'Pipeline Stages',     'Jobs',           '/pipeline',           30),
  -- Clients
  ('clients',             'Clients',             'Clients',        '/clients',            10),
  ('companies',           'Companies',           'Clients',        '/companies',          20),
  ('contacts',            'Contacts',            'Clients',        '/contacts',           30),
  -- Hiring
  ('submissions',         'Submissions',         'Hiring',         '/submissions',        10),
  ('interviews',          'Interviews',          'Hiring',         '/interviews',         20),
  ('offers',              'Offers',              'Hiring',         '/offers',             30),
  ('placements',          'Placements',          'Hiring',         '/placements',         40),
  -- Activities
  ('calendar',            'Calendar',            'Activities',     '/calendar',           10),
  ('tasks',               'Tasks',               'Activities',     '/tasks',              20),
  ('notifications',       'Notifications',       'Activities',     '/notifications',      30),
  ('communications',      'Communications',      'Activities',     '/communications',     40),
  -- Reports
  ('reports',             'Reports',             'Reports',        '/reports',            10),
  ('analytics',           'Analytics',           'Reports',        '/analytics',          20),
  -- AI Features (merged from "Advanced Features")
  ('bulk_upload',         'Bulk Upload',         'AI Features',    NULL,                  10),
  ('bulk_download',       'Bulk Download',       'AI Features',    NULL,                  20),
  ('bulk_assignment',     'Bulk Assignment',     'AI Features',    NULL,                  30),
  ('export_excel',        'Export Excel',        'AI Features',    NULL,                  40),
  ('export_csv',          'Export CSV',          'AI Features',    NULL,                  50),
  ('export_pdf',          'Export PDF',          'AI Features',    NULL,                  60),
  ('api_access',          'API Access',          'AI Features',    NULL,                  70),
  -- Administration
  ('users',               'Users',               'Administration', '/users',              10),
  ('roles_permissions',   'Roles & Permissions', 'Administration', '/settings/permissions',20),
  ('audit_logs',          'Audit Logs',          'Administration', '/audit-logs',         30),
  ('teams',               'Teams',               'Administration', '/teams',              40),
  -- Settings
  ('profile',             'Profile',             'Settings',       '/settings/profile',   10),
  ('general_settings',    'General Settings',    'Settings',       '/settings/general',   20),
  ('labeling',            'Labeling',            'Settings',       '/labeling',           30),
  ('email_templates',     'Email Templates',     'Settings',       '/email-templates',    40),
  ('integrations',        'Integrations',        'Settings',       '/settings/integrations', 50),
  ('system_config',       'System Configuration','Settings',       '/settings/system',    60)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. SIDEBAR MODULES (Hierarchical Sidebar Management)
-- ============================================================
CREATE TABLE IF NOT EXISTS sidebar_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    parent_id UUID REFERENCES sidebar_modules(id) ON DELETE SET NULL,
    group_name VARCHAR(100),
    icon VARCHAR(100),
    route VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- Ensure columns exist in case the table was created by an older migration
ALTER TABLE sidebar_modules ADD COLUMN IF NOT EXISTS icon VARCHAR(100);
ALTER TABLE sidebar_modules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE sidebar_modules ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Seed root/parent sidebar items
INSERT INTO sidebar_modules (name, display_name, icon, route, sort_order) VALUES
  ('dashboard',        'Dashboard',         'Home',       '/dashboard',    10),
  ('recruitment',      'Recruitment',       'Users',      NULL,            20),
  ('job_management',   'Job Management',    'Briefcase',  NULL,            30),
  ('client_mgmt',      'Client Management', 'Building',   NULL,            40),
  ('hiring_process',   'Hiring Process',    'UserCheck',  NULL,            50),
  ('activities',       'Activities',        'Calendar',   NULL,            60),
  ('reports',          'Reports & Analytics','BarChart',  NULL,            70),
  ('user_management',  'User Management',   'Shield',     NULL,            80),
  ('settings',         'Settings',          'Settings',   NULL,            90),
  ('ai_tools',         'AI Tools',          'Zap',        NULL,           100),
  ('administration',   'Administration',    'Lock',       NULL,           110)
ON CONFLICT (name) DO NOTHING;

-- Seed child sidebar items (Recruitment)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'candidates',     'Candidates',     id, 'User',       '/candidates',          10 FROM sidebar_modules WHERE name='recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'talent_pool',    'Talent Pool',    id, 'Database',   '/talent-pool',         20 FROM sidebar_modules WHERE name='recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'upload_resume',  'Upload Resume',  id, 'Upload',     '/upload',              30 FROM sidebar_modules WHERE name='recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'resume_parser',  'Resume Parser',  id, 'FileText',   '/resume-parser',       40 FROM sidebar_modules WHERE name='recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'boolean_search', 'Boolean Search', id, 'Search',     '/boolean-search',      50 FROM sidebar_modules WHERE name='recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'xray_search',    'X-Ray Search',   id, 'Target',     '/xray-search',         60 FROM sidebar_modules WHERE name='recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'duplicates',     'Duplicate Candidates', id, 'Copy', '/duplicates',          70 FROM sidebar_modules WHERE name='recruitment'
ON CONFLICT (name) DO NOTHING;

-- Child sidebar items (Job Management)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'jobs',           'Jobs',           id, 'Briefcase',  '/jobs',                10 FROM sidebar_modules WHERE name='job_management'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'requirements',   'Requirements',   id, 'List',       '/requirements',        20 FROM sidebar_modules WHERE name='job_management'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'ai_matching',    'AI Matching',    id, 'Zap',        '/matching',            30 FROM sidebar_modules WHERE name='job_management'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'jd_matching',    'JD Matching',    id, 'FileSearch', '/jd-matching',         40 FROM sidebar_modules WHERE name='job_management'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'pipeline',       'Pipeline Stages',id, 'GitBranch',  '/pipeline',            50 FROM sidebar_modules WHERE name='job_management'
ON CONFLICT (name) DO NOTHING;

-- Child sidebar items (Client Management)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'clients',        'Clients',        id, 'Building',   '/clients',             10 FROM sidebar_modules WHERE name='client_mgmt'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'companies',      'Companies',      id, 'Globe',      '/companies',           20 FROM sidebar_modules WHERE name='client_mgmt'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'contacts',       'Contacts',       id, 'UserPlus',   '/contacts',            30 FROM sidebar_modules WHERE name='client_mgmt'
ON CONFLICT (name) DO NOTHING;

-- Child sidebar items (Hiring Process)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'submissions',    'Submissions',    id, 'Send',       '/submissions',         10 FROM sidebar_modules WHERE name='hiring_process'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'interviews',     'Interviews',     id, 'Video',      '/interviews',          20 FROM sidebar_modules WHERE name='hiring_process'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'offers',         'Offers',         id, 'FileCheck',  '/offers',              30 FROM sidebar_modules WHERE name='hiring_process'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'placements',     'Placements',     id, 'CheckCircle','/placements',          40 FROM sidebar_modules WHERE name='hiring_process'
ON CONFLICT (name) DO NOTHING;

-- Child sidebar items (Activities)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'calendar',       'Calendar',       id, 'Calendar',   '/calendar',            10 FROM sidebar_modules WHERE name='activities'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'tasks',          'Tasks',          id, 'CheckSquare','/tasks',               20 FROM sidebar_modules WHERE name='activities'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'follow_ups',     'Follow Ups',     id, 'Bell',       '/follow-ups',          30 FROM sidebar_modules WHERE name='activities'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'communications', 'Communications', id, 'MessageSquare','/communications',   40 FROM sidebar_modules WHERE name='activities'
ON CONFLICT (name) DO NOTHING;

-- Child sidebar items (Reports)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'reports_menu',         'Reports',           id, 'FileBarChart', '/reports',                10 FROM sidebar_modules WHERE name='reports'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'analytics_menu',       'Analytics',         id, 'TrendingUp',  '/analytics',              20 FROM sidebar_modules WHERE name='reports'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'recruiter_performance','Recruiter Performance', id, 'Award',   '/reports/recruiter',      30 FROM sidebar_modules WHERE name='reports'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'team_performance',     'Team Performance',  id, 'Users',       '/reports/team',           40 FROM sidebar_modules WHERE name='reports'
ON CONFLICT (name) DO NOTHING;

-- Child sidebar items (User Management)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'users_menu',     'Users',          id, 'Users',      '/users',               10 FROM sidebar_modules WHERE name='user_management'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'roles_menu',     'Roles',          id, 'Shield',     '/settings/permissions',20 FROM sidebar_modules WHERE name='user_management'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'teams_menu',     'Teams',          id, 'Users',      '/teams',               30 FROM sidebar_modules WHERE name='user_management'
ON CONFLICT (name) DO NOTHING;

-- Child sidebar items (Settings)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'profile_settings',   'Profile',          id, 'User',       '/settings/profile',    10 FROM sidebar_modules WHERE name='settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'general_settings',   'General',          id, 'Settings',   '/settings/general',    20 FROM sidebar_modules WHERE name='settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'labeling_settings',  'Labeling',         id, 'Tag',        '/labeling',            30 FROM sidebar_modules WHERE name='settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'email_templates',    'Email Templates',  id, 'Mail',       '/email-templates',     40 FROM sidebar_modules WHERE name='settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'notifications_settings','Notifications', id, 'Bell',       '/settings/notifications',50 FROM sidebar_modules WHERE name='settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'integrations_settings', 'Integrations', id, 'Plug',       '/settings/integrations',60 FROM sidebar_modules WHERE name='settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'system_config_settings','System Config', id, 'Cpu',       '/settings/system',     70 FROM sidebar_modules WHERE name='settings'
ON CONFLICT (name) DO NOTHING;

-- Child sidebar items (AI Tools)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'ai_resume_parser','Resume Parser',  id, 'FileText',   '/resume-parser',       10 FROM sidebar_modules WHERE name='ai_tools'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'ai_matching_tool','AI Matching',    id, 'Zap',        '/matching',            20 FROM sidebar_modules WHERE name='ai_tools'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'jd_analyzer',     'JD Analyzer',   id, 'FileSearch', '/jd-matching',         30 FROM sidebar_modules WHERE name='ai_tools'
ON CONFLICT (name) DO NOTHING;

-- Child sidebar items (Administration)
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'audit_logs_menu',   'Audit Logs',   id, 'FileText',   '/audit-logs',         10 FROM sidebar_modules WHERE name='administration'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'activity_logs_menu','Activity Logs',id, 'Activity',   '/activity',           20 FROM sidebar_modules WHERE name='administration'
ON CONFLICT (name) DO NOTHING;
INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'system_health',     'System Health',id, 'Heart',      '/system-health',      30 FROM sidebar_modules WHERE name='administration'
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 4. ROLE SIDEBAR PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS role_sidebar_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    sidebar_module_id UUID NOT NULL REFERENCES sidebar_modules(id) ON DELETE CASCADE,
    visible BOOLEAN DEFAULT false,
    UNIQUE(role_id, sidebar_module_id)
);
CREATE INDEX IF NOT EXISTS idx_rsp_role ON role_sidebar_permissions(role_id);

-- ============================================================
-- 5. EXTEND ROLES TABLE
-- ============================================================
ALTER TABLE roles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_type VARCHAR(50) DEFAULT 'CUSTOM';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS default_scope VARCHAR(50) DEFAULT 'assigned';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Mark built-in system roles
UPDATE roles SET is_system = true, role_type = 'SYSTEM'
WHERE LOWER(name) IN ('admin', 'super admin', 'recruiter', 'manager');

COMMIT;
