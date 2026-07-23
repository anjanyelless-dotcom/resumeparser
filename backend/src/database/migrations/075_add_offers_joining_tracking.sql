-- ============================================================
-- Migration 075: Add Offers & Joining tracking columns
-- Adds offer and joining date tracking to submissions table
-- and ensures all required tables exist for the full ATS flow
-- ============================================================

-- 1. Add offer/joining tracking columns to submissions table
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS offer_extended_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_accepted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_rejected_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS joining_date          DATE,
  ADD COLUMN IF NOT EXISTS no_show               BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS offer_amount          NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS offer_notes           TEXT,
  ADD COLUMN IF NOT EXISTS placement_fee         NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS placement_notes       TEXT;

-- 2. Add missing status values to submissions status enum
DO $$
BEGIN
  -- Add offer_extended status if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'submission_status')
    AND enumlabel = 'offer_extended'
  ) THEN
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'offer_extended';
  END IF;

  -- Add offer_accepted status if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'submission_status')
    AND enumlabel = 'offer_accepted'
  ) THEN
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'offer_accepted';
  END IF;

  -- Add offer_rejected status if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'submission_status')
    AND enumlabel = 'offer_rejected'
  ) THEN
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'offer_rejected';
  END IF;

  -- Add no_show status if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'submission_status')
    AND enumlabel = 'no_show'
  ) THEN
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'no_show';
  END IF;

EXCEPTION
  WHEN undefined_object THEN
    -- submission_status is a VARCHAR, handle safely
    NULL;
END;
$$;

-- 3. Ensure job_teamlead_assignments table exists
CREATE TABLE IF NOT EXISTS job_teamlead_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  team_lead_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES users(id),
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, team_lead_id)
);

-- 4. Ensure job_recruiter_assignments table has all needed columns
ALTER TABLE job_recruiter_assignments
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS priority        VARCHAR(20) DEFAULT 'medium';

-- 5. Add index for offer/joining queries
CREATE INDEX IF NOT EXISTS idx_submissions_offer_status 
  ON submissions(status) 
  WHERE status IN ('offer_extended','offer_accepted','offer_rejected','joined','no_show','placed');

CREATE INDEX IF NOT EXISTS idx_submissions_joining_date 
  ON submissions(joining_date) 
  WHERE joining_date IS NOT NULL;

-- 6. Add missing columns to activity_log for offer/joining events
ALTER TABLE activity_log
  ADD COLUMN IF NOT EXISTS entity_type     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS entity_id       UUID,
  ADD COLUMN IF NOT EXISTS action          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS old_value       JSONB,
  ADD COLUMN IF NOT EXISTS new_value       JSONB;

-- 7. Ensure placements table has all required columns
ALTER TABLE placements
  ADD COLUMN IF NOT EXISTS billing_amount    NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS placed_at         TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS joining_date      DATE,
  ADD COLUMN IF NOT EXISTS notes             TEXT;

-- 8. Update requirements (job_descriptions) status check to include all lifecycle values
-- This ensures the backend accepts all status transitions
ALTER TABLE job_descriptions
  ADD COLUMN IF NOT EXISTS approval_comment  TEXT,
  ADD COLUMN IF NOT EXISTS approved_by       UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by       UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMPTZ;

-- Done
SELECT 'Migration 075: Offers & Joining tracking columns added successfully' AS result;
