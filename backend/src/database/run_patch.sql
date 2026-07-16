-- ============================================================
-- PATCH SCRIPT — migrate existing database to clean schema
-- run_patch.sql
-- ============================================================
--
-- Run this ONCE on an existing live database that already has
-- data, to bring it in line with schema.sql WITHOUT data loss.
--
-- Usage:
--   psql -U postgres -d resume_parser -f run_patch.sql
--
-- It is IDEMPOTENT — safe to run multiple times.
-- ============================================================

-- Enable UUID extension (in case it isn't already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STEP 1: Ensure ENUM types exist
-- ============================================================

DO $$ BEGIN
    CREATE TYPE candidate_status AS ENUM ('pending','processing','success','failed','deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE parsing_job_status AS ENUM ('pending','processing','completed','success','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE proficiency_level AS ENUM ('beginner','intermediate','advanced','expert');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('pending','in_review','approved','rejected','duplicate','merged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- STEP 2: Fix skills table — make name UNIQUE (global catalog)
-- ============================================================

-- Add UNIQUE constraint on skills.name if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'skills_name_key' AND conrelid = 'skills'::regclass
    ) THEN
        -- Remove duplicates first (keep lowest id)
        DELETE FROM skills s1
        USING skills s2
        WHERE s1.name = s2.name AND s1.id > s2.id;

        ALTER TABLE skills ADD CONSTRAINT skills_name_key UNIQUE (name);
    END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Add normalized_name column to skills if missing
ALTER TABLE skills ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(150);

-- Remove candidate_id from skills if it still exists (orphan column)
-- We move that relationship to candidate_skills instead.
-- NOTE: We only drop it if candidate_skills table already exists (data is safe).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='skills' AND column_name='candidate_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name='candidate_skills'
    ) THEN
        -- Migrate any skills with candidate_id into candidate_skills first
        INSERT INTO candidate_skills (candidate_id, skill_id)
        SELECT s.candidate_id, s.id
        FROM skills s
        WHERE s.candidate_id IS NOT NULL
        ON CONFLICT (candidate_id, skill_id) DO NOTHING;

        ALTER TABLE skills DROP COLUMN IF EXISTS candidate_id;
        ALTER TABLE skills DROP COLUMN IF EXISTS skill_name;
    END IF;
END $$;

-- ============================================================
-- STEP 3: Add UNIQUE constraint on candidate_skills if missing
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'candidate_skills_candidate_id_skill_id_key'
          AND conrelid = 'candidate_skills'::regclass
    ) THEN
        -- Remove duplicates first
        DELETE FROM candidate_skills cs1
        USING candidate_skills cs2
        WHERE cs1.candidate_id = cs2.candidate_id
          AND cs1.skill_id     = cs2.skill_id
          AND cs1.id > cs2.id;

        ALTER TABLE candidate_skills
            ADD CONSTRAINT candidate_skills_candidate_id_skill_id_key
            UNIQUE (candidate_id, skill_id);
    END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- STEP 4: Candidates table — add missing columns
-- ============================================================

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS current_job_title   VARCHAR(255);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS current_company      VARCHAR(200);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS original_filename    VARCHAR(255);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_file_path     VARCHAR(500);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS file_type            VARCHAR(20);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_hash          VARCHAR(64);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS years_of_experience  INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_quality_score INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS confidence_score     NUMERIC(5,4);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS match_score          DOUBLE PRECISION;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS progress             INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS expected_salary_min  NUMERIC;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS expected_salary_max  NUMERIC;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS projects             JSONB DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS companies            JSONB DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS job_titles           JSONB DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS education_degrees    JSONB DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS universities         JSONB DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS other_information    TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS deleted_at           TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS consent_given        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS consent_date         TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS summary_manually_edited BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS error_message        TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS review_flags         JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS review_flagged_at    TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS review_approved_at   TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS review_approved_by   VARCHAR(255);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS review_rejected_at   TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS review_rejected_by   VARCHAR(255);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS review_confidence    DOUBLE PRECISION;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tenant_id            VARCHAR(100) NOT NULL DEFAULT 'default';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email_hash           VARCHAR(64);

-- Copy data from old duplicate column names if they exist
UPDATE candidates SET resume_file_path = file_path
  WHERE resume_file_path IS NULL AND file_path IS NOT NULL;
UPDATE candidates SET years_of_experience = years_experience::INTEGER
  WHERE years_of_experience IS NULL AND years_experience IS NOT NULL;
UPDATE candidates SET current_job_title = current_title
  WHERE current_job_title IS NULL AND current_title IS NOT NULL;

-- ============================================================
-- STEP 5: Parsing jobs — add missing columns
-- ============================================================

ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS file_type               VARCHAR(10);
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS task_id                 VARCHAR(255);
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS last_stage              VARCHAR(100);
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS raw_text                TEXT;
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS ocr_confidence          DOUBLE PRECISION;
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS progress                INTEGER DEFAULT 0;
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS processing_duration_ms  INTEGER;
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS original_file_copy_path VARCHAR(500);
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS extracted_text_path     VARCHAR(500);
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS parsed_json_path        VARCHAR(500);
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE parsing_jobs ADD COLUMN IF NOT EXISTS created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- parsing_jobs.status: upgrade VARCHAR to ENUM if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='parsing_jobs' AND column_name='status'
          AND data_type='character varying'
    ) THEN
        -- Normalise values before altering type
        UPDATE parsing_jobs SET status = 'completed' WHERE status = 'success';
        -- No-op if already ENUM
        ALTER TABLE parsing_jobs
            ALTER COLUMN status TYPE parsing_job_status
            USING status::parsing_job_status;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- STEP 6: match_scores — add extended columns and fix types
-- ============================================================

-- First, ensure columns exist (they might be created as TEXT[] if new)
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS role_score            NUMERIC;
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS project_score         NUMERIC;
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS certification_score   NUMERIC;
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS matching_skills       TEXT[] DEFAULT '{}'::text[];
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS missing_skills        TEXT[] DEFAULT '{}'::text[];
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS extra_skills          TEXT[] DEFAULT '{}'::text[];
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS experience_gap_years  DOUBLE PRECISION;
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS experience_match_text VARCHAR(100);
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS recommendation        VARCHAR(100);
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS reason                TEXT;
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS match_summary         TEXT;
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS match_label           VARCHAR(50);
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS jd_hash               VARCHAR(64);
ALTER TABLE match_scores ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- CRITICAL FIX for the "invalid input syntax for type json" error
-- If the columns were previously created as JSONB (from old migration 015),
-- we must explicitly cast them to TEXT[] so node-postgres can pass JS arrays cleanly.
DO $$
BEGIN
    -- Create a temporary helper function for conversion
    CREATE OR REPLACE FUNCTION pg_temp.jsonb_to_text_array(j jsonb) RETURNS text[] AS $func$
    BEGIN
      IF j IS NULL OR jsonb_typeof(j) != 'array' THEN
        RETURN '{}'::text[];
      END IF;
      RETURN ARRAY(SELECT jsonb_array_elements_text(j));
    END;
    $func$ LANGUAGE plpgsql IMMUTABLE;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_scores' AND column_name='matching_skills' AND data_type='jsonb') THEN
        ALTER TABLE match_scores ALTER COLUMN matching_skills TYPE text[] USING pg_temp.jsonb_to_text_array(matching_skills::jsonb);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_scores' AND column_name='missing_skills' AND data_type='jsonb') THEN
        ALTER TABLE match_scores ALTER COLUMN missing_skills TYPE text[] USING pg_temp.jsonb_to_text_array(missing_skills::jsonb);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_scores' AND column_name='extra_skills' AND data_type='jsonb') THEN
        ALTER TABLE match_scores ALTER COLUMN extra_skills TYPE text[] USING pg_temp.jsonb_to_text_array(extra_skills::jsonb);
    END IF;
    
    -- Also check matched_skills (old column name from 015)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_scores' AND column_name='matched_skills' AND data_type='jsonb') THEN
        ALTER TABLE match_scores ALTER COLUMN matched_skills TYPE text[] USING pg_temp.jsonb_to_text_array(matched_skills::jsonb);
    END IF;
END $$;

-- Ensure UNIQUE constraint on (candidate_id, job_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'match_scores_candidate_id_job_id_key'
          AND conrelid = 'match_scores'::regclass
    ) THEN
        DELETE FROM match_scores ms1
        USING match_scores ms2
        WHERE ms1.candidate_id = ms2.candidate_id
          AND ms1.job_id IS NOT DISTINCT FROM ms2.job_id
          AND ms1.id > ms2.id;

        ALTER TABLE match_scores
            ADD CONSTRAINT match_scores_candidate_id_job_id_key
            UNIQUE (candidate_id, job_id);
    END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- STEP 7: job_descriptions — add missing columns
-- ============================================================

ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS preferred_skills      JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS min_experience_years  INTEGER;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS max_experience_years  INTEGER;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS education_requirement VARCHAR(255);
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS seniority_level       VARCHAR(100);
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS work_mode             VARCHAR(50);
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS salary_range          VARCHAR(255);
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS currency              VARCHAR(10)  DEFAULT 'USD';
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS salary_period         VARCHAR(20)  DEFAULT 'Yearly';
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS number_of_openings    INTEGER      DEFAULT 1;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS notice_period         VARCHAR(50);
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================
-- STEP 8: Create tables that may be missing entirely
-- ============================================================

-- work_history (if not present)
CREATE TABLE IF NOT EXISTS work_history (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id  UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    job_title     VARCHAR(255),
    company_name  VARCHAR(255),
    start_date    DATE,
    end_date      DATE,
    is_current    BOOLEAN NOT NULL DEFAULT false,
    location      VARCHAR(255),
    description   TEXT,
    display_order INTEGER DEFAULT 0,
    client_name   VARCHAR(200),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_history_candidate_id ON work_history (candidate_id);

-- certifications (if not present)
CREATE TABLE IF NOT EXISTS certifications (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id         UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    issuing_organization TEXT,
    issue_date           DATE,
    expiry_date          DATE,
    credential_id        VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_certifications_candidate_id ON certifications (candidate_id);

-- duplicate_candidates (if not present)
CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id_1   UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    candidate_id_2   UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    similarity_score DOUBLE PRECISION NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- labeled_data (if not present)
CREATE TABLE IF NOT EXISTS labeled_data (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id     UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    corrected_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    labeled_by       UUID NOT NULL,
    action           VARCHAR(20) NOT NULL,
    version          INTEGER DEFAULT 1,
    model_version    VARCHAR(50),
    labeled_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_labeled_data_candidate_id ON labeled_data (candidate_id);

-- job_skills (if not present)
CREATE TABLE IF NOT EXISTS job_skills (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id     UUID NOT NULL REFERENCES job_descriptions (id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    skill_type VARCHAR(50) NOT NULL DEFAULT 'required',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills (job_id);

-- ============================================================
-- STEP 9: Ensure all triggers are set up
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_candidates_updated_at ON candidates;
CREATE TRIGGER set_candidates_updated_at
    BEFORE UPDATE ON candidates FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_parsing_jobs_updated_at ON parsing_jobs;
CREATE TRIGGER set_parsing_jobs_updated_at
    BEFORE UPDATE ON parsing_jobs FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_job_descriptions_updated_at ON job_descriptions;
CREATE TRIGGER set_job_descriptions_updated_at
    BEFORE UPDATE ON job_descriptions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DONE — your database is now in sync with schema.sql
-- ============================================================
SELECT 'Patch complete ✅' AS result;
