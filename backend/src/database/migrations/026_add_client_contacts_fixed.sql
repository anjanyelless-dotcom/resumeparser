-- ============================================================
-- MIGRATION 026b: Fix client_contacts constraint (correction for 026)
-- ============================================================
-- Fixes the syntax error in the EXCLUDE constraint and replaces it
-- with a proper UNIQUE constraint for primary contacts per client.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Drop the problematic constraint if it exists
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'client_contacts_one_primary_per_client'
        AND conrelid = 'client_contacts'::regclass
    ) THEN
        ALTER TABLE client_contacts
        DROP CONSTRAINT client_contacts_one_primary_per_client;
    END IF;
END $$;

-- ============================================================
-- 2. Add proper unique constraint for primary contacts
-- ============================================================

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