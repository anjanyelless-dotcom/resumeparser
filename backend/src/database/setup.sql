-- ============================================================
-- Resume Parser Database Setup Script
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. users table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role        VARCHAR(50) NOT NULL DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'viewer')),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================================
-- 2. candidates table
-- ============================================================
CREATE TABLE IF NOT EXISTS candidates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    location        VARCHAR(255),
    linkedin_url    TEXT,
    github_url      TEXT,
    summary         TEXT,
    raw_resume_text TEXT,
    file_path       TEXT,
    file_type       VARCHAR(20) CHECK (file_type IN ('pdf', 'docx', 'txt', 'image')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_email    ON candidates (email);
CREATE INDEX IF NOT EXISTS idx_candidates_full_name ON candidates (full_name);

-- ============================================================
-- 3. parsing_jobs table
-- ============================================================
CREATE TABLE IF NOT EXISTS parsing_jobs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id     UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    status           VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    confidence_score DECIMAL(5,4) CHECK (confidence_score BETWEEN 0 AND 1),
    parsed_data      JSONB,
    error_message    TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at     TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_parsing_jobs_candidate_id ON parsing_jobs (candidate_id);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_status       ON parsing_jobs (status);

-- ============================================================
-- 4. skills table
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id     UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    skill_name       VARCHAR(255) NOT NULL,
    category         VARCHAR(100) CHECK (category IN ('technical', 'soft', 'certification', 'language', 'tool')),
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience DECIMAL(4,1),
    confidence_score DECIMAL(5,4) CHECK (confidence_score BETWEEN 0 AND 1)
);

CREATE INDEX IF NOT EXISTS idx_skills_candidate_id ON skills (candidate_id);
CREATE INDEX IF NOT EXISTS idx_skills_skill_name   ON skills (skill_name);
CREATE INDEX IF NOT EXISTS idx_skills_category     ON skills (category);

-- ============================================================
-- 5. work_experience table
-- ============================================================
CREATE TABLE IF NOT EXISTS work_experience (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    job_title    VARCHAR(255),
    company_name VARCHAR(255),
    start_date   DATE,
    end_date     DATE,
    is_current   BOOLEAN DEFAULT FALSE,
    description  TEXT,
    location     VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_work_experience_candidate_id ON work_experience (candidate_id);

-- ============================================================
-- 6. education table
-- ============================================================
CREATE TABLE IF NOT EXISTS education (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id    UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    degree          VARCHAR(255),
    institution     VARCHAR(255),
    field_of_study  VARCHAR(255),
    start_date      DATE,
    end_date        DATE,
    gpa             DECIMAL(3,2)
);

CREATE INDEX IF NOT EXISTS idx_education_candidate_id ON education (candidate_id);

-- ============================================================
-- 7. job_descriptions table
-- ============================================================
CREATE TABLE IF NOT EXISTS job_descriptions (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                 VARCHAR(255) NOT NULL,
    department            VARCHAR(255),
    description           TEXT,
    required_skills       JSONB DEFAULT '[]',
    experience_years      INTEGER,
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location              VARCHAR(255),
    employment_type       VARCHAR(50),
    min_experience_years  INTEGER,
    max_experience_years  INTEGER,
    education_level       VARCHAR(100),
    salary_min            INTEGER,
    salary_max            INTEGER,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    education_requirement VARCHAR(255),
    seniority_level       VARCHAR(100),
    salary_range          VARCHAR(255),
    status                VARCHAR(50) DEFAULT 'active',
    preferred_skills      JSONB DEFAULT '[]',
    currency              VARCHAR(10) DEFAULT 'USD',
    salary_period         VARCHAR(20) DEFAULT 'Yearly',
    work_mode             VARCHAR(50),
    number_of_openings    INTEGER DEFAULT 1,
    notice_period         VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_title      ON job_descriptions (title);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_department ON job_descriptions (department);

-- ============================================================
-- 8. match_scores table
-- ============================================================
CREATE TABLE IF NOT EXISTS match_scores (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id     UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    job_id           UUID NOT NULL REFERENCES job_descriptions (id) ON DELETE CASCADE,
    overall_score    DECIMAL(5,2) CHECK (overall_score BETWEEN 0 AND 100),
    skill_score      DECIMAL(5,2) CHECK (skill_score BETWEEN 0 AND 100),
    experience_score DECIMAL(5,2) CHECK (experience_score BETWEEN 0 AND 100),
    education_score  DECIMAL(5,2) CHECK (education_score BETWEEN 0 AND 100),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_match_scores_candidate_id  ON match_scores (candidate_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_job_id        ON match_scores (job_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_overall_score ON match_scores (overall_score DESC);

-- ============================================================
-- Auto-update updated_at trigger for candidates
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
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
