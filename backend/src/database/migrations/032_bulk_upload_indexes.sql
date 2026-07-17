-- Migration: indexes and schema adjustments for bulk resume upload performance
-- Run this against PostgreSQL to speed up duplicate checks and bulk inserts.

-- Index for duplicate checks by email (most common duplicate signal)
CREATE INDEX IF NOT EXISTS idx_candidates_email_status
    ON candidates (email, status)
    WHERE deleted_at IS NULL;

-- Index for duplicate checks by phone
CREATE INDEX IF NOT EXISTS idx_candidates_phone_status
    ON candidates (phone, status)
    WHERE deleted_at IS NULL;

-- Partial index for active/success candidates used in duplicate lookups
CREATE INDEX IF NOT EXISTS idx_candidates_status_success
    ON candidates (status)
    WHERE status = 'success';

-- Index for candidate_id lookups in child tables (most are already present, kept for completeness)
CREATE INDEX IF NOT EXISTS idx_work_history_candidate_id
    ON work_history (candidate_id);

CREATE INDEX IF NOT EXISTS idx_education_candidate_id
    ON education (candidate_id);

CREATE INDEX IF NOT EXISTS idx_certifications_candidate_id
    ON certifications (candidate_id);

CREATE INDEX IF NOT EXISTS idx_parsing_jobs_candidate_id
    ON parsing_jobs (candidate_id);

-- Increase work_mem and shared_buffers if possible (run as superuser, values are examples)
-- ALTER SYSTEM SET shared_buffers = '512MB';
-- ALTER SYSTEM SET work_mem = '32MB';
-- SELECT pg_reload_conf();
