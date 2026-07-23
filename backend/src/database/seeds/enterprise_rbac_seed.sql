-- ============================================================
-- ENTERPRISE RBAC SEED SCRIPT
-- ============================================================

-- 1. Seed Scopes
INSERT INTO scopes (name, display_name, description) VALUES
('assigned', 'Assigned', 'Can only access records explicitly assigned to the user'),
('team', 'Team', 'Can access records assigned to anyone in their team'),
('department', 'Department', 'Can access records for the entire department'),
('organization', 'Organization', 'Can access all records in the organization'),
('all', 'All', 'Super admin scope, bypasses tenant checks')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Actions
INSERT INTO actions (name, display_name, sort_order) VALUES
('view', 'View', 10),
('create', 'Create', 20),
('edit', 'Edit', 30),
('delete', 'Delete', 40),
('export', 'Export', 50),
('import', 'Import', 60),
('upload', 'Upload', 70),
('download', 'Download', 80),
('assign', 'Assign', 90),
('approve', 'Approve', 100),
('reject', 'Reject', 110),
('run', 'Run', 120),
('archive', 'Archive', 130),
('restore', 'Restore', 140)
ON CONFLICT (name) DO NOTHING;

-- 3. Seed Modules
INSERT INTO modules (name, display_name, category, route, sort_order) VALUES
('dashboard', 'Dashboard', 'Reports', '/dashboard', 10),
('candidates', 'Candidates', 'Talent Acquisition', '/candidates', 20),
('upload_resume', 'Upload Resume', 'Talent Acquisition', '/upload', 30),
('jobs', 'Jobs', 'Client Operations', '/jobs', 40),
('requirements', 'Requirements', 'Client Operations', '/requirements', 50),
('submissions', 'Submissions', 'Client Operations', '/submissions', 60),
('matching', 'Matching', 'AI Processing', '/matching', 70),
('jd_matching', 'JD Matching', 'AI Processing', '/jd-matching', 80),
('clients', 'Clients', 'Client Operations', '/clients', 90),
('client_pipeline', 'Client Pipeline', 'Client Operations', '/client-pipeline', 100),
('analytics', 'Analytics', 'Reports', '/analytics', 110),
('boolean_search', 'Boolean Search', 'Talent Acquisition', '/boolean-search', 120),
('interviews', 'Interviews', 'Client Operations', '/interviews', 130),
('users', 'Users', 'System Administration', '/users', 140),
('settings', 'Settings', 'System Administration', '/settings', 150)
ON CONFLICT (name) DO NOTHING;

-- 4. Seed Sidebar Modules
INSERT INTO sidebar_modules (name, display_name, group_name, route, icon_id, sort_order) VALUES
('dashboard', 'Dashboard', 'Reports', '/dashboard', 'dashboard', 10),
('candidates', 'Candidates', 'Talent Acquisition', '/candidates', 'users', 20),
('upload_resume', 'Upload Resume', 'Talent Acquisition', '/upload', 'upload', 30),
('jobs', 'Jobs', 'Client Operations', '/jobs', 'briefcase', 40),
('requirements', 'Requirements', 'Client Operations', '/requirements', 'file-text', 50),
('submissions', 'Submissions', 'Client Operations', '/submissions', 'send', 60),
('matching', 'Matching', 'AI Processing', '/matching', 'zap', 70),
('jd_matching', 'JD Matching', 'AI Processing', '/jd-matching', 'crosshair', 80),
('clients', 'Clients', 'Client Operations', '/clients', 'building', 90),
('client_pipeline', 'Client Pipeline', 'Client Operations', '/client-pipeline', 'git-merge', 100),
('analytics', 'Analytics', 'Reports', '/analytics', 'bar-chart', 110),
('boolean_search', 'Boolean Search', 'Talent Acquisition', '/boolean-search', 'search', 120),
('interviews', 'Interviews', 'Client Operations', '/interviews', 'calendar', 130),
('users', 'Users', 'System Administration', '/users', 'settings-users', 140),
('settings', 'Settings', 'System Administration', '/settings', 'settings', 150)
ON CONFLICT (name) DO NOTHING;

-- Note: The junction tables (role_sidebar_permissions and role_permissions) 
-- will be populated dynamically via the new APIs or via a custom node script 
-- that matches UUIDs, since raw SQL UUID lookups for complex matrixes are brittle.
