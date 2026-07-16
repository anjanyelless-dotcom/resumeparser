-- ============================================================
-- JOB RECRUITER ASSIGNMENTS - 029_add_job_recruiter_assignments.sql
-- ============================================================
-- Creates the job_recruiter_assignments table to track which recruiters
-- are assigned to which jobs with priority levels and assignment metadata.
-- This enables many-to-many relationships between jobs and recruiters.
--
-- Usage (psql):
--   \i backend/src/database/migrations/029_add_job_recruiter_assignments.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. job_recruiter_assignments table
-- ============================================================

CREATE TABLE IF NOT EXISTS job_recruiter_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_job_recruiter UNIQUE(job_id, recruiter_id),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- ============================================================
-- 2. Indexes for performance
-- ============================================================

-- Index for finding assignments by job
CREATE INDEX IF NOT EXISTS idx_job_recruiter_assignments_job_id ON job_recruiter_assignments(job_id);

-- Index for finding assignments by recruiter
CREATE INDEX IF NOT EXISTS idx_job_recruiter_assignments_recruiter_id ON job_recruiter_assignments(recruiter_id);

-- Index for finding assignments by assigned_by
CREATE INDEX IF NOT EXISTS idx_job_recruiter_assignments_assigned_by ON job_recruiter_assignments(assigned_by);

-- Index for priority filtering
CREATE INDEX IF NOT EXISTS idx_job_recruiter_assignments_priority ON job_recruiter_assignments(priority);

-- Composite index for recruiter workload queries
CREATE INDEX IF NOT EXISTS idx_job_recruiter_assignments_recruiter_priority ON job_recruiter_assignments(recruiter_id, priority);

-- ============================================================
-- 3. Trigger to update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_job_recruiter_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_job_recruiter_assignments_updated_at ON job_recruiter_assignments;
CREATE TRIGGER set_job_recruiter_assignments_updated_at
    BEFORE UPDATE ON job_recruiter_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_job_recruiter_assignments_updated_at();

-- ============================================================
-- 4. Sample data (optional - for development)
-- ============================================================

-- Insert sample job-recruiter assignments (only if no data exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM job_recruiter_assignments LIMIT 1) THEN
        -- This would require existing jobs and users, so we'll skip sample data
        -- for this migration to avoid foreign key constraint violations
        RAISE NOTICE 'Skipping sample data for job_recruiter_assignments - requires existing jobs and users';
    END IF;
END $$;

-- ============================================================
-- 5. Verification
-- ============================================================

-- Verify table was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_recruiter_assignments' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ job_recruiter_assignments table created successfully';
    ELSE
        RAISE EXCEPTION '❌ job_recruiter_assignments table creation failed';
    END IF;
END $$;

-- Verify indexes were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'job_recruiter_assignments' AND indexname = 'idx_job_recruiter_assignments_job_id') THEN
        RAISE NOTICE '✅ job_recruiter_assignments indexes created successfully';
    ELSE
        RAISE EXCEPTION '❌ job_recruiter_assignments indexes creation failed';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '🎯 Migration 029_add_job_recruiter_assignments.sql completed successfully'; END $$;