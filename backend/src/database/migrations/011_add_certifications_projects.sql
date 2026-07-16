-- Migration 011: Add certifications table and projects JSONB column to candidates
-- Fixes the missing certifications table error and adds projects storage

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create certifications table (was missing from schema)
CREATE TABLE IF NOT EXISTS certifications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    issuer       VARCHAR(255),
    issue_date   DATE,
    expiry_date  DATE,
    credential_url TEXT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certifications_candidate_id ON certifications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_certifications_issue_date ON certifications(issue_date DESC);

-- 2. Add projects JSONB column to candidates table (stores array of project objects)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'candidates' AND column_name = 'projects'
    ) THEN
        ALTER TABLE candidates ADD COLUMN projects JSONB DEFAULT '[]';
        RAISE NOTICE 'Added projects column to candidates table';
    END IF;
END $$;

-- 3. Ensure candidate_skills table exists (some installs may be missing it)
CREATE TABLE IF NOT EXISTS candidate_skills (
    candidate_id     UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    skill_id         UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(50) DEFAULT 'intermediate',
    years_experience  DECIMAL(4,1),
    PRIMARY KEY (candidate_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate_id ON candidate_skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill_id ON candidate_skills(skill_id);
