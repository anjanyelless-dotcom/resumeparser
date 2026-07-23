-- Migration: Create application_progress table
-- Version: 049
-- Description: Table to store candidate application progress data

-- Start transaction
BEGIN;

-- Create application_progress table
CREATE TABLE IF NOT EXISTS application_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    application_data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create unique constraint on candidate_id
ALTER TABLE application_progress ADD CONSTRAINT application_progress_candidate_id_unique UNIQUE (candidate_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_application_progress_candidate_id ON application_progress(candidate_id);

-- Create index for last_updated for sorting
CREATE INDEX IF NOT EXISTS idx_application_progress_last_updated ON application_progress(last_updated);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_application_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER application_progress_updated_at
    BEFORE UPDATE ON application_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_application_progress_updated_at();

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE application_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own application progress
CREATE POLICY application_progress_user_policy ON application_progress
    FOR ALL
    USING (candidate_id IN (
        SELECT id FROM candidates 
        WHERE email = current_setting('app.current_user_email', true)
    ))
    WITH CHECK (candidate_id IN (
        SELECT id FROM candidates 
        WHERE email = current_setting('app.current_user_email', true)
    ));

-- Commit transaction
COMMIT;

-- Final verification
SELECT 'Migration 049 completed successfully - application_progress table created' as status;
