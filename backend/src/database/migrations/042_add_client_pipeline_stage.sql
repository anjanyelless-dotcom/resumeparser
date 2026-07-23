-- Migration 042: Add client pipeline stage and business development fields
-- This adds pipeline management fields to the clients table for sales/business development tracking

-- ============================================================
-- 1. Add pipeline_stage column to clients table
-- ============================================================

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(30) DEFAULT 'prospect' 
CHECK (pipeline_stage IN ('prospect', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'));

-- Add column comment
COMMENT ON COLUMN clients.pipeline_stage IS 'Current stage in the sales pipeline (prospect, qualified, proposal_sent, negotiation, won, lost). Note: This is separate from is_archived - lost deals stay visible in pipeline reports, archived records are hidden.';

-- ============================================================
-- 2. Add source column to clients table
-- ============================================================

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Add column comment
COMMENT ON COLUMN clients.source IS 'How the lead came in (referral, cold outreach, inbound, etc.)';

-- ============================================================
-- 3. Add expected_deal_value column to clients table
-- ============================================================

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS expected_deal_value NUMERIC;

-- Add column comment
COMMENT ON COLUMN clients.expected_deal_value IS 'BDM''s estimated deal value, used for open-opportunities report before real placements/revenue exist for this client';

-- ============================================================
-- 4. Add index for pipeline_stage for filtering
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clients_pipeline_stage ON clients(pipeline_stage);

-- ============================================================
-- 5. Add index for source for filtering
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clients_source ON clients(source) WHERE source IS NOT NULL;

-- ============================================================
-- 6. Verification
-- ============================================================

DO $$
BEGIN
    -- Check if pipeline_stage column was added successfully
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'pipeline_stage'
    ) THEN
        RAISE NOTICE '✅ pipeline_stage column added to clients table successfully';
    ELSE
        RAISE EXCEPTION '❌ pipeline_stage column was not added';
    END IF;

    -- Check if source column was added successfully
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'source'
    ) THEN
        RAISE NOTICE '✅ source column added to clients table successfully';
    ELSE
        RAISE EXCEPTION '❌ source column was not added';
    END IF;

    -- Check if expected_deal_value column was added successfully
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'expected_deal_value'
    ) THEN
        RAISE NOTICE '✅ expected_deal_value column added to clients table successfully';
    ELSE
        RAISE EXCEPTION '❌ expected_deal_value column was not added';
    END IF;

    -- Check if indexes were created
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'clients' AND indexname = 'idx_clients_pipeline_stage'
    ) THEN
        RAISE NOTICE '✅ idx_clients_pipeline_stage index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_clients_pipeline_stage index was not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'clients' AND indexname = 'idx_clients_source'
    ) THEN
        RAISE NOTICE '✅ idx_clients_source index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_clients_source index was not created';
    END IF;
END $$;

-- ============================================================
-- Migration complete
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🎯 Migration 042_add_client_pipeline_stage.sql completed successfully';
END $$;