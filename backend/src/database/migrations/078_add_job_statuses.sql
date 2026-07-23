-- Add approval_status and recruitment_status to job_descriptions

ALTER TABLE job_descriptions 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS recruitment_status VARCHAR(50) DEFAULT 'not_started';

-- Migrate existing status to the new columns
UPDATE job_descriptions
SET 
  approval_status = CASE 
    WHEN status IN ('draft', 'pending_approval', 'approved', 'rejected') THEN status 
    WHEN status IN ('active', 'on_hold', 'closed', 'filled') THEN 'approved'
    ELSE 'draft' 
  END,
  recruitment_status = CASE 
    WHEN status = 'active' THEN 'sourcing'
    WHEN status = 'on_hold' THEN 'not_started'
    WHEN status = 'closed' THEN 'closed'
    WHEN status = 'filled' THEN 'filled'
    ELSE 'not_started'
  END;
