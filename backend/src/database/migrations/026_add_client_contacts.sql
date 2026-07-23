-- ============================================================
-- MIGRATION 026: Add client_contacts table
-- ============================================================
-- Creates client_contacts table for storing multiple contacts per client.
-- Supports primary contact designation and complete contact information.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. client_contacts table
-- ============================================================

CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    contact_name VARCHAR(255),
    designation VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts (client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_is_primary ON client_contacts (is_primary);
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts (email);
CREATE INDEX IF NOT EXISTS idx_client_contacts_phone ON client_contacts (phone);
CREATE INDEX IF NOT EXISTS idx_client_contacts_created_at ON client_contacts (created_at);

-- ============================================================
-- 2. Ensure only one primary contact per client
-- ============================================================

-- Add constraint to ensure only one primary contact per client
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'client_contacts_one_primary_per_client'
        AND conrelid = 'client_contacts'::regclass
    ) THEN
        ALTER TABLE client_contacts
        ADD CONSTRAINT client_contacts_one_primary_per_client
        UNIQUE (client_id, is_primary)
        DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- ============================================================
-- DONE
-- ============================================================