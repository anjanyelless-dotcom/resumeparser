-- ============================================================
-- FIX ENUM TYPES AND CONSTRAINTS
-- Migration 998: Fix Enum Types and Missing Constraints
-- ============================================================

-- ============================================================
-- 1. CREATE MISSING ENUM TYPES
-- ============================================================

DO $$ BEGIN
    CREATE TYPE candidate_status AS ENUM (
        'pending', 'processing', 'success', 'failed', 'deleted'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE parsing_job_status AS ENUM (
        'pending', 'processing', 'completed', 'success', 'failed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE proficiency_level AS ENUM (
        'beginner', 'intermediate', 'advanced', 'expert'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM (
        'pending', 'reviewed', 'approved', 'rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. FIX candidates TABLE ENUM COLUMNS
-- ============================================================

-- Ensure status column uses candidate_status enum
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'status') THEN
        ALTER TABLE candidates ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE candidates ALTER COLUMN status TYPE candidate_status USING status::candidate_status;
        ALTER TABLE candidates ALTER COLUMN status SET DEFAULT 'pending'::candidate_status;
    END IF;
END $$;

-- Ensure review_status column uses review_status enum
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'review_status') THEN
        ALTER TABLE candidates ALTER COLUMN review_status DROP DEFAULT;
        ALTER TABLE candidates ALTER COLUMN review_status TYPE review_status USING review_status::review_status;
        ALTER TABLE candidates ALTER COLUMN review_status SET DEFAULT 'pending'::review_status;
    END IF;
END $$;

-- ============================================================
-- 3. FIX parsing_jobs TABLE ENUM COLUMN
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'status') THEN
        ALTER TABLE parsing_jobs ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE parsing_jobs ALTER COLUMN status TYPE parsing_job_status USING status::parsing_job_status;
        ALTER TABLE parsing_jobs ALTER COLUMN status SET DEFAULT 'pending'::parsing_job_status;
    END IF;
END $$;

-- ============================================================
-- 4. ADD MISSING CONSTRAINTS
-- ============================================================

-- Add check constraints for candidates table
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_file_type_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_file_type_check 
CHECK (file_type IN ('pdf', 'docx', 'txt', 'image'));

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'expected_salary_min') THEN
        ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_expected_salary_check;
        ALTER TABLE candidates ADD CONSTRAINT candidates_expected_salary_check 
        CHECK (expected_salary_min >= 0 AND expected_salary_max >= 0 AND 
               (expected_salary_max IS NULL OR expected_salary_min IS NULL OR expected_salary_max >= expected_salary_min));
    END IF;
END $$;

-- Add check constraints for match_scores table
ALTER TABLE match_scores DROP CONSTRAINT IF EXISTS match_scores_overall_score_check;
ALTER TABLE match_scores ADD CONSTRAINT match_scores_overall_score_check 
CHECK (overall_score >= 0 AND overall_score <= 100);

ALTER TABLE match_scores DROP CONSTRAINT IF EXISTS match_scores_skill_score_check;
ALTER TABLE match_scores ADD CONSTRAINT match_scores_skill_score_check 
CHECK (skill_score >= 0 AND skill_score <= 100);

ALTER TABLE match_scores DROP CONSTRAINT IF EXISTS match_scores_experience_score_check;
ALTER TABLE match_scores ADD CONSTRAINT match_scores_experience_score_check 
CHECK (experience_score >= 0 AND experience_score <= 100);

ALTER TABLE match_scores DROP CONSTRAINT IF EXISTS match_scores_education_score_check;
ALTER TABLE match_scores ADD CONSTRAINT match_scores_education_score_check 
CHECK (education_score >= 0 AND education_score <= 100);

-- ============================================================
-- 5. INSERT MIGRATION RECORD
-- ============================================================

INSERT INTO schema_migrations (version) VALUES ('998_fix_enum_types') 
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- ENUM TYPES AND CONSTRAINTS - END
-- ============================================================
