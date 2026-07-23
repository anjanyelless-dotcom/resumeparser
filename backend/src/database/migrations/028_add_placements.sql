-- ============================================================
-- MIGRATION 028: Add placements table
-- ============================================================
-- Creates placements table for tracking candidate placements with revenue.
-- Links candidates, jobs, clients, and recruiters with billing information.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. placements table
-- ============================================================

CREATE TABLE IF NOT EXISTS placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    billing_amount NUMERIC(10, 2),
    placed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_placements_candidate_id ON placements(candidate_id);
CREATE INDEX IF NOT EXISTS idx_placements_job_id ON placements(job_id);
CREATE INDEX IF NOT EXISTS idx_placements_client_id ON placements(client_id);
CREATE INDEX IF NOT EXISTS idx_placements_recruiter_id ON placements(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_placements_placed_at ON placements(placed_at);
CREATE INDEX IF NOT EXISTS idx_placements_billing_amount ON placements(billing_amount);

-- ============================================================
-- DONE
-- ============================================================