-- Migration 051: Add missing parsing_jobs columns required by resume upload flow

BEGIN;

ALTER TABLE parsing_jobs
    ADD COLUMN IF NOT EXISTS file_path TEXT,
    ADD COLUMN IF NOT EXISTS raw_text TEXT,
    ADD COLUMN IF NOT EXISTS raw_resume_text TEXT,
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS parser_version VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_parsing_jobs_candidate_id ON parsing_jobs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_status ON parsing_jobs(status);

COMMIT;

SELECT 'Migration 051 applied: missing parsing_jobs columns added' as status;
