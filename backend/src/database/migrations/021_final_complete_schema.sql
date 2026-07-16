-- ============================================================
-- FINAL COMPLETE SCHEMA - 021_final_complete_schema.sql
-- ============================================================
-- This is an IDEMPOTENT migration. Safe to run multiple times.
-- It creates ALL tables, columns, indexes, triggers, and ENUMs
-- that exist in the production database.
--
-- Run this if you are setting up from scratch OR if you are
-- missing tables/columns after cloning the repository.
--
-- Usage (psql):
--   \i backend/src/database/migrations/021_final_complete_schema.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

DO $$ BEGIN
    CREATE TYPE candidate_status AS ENUM ('pending', 'processing', 'success', 'failed', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE parsing_job_status AS ENUM ('pending', 'processing', 'success', 'failed', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE proficiency_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('pending', 'in_review', 'approved', 'rejected', 'duplicate', 'merged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. HELPER FUNCTION: update_updated_at_column
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. alembic_version
-- ============================================================

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- ============================================================
-- 4. users
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    role            VARCHAR(50) NOT NULL DEFAULT 'recruiter'
                        CHECK (role IN ('admin', 'recruiter', 'viewer')),
    tenant_id       VARCHAR(100) NOT NULL DEFAULT 'default',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================================
-- 5. api_keys
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash    VARCHAR(64) NOT NULL,
    role        VARCHAR(50) NOT NULL,
    subject     VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_api_keys_key_hash ON api_keys (key_hash);

-- ============================================================
-- 6. audit_logs
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
-- 7. revoked_tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jti        VARCHAR(64) NOT NULL,
    subject    VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_revoked_tokens_jti ON revoked_tokens (jti);

-- ============================================================
-- 8. system_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
    key        VARCHAR(100) PRIMARY KEY,
    value      JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 9. skill_suggestions
-- ============================================================

CREATE TABLE IF NOT EXISTS skill_suggestions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_name      VARCHAR(200) NOT NULL,
    normalized_name VARCHAR(200) NOT NULL,
    source          VARCHAR(200),
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_skill_suggestions_skill_name      ON skill_suggestions (skill_name);
CREATE INDEX IF NOT EXISTS ix_skill_suggestions_normalized_name ON skill_suggestions (normalized_name);

-- ============================================================
-- 10. correction_patterns
-- ============================================================

CREATE TABLE IF NOT EXISTS correction_patterns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_name      VARCHAR(200) NOT NULL,
    original_value  TEXT NOT NULL,
    corrected_value TEXT NOT NULL,
    count           INTEGER NOT NULL DEFAULT 0,
    last_seen_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_correction_patterns_field_name ON correction_patterns (field_name);

-- ============================================================
-- 11. correction_stats
-- ============================================================

CREATE TABLE IF NOT EXISTS correction_stats (
    field_name       VARCHAR(200) PRIMARY KEY,
    correction_count INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 12. candidates
-- ============================================================

CREATE TABLE IF NOT EXISTS candidates (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                    VARCHAR(255),
    email_hash               VARCHAR(64),
    full_name                VARCHAR(150),
    phone                    VARCHAR(50),
    ssn                      VARCHAR(50),
    location                 VARCHAR(150),
    linkedin_url             VARCHAR(500),
    github_url               VARCHAR(500),
    summary                  TEXT,
    years_experience         DOUBLE PRECISION,
    years_experience_confidence DOUBLE PRECISION,
    current_title            VARCHAR(200),
    current_company          VARCHAR(200),
    current_job_title        VARCHAR(255),
    consent_given            BOOLEAN NOT NULL DEFAULT false,
    consent_date             TIMESTAMP WITH TIME ZONE,
    tenant_id                VARCHAR(100) NOT NULL DEFAULT 'default',
    review_status            review_status NOT NULL DEFAULT 'pending',
    review_assigned_to       VARCHAR(255),
    review_notes             TEXT,
    review_flagged_at        TIMESTAMP WITH TIME ZONE,
    review_confidence        DOUBLE PRECISION,
    review_flags             JSONB,
    review_approved_at       TIMESTAMP WITH TIME ZONE,
    review_approved_by       VARCHAR(255),
    review_rejected_at       TIMESTAMP WITH TIME ZONE,
    review_rejected_by       VARCHAR(255),
    status                   candidate_status NOT NULL DEFAULT 'pending',
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    summary_manually_edited  BOOLEAN NOT NULL DEFAULT false,
    error_message            TEXT,
    confidence_score         NUMERIC(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    progress                 INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    years_of_experience      INTEGER DEFAULT 0,
    deleted_at               TIMESTAMP WITH TIME ZONE,
    location_city            VARCHAR(255),
    location_country         VARCHAR(255),
    location_state           VARCHAR(255),
    original_filename        VARCHAR(255),
    parsing_confidence       DOUBLE PRECISION,
    resume_file_path         VARCHAR(255),
    resume_quality_score     INTEGER,
    total_experience_years   DOUBLE PRECISION,
    companies                JSONB DEFAULT '[]'::jsonb,
    job_titles               JSONB DEFAULT '[]'::jsonb,
    education_degrees        JSONB DEFAULT '[]'::jsonb,
    universities             JSONB DEFAULT '[]'::jsonb,
    resume_hash              VARCHAR(64),
    match_score              DOUBLE PRECISION,
    projects                 JSONB DEFAULT '[]'::jsonb,
    raw_resume_text          TEXT,
    file_path                TEXT,
    file_type                VARCHAR(20) CHECK (file_type IN ('pdf', 'docx', 'txt', 'image')),
    expected_salary_min      NUMERIC,
    expected_salary_max      NUMERIC,
    other_information        TEXT,
    resume_path              TEXT
);

CREATE INDEX IF NOT EXISTS idx_candidates_email       ON candidates (email);
CREATE INDEX IF NOT EXISTS idx_candidates_full_name   ON candidates (full_name);
CREATE INDEX IF NOT EXISTS idx_candidates_match_score ON candidates (match_score DESC NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_candidates_resume_hash ON candidates (resume_hash);
CREATE INDEX IF NOT EXISTS ix_candidates_created_at   ON candidates (created_at);
CREATE INDEX IF NOT EXISTS ix_candidates_email_hash   ON candidates (email_hash);
CREATE INDEX IF NOT EXISTS ix_candidates_status       ON candidates (status);

DROP TRIGGER IF EXISTS set_candidates_updated_at ON candidates;
CREATE TRIGGER set_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 13. candidate_achievements
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_achievements (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    year         INTEGER,
    confidence   DOUBLE PRECISION,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_candidate_achievements_candidate_id ON candidate_achievements (candidate_id);

-- ============================================================
-- 14. corrections
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

CREATE INDEX IF NOT EXISTS ix_corrections_candidate_id ON corrections (candidate_id);
CREATE INDEX IF NOT EXISTS ix_corrections_field_name   ON corrections (field_name);

-- ============================================================
-- 15. skills (global skill catalog)
-- ============================================================

CREATE TABLE IF NOT EXISTS skills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL,
    category        VARCHAR(100),
    normalized_name VARCHAR(150),
    candidate_id    UUID REFERENCES candidates (id) ON DELETE CASCADE,
    skill_name      VARCHAR(255),
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience NUMERIC,
    confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

CREATE INDEX IF NOT EXISTS idx_skills_candidate_id ON skills (candidate_id);
CREATE INDEX IF NOT EXISTS idx_skills_name         ON skills (name);
CREATE INDEX IF NOT EXISTS idx_skills_category     ON skills (category);

-- ============================================================
-- 16. candidate_skills (join table)
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_skills (
    id                SERIAL PRIMARY KEY,
    candidate_id      UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    skill_id          UUID NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
    proficiency_level proficiency_level,
    years_experience  INTEGER,
    is_primary        BOOLEAN,
    mention_count     INTEGER,
    proficiency       VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate_id ON candidate_skills (candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill_id     ON candidate_skills (skill_id);

-- ============================================================
-- 17. work_experience
-- ============================================================

CREATE TABLE IF NOT EXISTS work_experience (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    job_title    VARCHAR(255),
    company_name VARCHAR(255),
    start_date   DATE,
    end_date     DATE,
    is_current   BOOLEAN DEFAULT false,
    description  TEXT,
    location     VARCHAR(255),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_experience_candidate_id ON work_experience (candidate_id);

-- ============================================================
-- 18. work_history
-- ============================================================

CREATE TABLE IF NOT EXISTS work_history (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id  UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    company_name  VARCHAR(200),
    job_title     VARCHAR(200),
    start_date    DATE,
    end_date      DATE,
    is_current    BOOLEAN NOT NULL DEFAULT false,
    location      VARCHAR(200),
    description   TEXT,
    display_order INTEGER DEFAULT 0,
    client_name   VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_work_history_candidate_id ON work_history (candidate_id);

-- ============================================================
-- 19. education
-- ============================================================

CREATE TABLE IF NOT EXISTS education (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id   UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    institution    VARCHAR(255),
    degree         VARCHAR(200),
    field_of_study VARCHAR(200),
    start_date     DATE,
    end_date       DATE,
    gpa            DOUBLE PRECISION,
    description    TEXT
);

CREATE INDEX IF NOT EXISTS idx_education_candidate_id ON education (candidate_id);

-- ============================================================
-- 20. certifications
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
-- 21. duplicate_candidates
-- ============================================================

CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id_1 UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    candidate_id_2 UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    similarity_score DOUBLE PRECISION NOT NULL,
    status         VARCHAR(20) DEFAULT 'pending',
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 22. parsing_jobs
-- ============================================================

CREATE TABLE IF NOT EXISTS parsing_jobs (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id            UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    filename                VARCHAR(255) NOT NULL,
    file_path               VARCHAR(500) NOT NULL,
    status                  parsing_job_status NOT NULL DEFAULT 'pending',
    task_id                 VARCHAR(255),
    last_stage              VARCHAR(100),
    raw_text                TEXT,
    parsed_data             JSONB,
    confidence_score        DOUBLE PRECISION,
    ocr_confidence          DOUBLE PRECISION,
    error_message           TEXT,
    started_at              TIMESTAMP WITH TIME ZONE,
    completed_at            TIMESTAMP WITH TIME ZONE,
    original_file_copy_path VARCHAR(500),
    extracted_text_path     VARCHAR(500),
    parsed_json_path        VARCHAR(500),
    progress                INTEGER DEFAULT 0,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_type               VARCHAR(10),
    processing_duration_ms  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_parsing_jobs_candidate_id ON parsing_jobs (candidate_id);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_status       ON parsing_jobs (status);

-- ============================================================
-- 23. job_descriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS job_descriptions (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                 VARCHAR(255) NOT NULL,
    department            VARCHAR(255),
    description           TEXT,
    required_skills       JSONB DEFAULT '[]'::jsonb,
    preferred_skills      JSONB DEFAULT '[]'::jsonb,
    experience_years      INTEGER,
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
    currency              VARCHAR(10) DEFAULT 'USD',
    salary_period         VARCHAR(20) DEFAULT 'Yearly',
    number_of_openings    INTEGER DEFAULT 1,
    notice_period         VARCHAR(50),
    status                VARCHAR(50) DEFAULT 'active',
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_title      ON job_descriptions (title);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_department ON job_descriptions (department);

-- ============================================================
-- 24. job_skills
-- ============================================================

CREATE TABLE IF NOT EXISTS job_skills (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id     UUID NOT NULL REFERENCES job_descriptions (id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    skill_type VARCHAR(50) DEFAULT 'required'
                   CHECK (skill_type IN ('required', 'preferred')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills (job_id);

-- ============================================================
-- 25. jobs (simplified job listings)
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    department      VARCHAR(255),
    description     TEXT,
    required_skills JSONB DEFAULT '[]'::jsonb,
    experience_years INTEGER,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 26. match_scores
-- ============================================================

CREATE TABLE IF NOT EXISTS match_scores (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                UUID REFERENCES job_descriptions (id) ON DELETE SET NULL,
    candidate_id          UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    overall_score         DOUBLE PRECISION NOT NULL,
    skill_score           DOUBLE PRECISION NOT NULL,
    experience_score      DOUBLE PRECISION NOT NULL,
    education_score       DOUBLE PRECISION NOT NULL,
    role_score            NUMERIC,
    project_score         NUMERIC,
    certification_score   NUMERIC,
    matching_skills       TEXT[],
    missing_skills        TEXT[],
    matched_skills        TEXT[] DEFAULT '{}'::text[],
    extra_skills          TEXT[],
    experience_gap_years  DOUBLE PRECISION,
    experience_match_text VARCHAR(100),
    recommendation        VARCHAR(100),
    reason                TEXT,
    match_summary         TEXT,
    match_label           VARCHAR(50),
    jd_hash               VARCHAR(64),
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_scores_candidate_id  ON match_scores (candidate_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_job_id        ON match_scores (job_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_overall_score ON match_scores (overall_score DESC);

-- ============================================================
-- 27. jd_match_results
-- ============================================================

CREATE TABLE IF NOT EXISTS jd_match_results (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id        UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    jd_hash             VARCHAR(64) NOT NULL,
    overall_score       NUMERIC,
    skill_score         NUMERIC,
    experience_score    NUMERIC,
    role_score          NUMERIC,
    project_score       NUMERIC,
    education_score     NUMERIC,
    certification_score NUMERIC,
    matched_skills      JSONB DEFAULT '[]'::jsonb,
    missing_skills      JSONB DEFAULT '[]'::jsonb,
    match_label         VARCHAR(50),
    match_summary       TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jd_match_results_candidate_id ON jd_match_results (candidate_id);
CREATE INDEX IF NOT EXISTS idx_jd_match_results_jd_hash      ON jd_match_results (jd_hash);

-- ============================================================
-- 28. labeled_data
-- ============================================================

CREATE TABLE IF NOT EXISTS labeled_data (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id     UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    corrected_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    labeled_by       UUID NOT NULL,
    labeled_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action           VARCHAR(20) NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version          INTEGER DEFAULT 1,
    model_version    VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_labeled_data_candidate_id ON labeled_data (candidate_id);

-- ============================================================
-- DONE
-- ============================================================
