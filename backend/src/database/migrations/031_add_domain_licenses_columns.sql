-- Migration: Add domain, domain_confidence, and licenses columns to candidates table
-- Run this in psql or programmatically to add multi-domain support.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        -- Add domain column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'domain') THEN
            ALTER TABLE candidates ADD COLUMN domain VARCHAR(50);
            RAISE NOTICE 'Added domain column to candidates table';
        END IF;
        
        -- Add domain_confidence column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'domain_confidence') THEN
            ALTER TABLE candidates ADD COLUMN domain_confidence NUMERIC(3,2);
            RAISE NOTICE 'Added domain_confidence column to candidates table';
        END IF;
        
        -- Add licenses column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'licenses') THEN
            ALTER TABLE candidates ADD COLUMN licenses JSONB DEFAULT '[]'::jsonb;
            RAISE NOTICE 'Added licenses column to candidates table';
        END IF;
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_candidates_domain ON candidates (domain);
CREATE INDEX IF NOT EXISTS idx_candidates_domain_confidence ON candidates (domain_confidence DESC);
