-- ============================================================
-- MIGRATION 025: Add clients table
-- ============================================================
-- Creates clients table for external client management.
-- Includes tenant_id for multi-tenant support matching users/candidates pattern.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. clients table
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    owner_user_id UUID REFERENCES users(id),
    is_archived BOOLEAN DEFAULT false,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients (company_name);
CREATE INDEX IF NOT EXISTS idx_clients_owner_user_id ON clients (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_is_archived ON clients (is_archived);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients (created_at);

-- ============================================================
-- DONE
-- ============================================================