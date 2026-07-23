-- ============================================================
-- RESUME PARSER - CLEAN MASTER SCHEMA
-- schema.sql  (replaces setup.sql + all 021 migration files)
-- ============================================================
--
-- This file is the SINGLE SOURCE OF TRUTH for the database.
-- It is fully IDEMPOTENT — safe to run multiple times.
--
-- Usage (psql):
--   psql -U postgres -d resume_parser -f schema.sql
--
-- Changes vs old schema:
--   REMOVED: work_experience   (duplicate of work_history — code uses work_history)
--   REMOVED: jobs              (duplicate of job_descriptions — code uses job_descriptions)
--   REMOVED: jd_match_results  (duplicate of match_scores — code uses match_scores)
--   REMOVED: alembic_version   (Python artifact, unused in Node.js)
--   REMOVED: candidates.ssn, years_experience (duplicate), current_job_title (duplicate),
--            resume_path (duplicate of resume_file_path), years_experience_confidence,
--            current_title (duplicate of current_job_title), total_experience_years (dup)
--   CLEANED: skills table — global catalog only (name, category); candidate-skills
--            association is handled by candidate_skills join table.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
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
        'pending', 'in_review', 'approved', 'rejected', 'duplicate', 'merged'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- HELPER: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. users
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    role            VARCHAR(50)  NOT NULL DEFAULT 'recruiter'
                        CHECK (role IN ('admin', 'recruiter', 'viewer')),
    tenant_id       VARCHAR(100) NOT NULL DEFAULT 'default',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================================
-- 2. api_keys
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash   VARCHAR(64)  NOT NULL UNIQUE,
    role       VARCHAR(50)  NOT NULL,
    subject    VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 3. revoked_tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jti        VARCHAR(64)  NOT NULL UNIQUE,
    subject    VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. audit_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       VARCHAR(255),
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id   VARCHAR(255),
    ip_address    VARCHAR(64),
    details       JSONB,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. system_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
    key        VARCHAR(100) PRIMARY KEY,
    value      JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. skill_suggestions
-- ============================================================

CREATE TABLE IF NOT EXISTS skill_suggestions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_name      VARCHAR(200) NOT NULL,
    normalized_name VARCHAR(200) NOT NULL,
    source          VARCHAR(200),
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_suggestions_skill_name      ON skill_suggestions (skill_name);
CREATE INDEX IF NOT EXISTS idx_skill_suggestions_normalized_name ON skill_suggestions (normalized_name);

-- ============================================================
-- 7. correction_patterns
-- ============================================================

CREATE TABLE IF NOT EXISTS correction_patterns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_name      VARCHAR(200) NOT NULL,
    original_value  TEXT NOT NULL,
    corrected_value TEXT NOT NULL,
    count           INTEGER NOT NULL DEFAULT 0,
    last_seen_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correction_patterns_field_name ON correction_patterns (field_name);

-- ============================================================
-- 8. correction_stats
-- ============================================================

CREATE TABLE IF NOT EXISTS correction_stats (
    field_name       VARCHAR(200) PRIMARY KEY,
    correction_count INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 9. candidates
--    Core table. Stores profile fields written by the AI parser.
--    Columns cleaned up — no more duplicate experience/path fields.
-- ============================================================

CREATE TABLE IF NOT EXISTS candidates (
    -- Identity
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                   VARCHAR(255),
    email_hash              VARCHAR(64),
    full_name               VARCHAR(150),
    phone                   VARCHAR(50),
    location                VARCHAR(150),
    linkedin_url            VARCHAR(500),
    github_url              VARCHAR(500),
    summary                 TEXT,

    -- Resume file (single source of truth)
    resume_file_path        VARCHAR(500),    -- path to the uploaded resume file
    original_filename       VARCHAR(255),    -- original filename as uploaded
    file_type               VARCHAR(20) CHECK (file_type IN ('pdf', 'docx', 'txt', 'image')),
    resume_hash             VARCHAR(64),     -- SHA-256 of file content (dedup)
    raw_resume_text         TEXT,            -- extracted plain text

    -- Experience & quality metrics
    years_of_experience     INTEGER DEFAULT 0,   -- computed integer (used in queries)
    current_job_title       VARCHAR(255),
    current_company         VARCHAR(200),
    resume_quality_score    INTEGER,
    confidence_score        NUMERIC(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    match_score             DOUBLE PRECISION,    -- last computed JD match score (0-1)
    progress                INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- Candidate financials
    expected_salary_min     NUMERIC,
    expected_salary_max     NUMERIC,

    -- Structured data stored as JSONB (array columns for fast listing)
    projects                JSONB DEFAULT '[]'::jsonb,
    companies               JSONB DEFAULT '[]'::jsonb,
    job_titles              JSONB DEFAULT '[]'::jsonb,
    education_degrees       JSONB DEFAULT '[]'::jsonb,
    universities            JSONB DEFAULT '[]'::jsonb,

    -- Status & workflow
    status                  candidate_status NOT NULL DEFAULT 'pending',
    review_status           review_status    NOT NULL DEFAULT 'pending',
    review_assigned_to      VARCHAR(255),
    review_notes            TEXT,
    review_confidence       DOUBLE PRECISION,
    review_flags            JSONB,
    review_flagged_at       TIMESTAMP WITH TIME ZONE,
    review_approved_at      TIMESTAMP WITH TIME ZONE,
    review_approved_by      VARCHAR(255),
    review_rejected_at      TIMESTAMP WITH TIME ZONE,
    review_rejected_by      VARCHAR(255),

    -- Consent & legal
    consent_given           BOOLEAN NOT NULL DEFAULT false,
    consent_date            TIMESTAMP WITH TIME ZONE,
    other_information       TEXT,

    -- Tenant & soft-delete
    tenant_id               VARCHAR(100) NOT NULL DEFAULT 'default',
    deleted_at              TIMESTAMP WITH TIME ZONE,

    -- Misc
    summary_manually_edited BOOLEAN NOT NULL DEFAULT false,
    error_message           TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_email       ON candidates (email);
CREATE INDEX IF NOT EXISTS idx_candidates_full_name   ON candidates (full_name);
CREATE INDEX IF NOT EXISTS idx_candidates_match_score ON candidates (match_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_candidates_resume_hash ON candidates (resume_hash);
CREATE INDEX IF NOT EXISTS idx_candidates_status      ON candidates (status);
CREATE INDEX IF NOT EXISTS idx_candidates_email_hash  ON candidates (email_hash);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at  ON candidates (created_at DESC);

DROP TRIGGER IF EXISTS set_candidates_updated_at ON candidates;
CREATE TRIGGER set_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 10. candidate_achievements
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_achievements (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    year         INTEGER,
    confidence   DOUBLE PRECISION,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_achievements_candidate_id ON candidate_achievements (candidate_id);

-- ============================================================
-- 11. corrections
-- ============================================================

CREATE TABLE IF NOT EXISTS corrections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id    UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    field_name      VARCHAR(200) NOT NULL,
    original_value  TEXT,
    corrected_value TEXT,
    corrected_by    VARCHAR(255),
    corrected_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrections_candidate_id ON corrections (candidate_id);
CREATE INDEX IF NOT EXISTS idx_corrections_field_name   ON corrections (field_name);

-- ============================================================
-- 12. skills  (global skill catalog — no candidate_id here)
--    Candidate ↔ Skill association is via candidate_skills.
-- ============================================================

CREATE TABLE IF NOT EXISTS skills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL UNIQUE,
    normalized_name VARCHAR(150),
    category        VARCHAR(100)  -- 'technical' | 'soft' | 'certification' | 'language' | 'tool'
);

CREATE INDEX IF NOT EXISTS idx_skills_name     ON skills (name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills (category);

-- ============================================================
-- 13. candidate_skills  (join table)
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_skills (
    id                SERIAL PRIMARY KEY,
    candidate_id      UUID            NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    skill_id          UUID            NOT NULL REFERENCES skills (id)     ON DELETE CASCADE,
    proficiency_level proficiency_level,
    years_experience  NUMERIC,
    is_primary        BOOLEAN DEFAULT false,
    mention_count     INTEGER DEFAULT 1,
    UNIQUE (candidate_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate_id ON candidate_skills (candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill_id     ON candidate_skills (skill_id);

-- ============================================================
-- 14. work_history  (the ONLY work experience table)
--    NOTE: work_experience was an old duplicate — removed.
-- ============================================================

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

-- ============================================================
-- 15. education
-- ============================================================

CREATE TABLE IF NOT EXISTS education (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id   UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    institution    VARCHAR(255),
    degree         VARCHAR(255),
    field_of_study VARCHAR(255),
    start_date     DATE,
    end_date       DATE,
    gpa            DOUBLE PRECISION,
    description    TEXT
);

CREATE INDEX IF NOT EXISTS idx_education_candidate_id ON education (candidate_id);

-- ============================================================
-- 16. certifications
-- ============================================================

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

-- ============================================================
-- 17. duplicate_candidates
-- ============================================================

CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id_1   UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    candidate_id_2   UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    similarity_score DOUBLE PRECISION NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'merged', 'ignored')),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_c1 ON duplicate_candidates (candidate_id_1);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_c2 ON duplicate_candidates (candidate_id_2);

-- ============================================================
-- 18. parsing_jobs
-- ============================================================

CREATE TABLE IF NOT EXISTS parsing_jobs (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id            UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    filename                VARCHAR(255) NOT NULL,
    file_path               VARCHAR(500) NOT NULL,
    file_type               VARCHAR(10),
    status                  parsing_job_status NOT NULL DEFAULT 'pending',
    task_id                 VARCHAR(255),
    last_stage              VARCHAR(100),
    raw_text                TEXT,
    parsed_data             JSONB,
    confidence_score        DOUBLE PRECISION,
    ocr_confidence          DOUBLE PRECISION,
    error_message           TEXT,
    progress                INTEGER DEFAULT 0,
    processing_duration_ms  INTEGER,
    original_file_copy_path VARCHAR(500),
    extracted_text_path     VARCHAR(500),
    parsed_json_path        VARCHAR(500),
    started_at              TIMESTAMP WITH TIME ZONE,
    completed_at            TIMESTAMP WITH TIME ZONE,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parsing_jobs_candidate_id ON parsing_jobs (candidate_id);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_status       ON parsing_jobs (status);

DROP TRIGGER IF EXISTS set_parsing_jobs_updated_at ON parsing_jobs;
CREATE TRIGGER set_parsing_jobs_updated_at
    BEFORE UPDATE ON parsing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 19. job_descriptions  (the ONLY jobs table)
--    NOTE: The old "jobs" table was a duplicate — removed.
-- ============================================================

CREATE TABLE IF NOT EXISTS job_descriptions (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                 VARCHAR(255) NOT NULL,
    department            VARCHAR(255),
    description           TEXT,
    required_skills       JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_skills      JSONB NOT NULL DEFAULT '[]'::jsonb,
    min_experience_years  INTEGER,
    max_experience_years  INTEGER,
    education_level       VARCHAR(100),
    education_requirement VARCHAR(255),
    seniority_level       VARCHAR(100),
    location              VARCHAR(255),
    employment_type       VARCHAR(50),
    work_mode             VARCHAR(50),
    salary_min            INTEGER,
    salary_max            INTEGER,
    salary_range          VARCHAR(255),
    currency              VARCHAR(10)  DEFAULT 'USD',
    salary_period         VARCHAR(20)  DEFAULT 'Yearly',
    number_of_openings    INTEGER      DEFAULT 1,
    notice_period         VARCHAR(50),
    status                VARCHAR(50)  NOT NULL DEFAULT 'active',
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_title      ON job_descriptions (title);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_department ON job_descriptions (department);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_status     ON job_descriptions (status);

DROP TRIGGER IF EXISTS set_job_descriptions_updated_at ON job_descriptions;
CREATE TRIGGER set_job_descriptions_updated_at
    BEFORE UPDATE ON job_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 20. job_skills
-- ============================================================

CREATE TABLE IF NOT EXISTS job_skills (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id     UUID NOT NULL REFERENCES job_descriptions (id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    skill_type VARCHAR(50) NOT NULL DEFAULT 'required'
                   CHECK (skill_type IN ('required', 'preferred')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills (job_id);

-- ============================================================
-- 21. match_scores  (the ONLY matching results table)
--    NOTE: jd_match_results was a duplicate — removed.
-- ============================================================

CREATE TABLE IF NOT EXISTS match_scores (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id         UUID NOT NULL REFERENCES candidates       (id) ON DELETE CASCADE,
    job_id               UUID          REFERENCES job_descriptions (id) ON DELETE SET NULL,
    overall_score        DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
    skill_score          DOUBLE PRECISION NOT NULL DEFAULT 0,
    experience_score     DOUBLE PRECISION NOT NULL DEFAULT 0,
    education_score      DOUBLE PRECISION NOT NULL DEFAULT 0,
    role_score           NUMERIC,
    project_score        NUMERIC,
    certification_score  NUMERIC,
    matching_skills      TEXT[] DEFAULT '{}'::text[],
    missing_skills       TEXT[] DEFAULT '{}'::text[],
    extra_skills         TEXT[] DEFAULT '{}'::text[],
    experience_gap_years DOUBLE PRECISION,
    experience_match_text VARCHAR(100),
    recommendation       VARCHAR(100),
    reason               TEXT,
    match_summary        TEXT,
    match_label          VARCHAR(50),
    jd_hash              VARCHAR(64),
    recruiter_decision   VARCHAR(50) DEFAULT 'Pending' CHECK (recruiter_decision IN ('Pending', 'Shortlisted', 'Rejected', 'Moved To Hiring Process')),
    recruiter_notes      TEXT,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_match_scores_candidate_id  ON match_scores (candidate_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_job_id        ON match_scores (job_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_overall_score ON match_scores (overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_scores_recruiter_decision ON match_scores (recruiter_decision);

-- ============================================================
-- 22. labeled_data  (human review / training data labels)
-- ============================================================

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

-- ============================================================
-- DONE — schema is complete
-- ============================================================
