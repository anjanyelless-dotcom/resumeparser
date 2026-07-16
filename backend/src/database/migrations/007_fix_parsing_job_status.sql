-- Migration to fix parsing_job_status enum issue
-- Run this in psql with: \i backend/src/database/migrations/007_fix_parsing_job_status.sql

-- First, check if there's an enum type that needs to be updated
DO $$
BEGIN
    -- Check if parsing_job_status enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parsing_job_status') THEN
        -- Add 'completed' to the enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'parsing_job_status')) THEN
            ALTER TYPE parsing_job_status ADD VALUE 'completed';
        END IF;
        
        -- Add 'failed' to the enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'failed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'parsing_job_status')) THEN
            ALTER TYPE parsing_job_status ADD VALUE 'failed';
        END IF;
        
        -- Add 'processing' to the enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'processing' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'parsing_job_status')) THEN
            ALTER TYPE parsing_job_status ADD VALUE 'processing';
        END IF;
        
        -- Add 'pending' to the enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'parsing_job_status')) THEN
            ALTER TYPE parsing_job_status ADD VALUE 'pending';
        END IF;
    END IF;
END $$;

-- If the table is using VARCHAR with CHECK constraint, ensure it's properly set up
-- First, update any existing invalid status values to valid ones
UPDATE parsing_jobs 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'processing', 'completed', 'failed');

-- Drop and recreate the constraint to be sure
ALTER TABLE parsing_jobs DROP CONSTRAINT IF EXISTS parsing_jobs_status_check;
ALTER TABLE parsing_jobs 
  ADD CONSTRAINT parsing_jobs_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Also ensure the table structure is correct
DO $$
BEGIN
    -- Check if parsing_jobs table exists and has the right columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parsing_jobs') THEN
        -- Make sure status column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'status') THEN
            ALTER TABLE parsing_jobs ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending';
        END IF;
        
        -- Make sure other required columns exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'candidate_id') THEN
            ALTER TABLE parsing_jobs ADD COLUMN candidate_id UUID REFERENCES candidates (id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'confidence_score') THEN
            ALTER TABLE parsing_jobs ADD COLUMN confidence_score DECIMAL(5,4);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'parsed_data') THEN
            ALTER TABLE parsing_jobs ADD COLUMN parsed_data JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'error_message') THEN
            ALTER TABLE parsing_jobs ADD COLUMN error_message TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_jobs' AND column_name = 'completed_at') THEN
            ALTER TABLE parsing_jobs ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;
