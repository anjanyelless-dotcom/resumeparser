-- Final schema fix to ensure all tables have correct columns
-- Run this in psql with: \i backend/src/database/migrations/009_final_schema_fix.sql

-- Fix skills table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skills') THEN
        -- Add skill_name as generated column if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'skill_name') THEN
            ALTER TABLE skills ADD COLUMN skill_name VARCHAR(255) GENERATED ALWAYS AS (name) STORED;
        END IF;
        
        -- Add missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'proficiency_level') THEN
            ALTER TABLE skills ADD COLUMN proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'years_experience') THEN
            ALTER TABLE skills ADD COLUMN years_experience DECIMAL(4,1);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'confidence_score') THEN
            ALTER TABLE skills ADD COLUMN confidence_score DECIMAL(5,4) CHECK (confidence_score BETWEEN 0 AND 1);
        END IF;
        
        -- Ensure candidate_id exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'candidate_id') THEN
            ALTER TABLE skills ADD COLUMN candidate_id UUID REFERENCES candidates (id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Fix work_experience table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_experience') THEN
        -- Ensure all required columns exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_experience' AND column_name = 'candidate_id') THEN
            ALTER TABLE work_experience ADD COLUMN candidate_id UUID REFERENCES candidates (id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_experience' AND column_name = 'job_title') THEN
            ALTER TABLE work_experience ADD COLUMN job_title VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_experience' AND column_name = 'company_name') THEN
            ALTER TABLE work_experience ADD COLUMN company_name VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_experience' AND column_name = 'start_date') THEN
            ALTER TABLE work_experience ADD COLUMN start_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_experience' AND column_name = 'end_date') THEN
            ALTER TABLE work_experience ADD COLUMN end_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_experience' AND column_name = 'is_current') THEN
            ALTER TABLE work_experience ADD COLUMN is_current BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_experience' AND column_name = 'description') THEN
            ALTER TABLE work_experience ADD COLUMN description TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_experience' AND column_name = 'location') THEN
            ALTER TABLE work_experience ADD COLUMN location VARCHAR(255);
        END IF;
    END IF;
END $$;

-- Fix education table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'education') THEN
        -- Ensure all required columns exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education' AND column_name = 'candidate_id') THEN
            ALTER TABLE education ADD COLUMN candidate_id UUID REFERENCES candidates (id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education' AND column_name = 'degree') THEN
            ALTER TABLE education ADD COLUMN degree VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education' AND column_name = 'institution') THEN
            ALTER TABLE education ADD COLUMN institution VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education' AND column_name = 'field_of_study') THEN
            ALTER TABLE education ADD COLUMN field_of_study VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education' AND column_name = 'start_date') THEN
            ALTER TABLE education ADD COLUMN start_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education' AND column_name = 'end_date') THEN
            ALTER TABLE education ADD COLUMN end_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education' AND column_name = 'gpa') THEN
            ALTER TABLE education ADD COLUMN gpa DECIMAL(3,2);
        END IF;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_candidate_id ON skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_work_experience_candidate_id ON work_experience(candidate_id);
CREATE INDEX IF NOT EXISTS idx_education_candidate_id ON education(candidate_id);

-- Verify the fix
SELECT 'Final schema fix completed successfully' as result;
