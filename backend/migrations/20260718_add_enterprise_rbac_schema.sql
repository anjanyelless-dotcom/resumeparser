-- Add modules, actions, and scopes tables for Enterprise RBAC
-- Ensure these apply safely via IF NOT EXISTS

CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    icon VARCHAR(255),
    path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);

CREATE TABLE IF NOT EXISTS public.actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);

CREATE TABLE IF NOT EXISTS public.scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);

-- Note: In the local database, role_permissions has been altered to use module_id, action, scope_id instead of permission_id.
-- If role_permissions hasn't been altered in production yet, this migration handles it safely.

ALTER TABLE public.role_permissions
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id),
ADD COLUMN IF NOT EXISTS action UUID REFERENCES public.actions(id),
ADD COLUMN IF NOT EXISTS scope_id UUID REFERENCES public.scopes(id),
ADD COLUMN IF NOT EXISTS allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- We cannot blindly drop permission_id if data needs migrating, but we can make it nullable if it wasn't already.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'role_permissions' 
          AND column_name = 'permission_id'
    ) THEN
        ALTER TABLE public.role_permissions ALTER COLUMN permission_id DROP NOT NULL;
    END IF;
END $$;
