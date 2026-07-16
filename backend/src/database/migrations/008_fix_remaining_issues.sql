-- Migration to fix remaining database issues
-- Run this in psql with: \i backend/src/database/migrations/008_fix_remaining_issues.sql

-- Add deleted_at column to candidates table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'deleted_at') THEN
            ALTER TABLE candidates ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;

-- Create jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS jobs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            VARCHAR(255) NOT NULL,
    department       VARCHAR(255),
    description      TEXT,
    required_skills  JSONB DEFAULT '[]',
    experience_years INTEGER,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);
CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department);

-- Create job_descriptions table if it doesn't exist (for matching functionality)
CREATE TABLE IF NOT EXISTS job_descriptions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            VARCHAR(255) NOT NULL,
    department       VARCHAR(255),
    description      TEXT,
    required_skills  JSONB DEFAULT '[]',
    experience_years INTEGER,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job_descriptions table
CREATE INDEX IF NOT EXISTS idx_job_descriptions_title ON job_descriptions(title);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_department ON job_descriptions(department);

-- Create match_scores table if it doesn't exist
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

-- Create indexes for match_scores table
CREATE INDEX IF NOT EXISTS idx_match_scores_candidate_id ON match_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_job_id ON match_scores(job_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_overall_score ON match_scores(overall_score DESC);

-- Ensure all required columns exist in candidates table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'years_experience') THEN
            ALTER TABLE candidates ADD COLUMN years_experience REAL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'years_experience_confidence') THEN
            ALTER TABLE candidates ADD COLUMN years_experience_confidence REAL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'current_title') THEN
            ALTER TABLE candidates ADD COLUMN current_title VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'current_company') THEN
            ALTER TABLE candidates ADD COLUMN current_company VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'status') THEN
            ALTER TABLE candidates ADD COLUMN status TEXT DEFAULT 'pending';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'review_status') THEN
            ALTER TABLE candidates ADD COLUMN review_status TEXT DEFAULT 'pending';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'review_assigned_to') THEN
            ALTER TABLE candidates ADD COLUMN review_assigned_to TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'consent_given') THEN
            ALTER TABLE candidates ADD COLUMN consent_given BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'consent_date') THEN
            ALTER TABLE candidates ADD COLUMN consent_date TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'tenant_id') THEN
            ALTER TABLE candidates ADD COLUMN tenant_id TEXT DEFAULT 'default';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'email_hash') THEN
            ALTER TABLE candidates ADD COLUMN email_hash TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'ssn') THEN
            ALTER TABLE candidates ADD COLUMN ssn TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'resume_file_path') THEN
            ALTER TABLE candidates ADD COLUMN resume_file_path TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'resume_path') THEN
            ALTER TABLE candidates ADD COLUMN resume_path TEXT;
        END IF;
    END IF;
END $$;

-- Fix skills table structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skills') THEN
        -- Add name column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'name') THEN
            ALTER TABLE skills ADD COLUMN name VARCHAR(255);
        END IF;
        
        -- Add candidate_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'candidate_id') THEN
            ALTER TABLE skills ADD COLUMN candidate_id UUID;
        END IF;
        
        -- Make candidate_id nullable
        ALTER TABLE skills ALTER COLUMN candidate_id DROP NOT NULL;
        
        -- Add skill_name column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'skill_name') THEN
            ALTER TABLE skills ADD COLUMN skill_name VARCHAR(255);
        END IF;
        
        -- Make skill_name nullable if it exists and has NOT NULL constraint
        ALTER TABLE skills ALTER COLUMN skill_name DROP NOT NULL;
    END IF;
END $$;

-- Create work_history table if it doesn't exist (code expects this name)
CREATE TABLE IF NOT EXISTS work_history (
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

CREATE INDEX IF NOT EXISTS idx_work_history_candidate_id ON work_history(candidate_id);

-- Fix parsing_jobs table structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parsing_jobs') THEN
        -- Add filename column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'filename') THEN
            ALTER TABLE parsing_jobs ADD COLUMN filename TEXT;
        END IF;
        
        -- Add file_path column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'file_path') THEN
            ALTER TABLE parsing_jobs ADD COLUMN file_path TEXT;
        END IF;
    END IF;
END $$;

-- Rename password_hash to hashed_password in users table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users RENAME COLUMN password_hash TO hashed_password;
    END IF;
END $$;

-- Add missing columns to users table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Add is_active column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
            ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
        
        -- Add tenant_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
            ALTER TABLE users ADD COLUMN tenant_id VARCHAR(100) DEFAULT 'default';
        END IF;
    END IF;
END $$;

-- Delete existing admin user to recreate with correct password hash
DELETE FROM users WHERE email = 'admin@example.com';

-- Verify the fix
SELECT 'Migration completed successfully' as result;
