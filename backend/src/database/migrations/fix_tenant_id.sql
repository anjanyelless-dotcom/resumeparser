-- Fix existing candidates without tenant_id
UPDATE candidates 
SET tenant_id = 'default' 
WHERE tenant_id IS NULL;

-- Ensure all future candidates have a default tenant_id
ALTER TABLE candidates 
ALTER COLUMN tenant_id SET DEFAULT 'default';
