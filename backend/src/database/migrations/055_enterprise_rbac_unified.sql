-- 055_enterprise_rbac_unified.sql
-- Unified Enterprise RBAC Migration Script

BEGIN;

-- 1. Create scopes table
CREATE TABLE IF NOT EXISTS scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, 
    display_name VARCHAR(100) NOT NULL
);

-- Seed scopes
INSERT INTO scopes (name, display_name) VALUES 
('none', 'None'),
('own', 'Own'),
('assigned', 'Assigned'),
('team', 'Team'),
('own_clients', 'Own Clients'),
('limited', 'Limited'),
('organization', 'Organization'),
('all', 'All')
ON CONFLICT (name) DO NOTHING;

-- 2. Create modules table
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    icon VARCHAR(100),
    parent_module_id UUID REFERENCES modules(id),
    sort_order INTEGER DEFAULT 0
);

-- Ensure columns exist in case the table was created by an older migration
ALTER TABLE modules ADD COLUMN IF NOT EXISTS icon VARCHAR(100);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS parent_module_id UUID REFERENCES modules(id);

-- Seed modules based on the application structure
-- Parent Modules
INSERT INTO modules (name, display_name, icon, sort_order) VALUES 
('dashboard', 'Dashboard', 'Home', 10),
('recruitment', 'Recruitment', 'Briefcase', 20),
('clients_group', 'Clients', 'Building', 30),
('hiring', 'Hiring', 'UserPlus', 40),
('activities', 'Activities', 'Calendar', 50),
('reporting', 'Reporting', 'BarChart', 60),
('settings', 'Settings', 'Settings', 70)
ON CONFLICT (name) DO NOTHING;

-- Child Modules (Recruitment)
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'jobs', 'Jobs', id, 10 FROM modules WHERE name = 'recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'requirements', 'Requirements', id, 20 FROM modules WHERE name = 'recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'candidates', 'Candidates', id, 30 FROM modules WHERE name = 'recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'talent_pool', 'Talent Pool', id, 40 FROM modules WHERE name = 'recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'upload_resume', 'Upload Resume', id, 50 FROM modules WHERE name = 'recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'resume_parser', 'Resume Parser', id, 60 FROM modules WHERE name = 'recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'ai_matching', 'AI Matching', id, 70 FROM modules WHERE name = 'recruitment'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'jd_matching', 'JD Matching', id, 80 FROM modules WHERE name = 'recruitment'
ON CONFLICT (name) DO NOTHING;

-- Child Modules (Clients Group)
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'clients', 'Clients', id, 10 FROM modules WHERE name = 'clients_group'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'companies', 'Companies', id, 20 FROM modules WHERE name = 'clients_group'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'contacts', 'Contacts', id, 30 FROM modules WHERE name = 'clients_group'
ON CONFLICT (name) DO NOTHING;

-- Child Modules (Hiring)
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'submissions', 'Submissions', id, 10 FROM modules WHERE name = 'hiring'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'interviews', 'Interviews', id, 20 FROM modules WHERE name = 'hiring'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'offers', 'Offers', id, 30 FROM modules WHERE name = 'hiring'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'placements', 'Placements', id, 40 FROM modules WHERE name = 'hiring'
ON CONFLICT (name) DO NOTHING;

-- Child Modules (Activities)
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'calendar', 'Calendar', id, 10 FROM modules WHERE name = 'activities'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'tasks', 'Tasks', id, 20 FROM modules WHERE name = 'activities'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'notifications', 'Notifications', id, 30 FROM modules WHERE name = 'activities'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'communications', 'Communications', id, 40 FROM modules WHERE name = 'activities'
ON CONFLICT (name) DO NOTHING;

-- Child Modules (Reporting)
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'reports', 'Reports', id, 10 FROM modules WHERE name = 'reporting'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'analytics', 'Analytics', id, 20 FROM modules WHERE name = 'reporting'
ON CONFLICT (name) DO NOTHING;

-- Child Modules (Settings)
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'profile', 'Profile', id, 10 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'general', 'General', id, 20 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'users', 'Users', id, 30 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'roles_permissions', 'Roles & Permissions', id, 40 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'labeling', 'Labeling', id, 50 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'pipeline_stages', 'Pipeline Stages', id, 60 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'email_templates', 'Email Templates', id, 70 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'audit_logs', 'Audit Logs', id, 80 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'duplicates', 'Duplicates', id, 90 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;
INSERT INTO modules (name, display_name, parent_module_id, sort_order) 
SELECT 'integrations', 'Integrations', id, 100 FROM modules WHERE name = 'settings'
ON CONFLICT (name) DO NOTHING;

-- 3. Legacy Migration for Existing Tables
-- We rename existing tables to prevent conflicts if we're altering the schema drastically
ALTER TABLE IF EXISTS role_permissions RENAME TO role_permissions_legacy;
ALTER TABLE IF EXISTS permissions RENAME TO permissions_legacy;

-- 4. Create new role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    allowed BOOLEAN DEFAULT false,
    scope_id UUID REFERENCES scopes(id),
    sidebar_visible BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    UNIQUE(role_id, module_id, action)
);

CREATE INDEX IF NOT EXISTS idx_rp_role_module ON role_permissions(role_id, module_id);
CREATE INDEX IF NOT EXISTS idx_rp_lookup ON role_permissions(role_id, module_id, action) WHERE allowed = true;

-- 5. Seed Roles
INSERT INTO roles (name, description) VALUES 
('Admin', 'Administrator'),
('Manager', 'Manager'),
('Recruiter', 'Recruiter'),
('BDM', 'Business Development Manager'),
('Candidate', 'Candidate')
ON CONFLICT (name) DO NOTHING;

-- 6. Add updated fields to roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

COMMIT;
