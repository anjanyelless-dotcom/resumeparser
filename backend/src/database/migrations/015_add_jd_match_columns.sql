-- Migration 015: Add JD Match columns for ATS Job Description Matching feature
-- Safe IF NOT EXISTS additions only — does NOT break existing matching functionality

-- 1. Add new score columns to match_scores for the 6-dimension ATS breakdown
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_scores') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_scores' AND column_name = 'role_score') THEN
            ALTER TABLE match_scores ADD COLUMN role_score DECIMAL(5,2) CHECK (role_score BETWEEN 0 AND 100);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_scores' AND column_name = 'project_score') THEN
            ALTER TABLE match_scores ADD COLUMN project_score DECIMAL(5,2) CHECK (project_score BETWEEN 0 AND 100);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_scores' AND column_name = 'certification_score') THEN
            ALTER TABLE match_scores ADD COLUMN certification_score DECIMAL(5,2) CHECK (certification_score BETWEEN 0 AND 100);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_scores' AND column_name = 'matched_skills') THEN
            ALTER TABLE match_scores ADD COLUMN matched_skills JSONB DEFAULT '[]';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_scores' AND column_name = 'missing_skills') THEN
            ALTER TABLE match_scores ADD COLUMN missing_skills JSONB DEFAULT '[]';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_scores' AND column_name = 'match_summary') THEN
            ALTER TABLE match_scores ADD COLUMN match_summary TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_scores' AND column_name = 'jd_hash') THEN
            ALTER TABLE match_scores ADD COLUMN jd_hash VARCHAR(64);
        END IF;
    END IF;
END $$;

-- 2. Create dedicated jd_match_results table for stateless JD-based matches
--    (no job_id needed — matches are ephemeral and returned to the frontend directly)
CREATE TABLE IF NOT EXISTS jd_match_results (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id        UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    jd_hash             VARCHAR(64) NOT NULL,
    overall_score       DECIMAL(5,2) CHECK (overall_score BETWEEN 0 AND 100),
    skill_score         DECIMAL(5,2) CHECK (skill_score BETWEEN 0 AND 100),
    experience_score    DECIMAL(5,2) CHECK (experience_score BETWEEN 0 AND 100),
    role_score          DECIMAL(5,2) CHECK (role_score BETWEEN 0 AND 100),
    project_score       DECIMAL(5,2) CHECK (project_score BETWEEN 0 AND 100),
    education_score     DECIMAL(5,2) CHECK (education_score BETWEEN 0 AND 100),
    certification_score DECIMAL(5,2) CHECK (certification_score BETWEEN 0 AND 100),
    matched_skills      JSONB DEFAULT '[]',
    missing_skills      JSONB DEFAULT '[]',
    match_label         VARCHAR(50),
    match_summary       TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jd_match_results_candidate_id ON jd_match_results(candidate_id);
CREATE INDEX IF NOT EXISTS idx_jd_match_results_jd_hash ON jd_match_results(jd_hash);
CREATE INDEX IF NOT EXISTS idx_jd_match_results_overall_score ON jd_match_results(overall_score DESC);

SELECT '015_add_jd_match_columns migration completed successfully' AS result;
