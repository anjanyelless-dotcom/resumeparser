-- ============================================================
-- MIGRATION 026c: Complete client_contacts table creation
-- ============================================================
-- Creates the client_contacts table that failed to create due to syntax error
-- Includes proper constraints and indexes.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Create client_contacts table
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_contacts') THEN
        CREATE TABLE client_contacts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            position VARCHAR(100),
            is_primary BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
        CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(email);
        CREATE INDEX IF NOT EXISTS idx_client_contacts_phone ON client_contacts(phone);
        CREATE INDEX IF NOT EXISTS idx_client_contacts_is_primary ON client_contacts(is_primary);
        CREATE INDEX IF NOT EXISTS idx_client_contacts_created_at ON client_contacts(created_at);
        
        -- Add unique constraint to ensure only one primary contact per client
        ALTER TABLE client_contacts
        ADD CONSTRAINT client_contacts_one_primary_per_client 
        UNIQUE (client_id, is_primary) 
        DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- ============================================================
-- DONE
-- ============================================================