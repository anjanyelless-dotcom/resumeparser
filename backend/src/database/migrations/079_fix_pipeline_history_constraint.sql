-- Migration 079: Fix client_pipeline_history constraint
-- This migration updates the chk_pipeline_history_stage constraint to allow the new stages
-- introduced in migration 077, as well as the 'active_client' stage used during conversion.

DO $$ 
BEGIN
    -- Drop old constraint if it exists
    BEGIN
        ALTER TABLE client_pipeline_history DROP CONSTRAINT IF EXISTS chk_pipeline_history_stage;
    EXCEPTION
        WHEN undefined_object THEN null;
    END;
END $$;

-- Update existing history records with old stages to map to new ones
UPDATE client_pipeline_history SET from_stage = 'lead' WHERE from_stage = 'prospect';
UPDATE client_pipeline_history SET from_stage = 'meeting_scheduled' WHERE from_stage = 'qualified';

UPDATE client_pipeline_history SET to_stage = 'lead' WHERE to_stage = 'prospect';
UPDATE client_pipeline_history SET to_stage = 'meeting_scheduled' WHERE to_stage = 'qualified';

-- Add new check constraint
ALTER TABLE client_pipeline_history
ADD CONSTRAINT chk_pipeline_history_stage
CHECK (
    (from_stage IS NULL OR from_stage IN ('lead', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost', 'active_client', ''))
    AND
    (to_stage IN ('lead', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost', 'active_client', ''))
);

DO $$
BEGIN
    RAISE NOTICE '🎯 Migration 079_fix_pipeline_history_constraint.sql completed successfully';
END $$;
