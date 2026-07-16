-- Create labeled_data table for storing manual corrections
CREATE TABLE IF NOT EXISTS labeled_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    corrected_fields JSONB NOT NULL DEFAULT '{}',
    labeled_by UUID NOT NULL REFERENCES users(id),
    labeled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(20) NOT NULL CHECK (action IN ('corrected', 'skipped', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure each candidate can only be labeled once
    UNIQUE(candidate_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_labeled_data_candidate_id ON labeled_data(candidate_id);
CREATE INDEX IF NOT EXISTS idx_labeled_data_labeled_by ON labeled_data(labeled_by);
CREATE INDEX IF NOT EXISTS idx_labeled_data_action ON labeled_data(action);
CREATE INDEX IF NOT EXISTS idx_labeled_data_labeled_at ON labeled_data(labeled_at);

-- Add comments for documentation
COMMENT ON TABLE labeled_data IS 'Stores manually corrected labels for resume data, used for training data improvement';
COMMENT ON COLUMN labeled_data.corrected_fields IS 'JSON object containing corrected field values';
COMMENT ON COLUMN labeled_data.action IS 'Action taken: corrected (manually fixed), skipped (not used for training), approved (AI was correct)';

-- Add new columns to candidates table if they don't exist
DO $$
BEGIN
    -- Check and add companies column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'companies') THEN
        ALTER TABLE candidates ADD COLUMN companies JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN candidates.companies IS 'Array of companies extracted from resume';
    END IF;
    
    -- Check and add job_titles column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'job_titles') THEN
        ALTER TABLE candidates ADD COLUMN job_titles JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN candidates.job_titles IS 'Array of job titles extracted from resume';
    END IF;
    
    -- Check and add education_degrees column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'education_degrees') THEN
        ALTER TABLE candidates ADD COLUMN education_degrees JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN candidates.education_degrees IS 'Array of education degrees extracted from resume';
    END IF;
    
    -- Check and add universities column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'universities') THEN
        ALTER TABLE candidates ADD COLUMN universities JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN candidates.universities IS 'Array of universities extracted from resume';
    END IF;
END $$;

-- Create a view for easy access to labeling statistics
CREATE OR REPLACE VIEW labeling_statistics AS
SELECT 
    COUNT(*) as total_candidates_low_confidence,
    COUNT(ld.id) as labeled_candidates,
    COUNT(*) FILTER (WHERE ld.action = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE ld.action = 'corrected') as corrected_count,
    COUNT(*) FILTER (WHERE ld.action = 'skipped') as skipped_count,
    CASE 
        WHEN COUNT(ld.id) > 0 THEN 
            ROUND(COUNT(*) FILTER (WHERE ld.action = 'approved')::numeric / COUNT(ld.id), 3)
        ELSE 0 
    END as accuracy_estimate,
    MAX(ld.labeled_at) as last_labeled_at
FROM candidates c
JOIN (
  SELECT DISTINCT ON (candidate_id) candidate_id, confidence_score
  FROM parsing_jobs
  ORDER BY candidate_id, updated_at DESC
) pj ON c.id = pj.candidate_id
LEFT JOIN labeled_data ld ON c.id = ld.candidate_id
WHERE pj.confidence_score < 0.90;

COMMENT ON VIEW labeling_statistics IS 'Statistics view for resume data labeling progress and accuracy';
