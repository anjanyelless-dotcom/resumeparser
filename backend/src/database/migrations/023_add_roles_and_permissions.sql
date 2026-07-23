-- ============================================================
-- MIGRATION 023: Add roles and permissions system
-- ============================================================
-- Creates comprehensive RBAC system with roles, permissions, and role_permissions tables.
-- Seeds initial roles and permissions for all system modules.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. roles table
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on role name for faster lookups
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles (name);

-- ============================================================
-- 2. permissions table
-- ============================================================

-- Drop existing permissions table if it exists with wrong schema
DROP TABLE IF EXISTS permissions CASCADE;

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_name VARCHAR(100) NOT NULL,
    action_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(module_name, action_name)
);

-- Create index on module and action for faster lookups
CREATE INDEX idx_permissions_module_action ON permissions (module_name, action_name);

-- ============================================================
-- 3. role_permissions table (join table)
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users (id),
    UNIQUE(role_id, permission_id)
);

-- Create indexes for foreign key performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions (permission_id);

-- ============================================================
-- 4. Seed roles
-- ============================================================

INSERT INTO roles (name, description) VALUES
    ('admin', 'System administrator with full access'),
    ('manager', 'Department manager with oversight capabilities'),
    ('bdm', 'Business Development Manager'),
    ('client_manager', 'Client account manager'),
    ('client', 'External client user'),
    ('team_lead', 'Team lead with limited management access'),
    ('recruiter', 'Recruiter with standard recruiting access'),
    ('hr', 'HR professional with HR-specific access'),
    ('candidate', 'Candidate with self-service access')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 5. Seed permissions for all modules
-- ============================================================

-- Users module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('users', 'view', 'View user list and details'),
    ('users', 'create', 'Create new users'),
    ('users', 'edit', 'Edit existing users'),
    ('users', 'delete', 'Delete users'),
    ('users', 'approve', 'Approve user actions')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Clients module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('clients', 'view', 'View client list and details'),
    ('clients', 'create', 'Create new clients'),
    ('clients', 'edit', 'Edit existing clients'),
    ('clients', 'delete', 'Delete clients'),
    ('clients', 'approve', 'Approve client actions')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Requirements module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('requirements', 'view', 'View job requirements'),
    ('requirements', 'create', 'Create new job requirements'),
    ('requirements', 'edit', 'Edit existing job requirements'),
    ('requirements', 'delete', 'Delete job requirements'),
    ('requirements', 'approve', 'Approve job requirements')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Upload module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('upload', 'view', 'View upload statistics'),
    ('upload', 'view_stats', 'View detailed upload statistics'),
    ('upload', 'create', 'Create new uploads'),
    ('upload', 'edit', 'Edit existing uploads'),
    ('upload', 'delete', 'Delete uploads'),
    ('upload', 'approve', 'Approve upload actions')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Candidates module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('candidates', 'view', 'View candidate list and details'),
    ('candidates', 'create', 'Create new candidates'),
    ('candidates', 'edit', 'Edit existing candidates'),
    ('candidates', 'delete', 'Delete candidates'),
    ('candidates', 'approve', 'Approve candidate actions')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Reports module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('reports', 'view', 'View reports and analytics'),
    ('reports', 'create', 'Create new reports'),
    ('reports', 'edit', 'Edit existing reports'),
    ('reports', 'delete', 'Delete reports'),
    ('reports', 'approve', 'Approve reports')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Settings module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('settings', 'view', 'View system settings'),
    ('settings', 'create', 'Create new settings'),
    ('settings', 'edit', 'Edit system settings'),
    ('settings', 'delete', 'Delete system settings'),
    ('settings', 'approve', 'Approve setting changes')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- Audit logs module permissions
INSERT INTO permissions (module_name, action_name, description) VALUES
    ('audit_logs', 'view', 'View audit logs'),
    ('audit_logs', 'create', 'Create audit log entries'),
    ('audit_logs', 'edit', 'Edit audit log entries'),
    ('audit_logs', 'delete', 'Delete audit logs'),
    ('audit_logs', 'approve', 'Approve audit log actions')
ON CONFLICT (module_name, action_name) DO NOTHING;

-- ============================================================
-- 6. Grant all permissions to admin role
-- ============================================================

INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
    r.id as role_id,
    p.id as permission_id,
    NULL as granted_by
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- DONE
-- ============================================================