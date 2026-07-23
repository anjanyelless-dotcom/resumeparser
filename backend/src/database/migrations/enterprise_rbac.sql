-- ============================================================
-- ENTERPRISE RBAC MIGRATION SCRIPT
-- ============================================================

-- 1. Alter existing roles table
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS role_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS default_scope VARCHAR(50) DEFAULT 'assigned',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Create scopes table (if not exists) and ensure description exists
CREATE TABLE IF NOT EXISTS scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scopes ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE scopes ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Alter existing role_permissions table
ALTER TABLE role_permissions 
ADD COLUMN IF NOT EXISTS allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scope_id UUID REFERENCES scopes(id) ON DELETE SET NULL;

-- 4. Create actions table
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create or alter modules table
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    route VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS route VARCHAR(255);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- 6. Create or alter sidebar_modules table (Decoupled Navigation)
CREATE TABLE IF NOT EXISTS sidebar_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    group_name VARCHAR(100),
    route VARCHAR(255),
    icon_id VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sidebar_modules ADD COLUMN IF NOT EXISTS group_name VARCHAR(100);
ALTER TABLE sidebar_modules ADD COLUMN IF NOT EXISTS icon_id VARCHAR(100);
ALTER TABLE sidebar_modules ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE sidebar_modules ADD COLUMN IF NOT EXISTS route VARCHAR(255);
ALTER TABLE sidebar_modules ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES sidebar_modules(id) ON DELETE CASCADE;

-- 7. Create role_sidebar_permissions
CREATE TABLE IF NOT EXISTS role_sidebar_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    sidebar_module_id UUID NOT NULL REFERENCES sidebar_modules (id) ON DELETE CASCADE,
    visible BOOLEAN DEFAULT true,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, sidebar_module_id)
);
