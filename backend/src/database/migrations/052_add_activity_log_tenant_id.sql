-- Migration 052: Add tenant_id column to activity_log table

BEGIN;

ALTER TABLE activity_log
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS details JSONB;

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON activity_log(tenant_id);

COMMIT;

SELECT 'Migration 052 applied: tenant_id added to activity_log' as status;
