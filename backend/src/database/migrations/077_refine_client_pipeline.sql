-- Migration 077: Refine client pipeline to enterprise standards
-- Adds status column to differentiate pipeline vs active clients
-- Updates pipeline stages

-- 1. Add status column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pipeline' 
CHECK (status IN ('pipeline', 'active', 'inactive'));

COMMENT ON COLUMN clients.status IS 'Differentiates between pipeline prospects (pipeline) and converted clients (active, inactive)';

-- Set existing to 'active' or 'pipeline' depending on what is needed
-- Let's default everything to 'pipeline' for safety if it's null, but default constraint handles that.
-- Since this is an existing database, existing clients might be actual clients.
-- If pipeline_stage IS NULL, maybe they are active clients?
UPDATE clients SET status = 'active' WHERE pipeline_stage IS NULL OR pipeline_stage = '';
UPDATE clients SET status = 'pipeline' WHERE pipeline_stage IS NOT NULL AND status != 'active';

-- 2. Drop existing constraint on pipeline_stage and add new one
DO $$ 
BEGIN
    -- Drop old constraint if it exists (the exact name might be clients_pipeline_stage_check)
    BEGIN
        ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pipeline_stage_check;
    EXCEPTION
        WHEN undefined_object THEN null;
    END;
END $$;

-- Update existing stages to map to new ones before applying constraint
UPDATE clients SET pipeline_stage = 'lead' WHERE pipeline_stage = 'prospect';
UPDATE clients SET pipeline_stage = 'meeting_scheduled' WHERE pipeline_stage = 'qualified';

-- 3. Add new check constraint
ALTER TABLE clients 
ADD CONSTRAINT clients_pipeline_stage_check 
CHECK (pipeline_stage IN ('lead', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost', ''));

-- 4. Add missing fields requested in UI
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

-- Migration complete
DO $$
BEGIN
    RAISE NOTICE '🎯 Migration 077_refine_client_pipeline.sql completed successfully';
END $$;
