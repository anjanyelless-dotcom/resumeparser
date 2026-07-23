-- Migration 040: Add client_communications table
-- This table tracks all communications with clients, including calls, emails, and meetings
-- It enables comprehensive client relationship management and follow-up tracking

-- ============================================================
-- 1. Create client_communications table
-- ============================================================

CREATE TABLE IF NOT EXISTS client_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    logged_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    communication_type VARCHAR(20) NOT NULL CHECK (communication_type IN ('call', 'email', 'meeting', 'note', 'other')),
    subject VARCHAR(255),
    notes TEXT,
    follow_up_date DATE,
    tenant_id VARCHAR(255) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE client_communications IS 'Tracks all communications with clients including calls, emails, and meetings for comprehensive client relationship management';

-- Add column comments
COMMENT ON COLUMN client_communications.id IS 'Unique identifier for the communication record';
COMMENT ON COLUMN client_communications.client_id IS 'Reference to the client organization';
COMMENT ON COLUMN client_communications.contact_id IS 'Reference to the specific contact person (nullable - not every log entry is tied to one specific contact)';
COMMENT ON COLUMN client_communications.logged_by IS 'User who logged this communication';
COMMENT ON COLUMN client_communications.communication_type IS 'Type of communication: call, email, meeting, note, or other';
COMMENT ON COLUMN client_communications.subject IS 'Subject line or topic of the communication';
COMMENT ON COLUMN client_communications.notes IS 'Detailed notes about the communication content and outcomes';
COMMENT ON COLUMN client_communications.follow_up_date IS 'Date for scheduled follow-up (nullable)';
COMMENT ON COLUMN client_communications.created_at IS 'When the communication was logged';

-- ============================================================
-- 2. Add indexes for performance
-- ============================================================

-- Index for tenant_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_client_communications_tenant_id ON client_communications(tenant_id);

-- Index for client_id to get all communications for a specific client
CREATE INDEX IF NOT EXISTS idx_client_communications_client_id ON client_communications(client_id);

-- Index for contact_id to get all communications for a specific contact
CREATE INDEX IF NOT EXISTS idx_client_communications_contact_id ON client_communications(contact_id) WHERE contact_id IS NOT NULL;

-- Index for logged_by to get all communications by a specific user
CREATE INDEX IF NOT EXISTS idx_client_communications_logged_by ON client_communications(logged_by);

-- Index for communication_type to filter by type
CREATE INDEX IF NOT EXISTS idx_client_communications_type ON client_communications(communication_type);

-- Index for follow_up_date to track upcoming follow-ups
CREATE INDEX IF NOT EXISTS idx_client_communications_follow_up_date ON client_communications(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Index for created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_client_communications_created_at ON client_communications(created_at DESC);

-- Composite index for client + communication_type + date for common queries
CREATE INDEX IF NOT EXISTS idx_client_communications_client_type_date ON client_communications(client_id, communication_type, created_at DESC);

-- ============================================================
-- 3. Add trigger to update updated_at if needed (future-proofing)
-- ============================================================

-- Note: This table doesn't have an updated_at column currently, but this trigger is ready for future use
CREATE OR REPLACE FUNCTION update_client_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Create views for common queries
-- ============================================================

-- View for recent client communications
CREATE OR REPLACE VIEW recent_client_communications AS
SELECT 
    cc.id,
    cc.client_id,
    cl.company_name,
    cc.contact_id,
    ct.contact_name,
    ct.email as contact_email,
    ct.phone as contact_phone,
    cc.logged_by,
    u.email as logged_by_email,
    cc.communication_type,
    cc.subject,
    cc.notes,
    cc.follow_up_date,
    cc.created_at
FROM client_communications cc
JOIN clients cl ON cc.client_id = cl.id
LEFT JOIN client_contacts ct ON cc.contact_id = ct.id
JOIN users u ON cc.logged_by = u.id
ORDER BY cc.created_at DESC;

-- View for upcoming follow-ups
CREATE OR REPLACE VIEW upcoming_client_followups AS
SELECT 
    cc.id,
    cc.client_id,
    cl.company_name,
    cc.contact_id,
    ct.contact_name,
    ct.email as contact_email,
    ct.phone as contact_phone,
    cc.logged_by,
    u.email as logged_by_email,
    cc.communication_type,
    cc.subject,
    cc.notes,
    cc.follow_up_date,
    cc.created_at
FROM client_communications cc
JOIN clients cl ON cc.client_id = cl.id
LEFT JOIN client_contacts ct ON cc.contact_id = ct.id
JOIN users u ON cc.logged_by = u.id
WHERE cc.follow_up_date >= CURRENT_DATE
ORDER BY cc.follow_up_date ASC;

-- View for communication statistics by client
CREATE OR REPLACE VIEW client_communication_stats AS
SELECT 
    cc.client_id,
    cl.company_name,
    COUNT(*)::int as total_communications,
    COUNT(*) FILTER (WHERE cc.communication_type = 'call')::int as calls_count,
    COUNT(*) FILTER (WHERE cc.communication_type = 'email')::int as emails_count,
    COUNT(*) FILTER (WHERE cc.communication_type = 'meeting')::int as meetings_count,
    COUNT(*) FILTER (WHERE cc.follow_up_date IS NOT NULL AND cc.follow_up_date >= CURRENT_DATE)::int as pending_followups,
    MAX(cc.created_at) as last_communication_date
FROM client_communications cc
JOIN clients cl ON cc.client_id = cl.id
GROUP BY cc.client_id, cl.company_name
ORDER BY total_communications DESC;

-- ============================================================
-- 5. Verification
-- ============================================================

-- Verify table was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_communications' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ client_communications table created successfully';
    ELSE
        RAISE EXCEPTION '❌ client_communications table creation failed';
    END IF;
END $$;

-- Verify indexes were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'client_communications' AND indexname = 'idx_client_communications_client_id') THEN
        RAISE NOTICE '✅ client_communications indexes created successfully';
    ELSE
        RAISE EXCEPTION '❌ client_communications indexes creation failed';
    END IF;
END $$;

-- Verify views were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'recent_client_communications' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'upcoming_client_followups' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'client_communication_stats' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ client_communications views created successfully';
    ELSE
        RAISE EXCEPTION '❌ client_communications views creation failed';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '🎯 Migration 040_add_client_communications.sql completed successfully';
END $$;