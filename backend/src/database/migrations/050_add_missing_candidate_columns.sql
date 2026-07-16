-- Migration 050: Add missing candidate columns required by upload and resume parsing flows
-- Purpose: Ensure the candidates table has all columns referenced by upload.controller.ts

BEGIN;

-- Add columns if they do not exist
ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS resume_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS domain VARCHAR(100),
    ADD COLUMN IF NOT EXISTS domain_confidence NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS licenses JSONB DEFAULT '[]'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_email_hash ON candidates(email_hash);
CREATE INDEX IF NOT EXISTS idx_candidates_created_by_user_id ON candidates(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_consent_given ON candidates(consent_given);

COMMIT;

SELECT 'Migration 050 applied: missing candidate columns added' as status;
