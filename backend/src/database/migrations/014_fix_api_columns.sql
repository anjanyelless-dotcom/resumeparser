-- Migration 014: Fix missing columns expected by the API
-- These columns are referenced by the controllers but were missing from setup.sql

-- Fix 1: candidates.resume_file_path
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'resume_file_path') THEN
            ALTER TABLE candidates ADD COLUMN resume_file_path TEXT;
        END IF;
    END IF;
END $$;

-- Fix 2: parsing_jobs.started_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parsing_jobs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'started_at') THEN
            ALTER TABLE parsing_jobs ADD COLUMN started_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Fix 3: skills.name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skills') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'name') THEN
            ALTER TABLE skills ADD COLUMN name VARCHAR(255);
            -- Copy data if skill_name exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'skill_name') THEN
                EXECUTE 'UPDATE skills SET name = skill_name WHERE name IS NULL';
            END IF;
        END IF;
    END IF;
END $$;

-- Fix 4: labeled_data table
CREATE TABLE IF NOT EXISTS labeled_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    corrected_fields JSONB,
    labeled_by TEXT,
    labeled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT,
    version INTEGER DEFAULT 1,
    model_version VARCHAR(50)
);
