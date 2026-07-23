-- ============================================================
-- MIGRATION 073: Add missing sidebar routes + fix placements schema
-- ============================================================

-- 1. Add missing columns to placements table to support full createPlacement handler
ALTER TABLE placements ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE placements ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE placements ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id);
-- submission_id already exists; make sure candidate_id and submission_id can coexist
-- client_id and job_id are required in 028 schema — keep them

-- 2. Add missing sidebar module entries for new pages
-- These are child items under their respective parent groups

-- Helper: get parent IDs dynamically
DO $$
DECLARE
  hiring_parent_id UUID;
  team_mgmt_parent_id UUID;
  admin_parent_id UUID;
  analytics_parent_id UUID;
  team_lead_parent_id UUID;
BEGIN

  -- Find parent IDs by matching display_name
  SELECT id INTO hiring_parent_id
    FROM sidebar_modules WHERE display_name ILIKE '%Hiring Process%' AND parent_id IS NULL LIMIT 1;

  SELECT id INTO team_mgmt_parent_id
    FROM sidebar_modules WHERE display_name ILIKE '%Team Management%' AND parent_id IS NULL LIMIT 1;

  SELECT id INTO admin_parent_id
    FROM sidebar_modules WHERE display_name ILIKE '%Administration%' AND parent_id IS NULL LIMIT 1;

  SELECT id INTO analytics_parent_id
    FROM sidebar_modules WHERE display_name ILIKE '%Analytics%' AND parent_id IS NULL LIMIT 1;

  SELECT id INTO team_lead_parent_id
    FROM sidebar_modules WHERE display_name ILIKE '%Team Lead%' AND parent_id IS NULL LIMIT 1;

  -- Hiring Process: Placement
  IF hiring_parent_id IS NOT NULL THEN
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'placement', 'Placement', '/placements', 'briefcase', hiring_parent_id, 170)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Team Management: Departments
  IF team_mgmt_parent_id IS NOT NULL THEN
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'departments', 'Departments', '/departments', 'building', team_mgmt_parent_id, 180)
    ON CONFLICT DO NOTHING;

    -- Team Management: Teams
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'teams', 'Teams', '/teams', 'users', team_mgmt_parent_id, 190)
    ON CONFLICT DO NOTHING;

    -- Team Management: Activity Timeline
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'activity-timeline', 'Activity Timeline', '/audit-logs', 'bar-chart', team_mgmt_parent_id, 175)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Administration: Integrations
  IF admin_parent_id IS NOT NULL THEN
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'integrations', 'Integrations', '/integrations', 'zap', admin_parent_id, 185)
    ON CONFLICT DO NOTHING;

    -- Administration: Backup & Restore
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'backup-restore', 'Backup & Restore', '/backup-restore', 'settings', admin_parent_id, 190)
    ON CONFLICT DO NOTHING;

    -- Administration: Activity Logs
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'activity-logs', 'Activity Logs', '/audit-logs', 'bar-chart', admin_parent_id, 183)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Analytics & Reports: Audit Logs (if missing)
  IF analytics_parent_id IS NOT NULL THEN
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'audit-logs-analytics', 'Audit Logs', '/audit-logs', 'bar-chart', analytics_parent_id, 195)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Team Lead Management: Recruiter Performance
  IF team_lead_parent_id IS NOT NULL THEN
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'recruiter-performance', 'Recruiter Performance', '/team-lead/team-kpis', 'bar-chart', team_lead_parent_id, 178)
    ON CONFLICT DO NOTHING;

    -- Team Lead Management: Shortlist Review
    INSERT INTO sidebar_modules (id, name, display_name, route, icon_id, parent_id, sort_order)
    VALUES (gen_random_uuid(), 'shortlist-review', 'Shortlist Review', '/team-lead/review-queue', 'file-text', team_lead_parent_id, 179)
    ON CONFLICT DO NOTHING;
  END IF;

END$$;

-- ============================================================
-- DONE
-- ============================================================
