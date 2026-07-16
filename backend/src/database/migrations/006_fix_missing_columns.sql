-- Migration to fix missing columns in skills, work_experience, and education tables
-- Run this in psql with: \i backend/src/database/migrations/006_fix_missing_columns.sql

-- Fix skills table
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates (id) ON DELETE CASCADE;

-- Fix work_experience table  
ALTER TABLE work_experience
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates (id) ON DELETE CASCADE;

-- Fix education table
ALTER TABLE education
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates (id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_candidate_id ON skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_work_experience_candidate_id ON work_experience(candidate_id);
CREATE INDEX IF NOT EXISTS idx_education_candidate_id ON education(candidate_id);

-- Also ensure id columns exist and are primary keys
DO $$
BEGIN
    -- Check if skills table has id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'skills' AND column_name = 'id'
    ) THEN
        ALTER TABLE skills ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
    END IF;
    
    -- Check if work_experience table has id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_experience' AND column_name = 'id'
    ) THEN
        ALTER TABLE work_experience ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
    END IF;
    
    -- Check if education table has id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'education' AND column_name = 'id'
    ) THEN
        ALTER TABLE education ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
    END IF;
END $$;
