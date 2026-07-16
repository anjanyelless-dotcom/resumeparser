-- Migration: Schema Additions for Match Score, Resume Hashing, and Duplicate Candidates
-- Run this to update the database schema for candidate ranking and deduplication.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add match_score and resume_hash columns to candidates table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'match_score') THEN
            ALTER TABLE candidates ADD COLUMN match_score FLOAT;
            RAISE NOTICE 'Added match_score column to candidates table';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'resume_hash') THEN
            ALTER TABLE candidates ADD COLUMN resume_hash VARCHAR(64);
            RAISE NOTICE 'Added resume_hash column to candidates table';
        END IF;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_match_score ON candidates (match_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_resume_hash ON candidates (resume_hash);

-- 2. Create duplicate_candidates table if not exists
CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id_1 UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    candidate_id_2 UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    similarity_score FLOAT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, merged, ignored
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id_1, candidate_id_2)
);

CREATE INDEX IF NOT EXISTS idx_dup_candidates_1 ON duplicate_candidates(candidate_id_1);
CREATE INDEX IF NOT EXISTS idx_dup_candidates_2 ON duplicate_candidates(candidate_id_2);
