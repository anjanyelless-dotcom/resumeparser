-- Migration 043: Add client_pipeline_history table
-- This table tracks the complete history of pipeline stage changes for clients
-- This enables "new clients acquired this month" and pipeline funnel reports

-- ============================================================
-- 1. Create client_pipeline_history table
-- ============================================================

CREATE TABLE IF NOT EXISTS client_pipeline_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    from_stage VARCHAR(30),
    to_stage VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE client_pipeline_history IS 'Tracks the complete history of pipeline stage changes for clients, enabling "new clients acquired this month" and pipeline funnel reports';

-- Add column comments
COMMENT ON COLUMN client_pipeline_history.id IS 'Unique identifier for the history record';
COMMENT ON COLUMN client_pipeline_history.client_id IS 'Reference to the client whose stage changed';
COMMENT ON COLUMN client_pipeline_history.from_stage IS 'Previous pipeline stage (NULL for initial stage)';
COMMENT ON COLUMN client_pipeline_history.to_stage IS 'New pipeline stage';
COMMENT ON COLUMN client_pipeline_history.changed_by IS 'User who made the stage change';
COMMENT ON COLUMN client_pipeline_history.notes IS 'Optional notes about the stage change';
COMMENT ON COLUMN client_pipeline_history.changed_at IS 'When the stage change occurred';
COMMENT ON COLUMN client_pipeline_history.created_at IS 'Record creation timestamp';

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================

-- Index on client_id for quickly finding all history for a client
CREATE INDEX IF NOT EXISTS idx_client_pipeline_history_client_id ON client_pipeline_history(client_id);

-- Index on changed_by for finding all changes made by a user
CREATE INDEX IF NOT EXISTS idx_client_pipeline_history_changed_by ON client_pipeline_history(changed_by);

-- Index on to_stage for filtering by current stage
CREATE INDEX IF NOT EXISTS idx_client_pipeline_history_to_stage ON client_pipeline_history(to_stage);

-- Index on changed_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_client_pipeline_history_changed_at ON client_pipeline_history(changed_at DESC);

-- Composite index for client + date (common query pattern for timeline views)
CREATE INDEX IF NOT EXISTS idx_client_pipeline_history_client_date ON client_pipeline_history(client_id, changed_at DESC);

-- Composite index for to_stage + changed_at (for funnel reports by time period)
CREATE INDEX IF NOT EXISTS idx_client_pipeline_history_stage_date ON client_pipeline_history(to_stage, changed_at DESC);

-- ============================================================
-- 3. Add CHECK constraint for valid pipeline stages
-- ============================================================

ALTER TABLE client_pipeline_history
ADD CONSTRAINT chk_pipeline_history_stage
CHECK (
    (from_stage IS NULL OR from_stage IN ('prospect', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'))
    AND
    (to_stage IN ('prospect', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'))
);

-- ============================================================
-- 4. Verification
-- ============================================================

DO $$
BEGIN
    -- Check if table was created successfully
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'client_pipeline_history'
    ) THEN
        RAISE NOTICE '✅ client_pipeline_history table created successfully';
    ELSE
        RAISE EXCEPTION '❌ client_pipeline_history table was not created';
    END IF;

    -- Check if indexes were created
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'client_pipeline_history' AND indexname = 'idx_client_pipeline_history_client_id'
    ) THEN
        RAISE NOTICE '✅ idx_client_pipeline_history_client_id index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_client_pipeline_history_client_id index was not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'client_pipeline_history' AND indexname = 'idx_client_pipeline_history_changed_by'
    ) THEN
        RAISE NOTICE '✅ idx_client_pipeline_history_changed_by index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_client_pipeline_history_changed_by index was not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'client_pipeline_history' AND indexname = 'idx_client_pipeline_history_to_stage'
    ) THEN
        RAISE NOTICE '✅ idx_client_pipeline_history_to_stage index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_client_pipeline_history_to_stage index was not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'client_pipeline_history' AND indexname = 'idx_client_pipeline_history_changed_at'
    ) THEN
        RAISE NOTICE '✅ idx_client_pipeline_history_changed_at index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_client_pipeline_history_changed_at index was not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'client_pipeline_history' AND indexname = 'idx_client_pipeline_history_client_date'
    ) THEN
        RAISE NOTICE '✅ idx_client_pipeline_history_client_date index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_client_pipeline_history_client_date index was not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'client_pipeline_history' AND indexname = 'idx_client_pipeline_history_stage_date'
    ) THEN
        RAISE NOTICE '✅ idx_client_pipeline_history_stage_date index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_client_pipeline_history_stage_date index was not created';
    END IF;

    -- Check if CHECK constraint was added
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_pipeline_history_stage'
    ) THEN
        RAISE NOTICE '✅ chk_pipeline_history_stage constraint created successfully';
    ELSE
        RAISE EXCEPTION '❌ chk_pipeline_history_stage constraint was not created';
    END IF;
END $$;

-- ============================================================
-- Migration complete
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🎯 Migration 043_add_client_pipeline_history.sql completed successfully';
END $$;