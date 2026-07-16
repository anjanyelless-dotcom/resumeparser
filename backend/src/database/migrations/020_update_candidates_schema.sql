-- Table: public.candidates

-- DROP TABLE IF EXISTS public.candidates;

CREATE TABLE IF NOT EXISTS public.candidates
(
    id uuid NOT NULL,
    email character varying(255) COLLATE pg_catalog."default",
    email_hash character varying(64) COLLATE pg_catalog."default",
    full_name character varying(150) COLLATE pg_catalog."default",
    phone character varying(50) COLLATE pg_catalog."default",
    ssn character varying(50) COLLATE pg_catalog."default",
    location character varying(150) COLLATE pg_catalog."default",
    linkedin_url character varying(500) COLLATE pg_catalog."default",
    github_url character varying(500) COLLATE pg_catalog."default",
    summary text COLLATE pg_catalog."default",
    years_experience double precision,
    current_title character varying(200) COLLATE pg_catalog."default",
    current_company character varying(200) COLLATE pg_catalog."default",
    consent_given boolean NOT NULL,
    consent_date timestamp with time zone,
    tenant_id character varying(100) COLLATE pg_catalog."default" NOT NULL DEFAULT 'default'::character varying,
    review_status review_status NOT NULL,
    review_assigned_to character varying(255) COLLATE pg_catalog."default",
    review_notes text COLLATE pg_catalog."default",
    review_flagged_at timestamp with time zone,
    review_confidence double precision,
    review_flags jsonb,
    review_approved_at timestamp with time zone,
    review_approved_by character varying(255) COLLATE pg_catalog."default",
    review_rejected_at timestamp with time zone,
    review_rejected_by character varying(255) COLLATE pg_catalog."default",
    status candidate_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    years_experience_confidence double precision,
    summary_manually_edited boolean NOT NULL DEFAULT false,
    error_message text COLLATE pg_catalog."default",
    confidence_score numeric(5,4),
    progress integer DEFAULT 0,
    years_of_experience integer DEFAULT 0,
    deleted_at timestamp with time zone,
    current_job_title character varying(255) COLLATE pg_catalog."default",
    location_city character varying(255) COLLATE pg_catalog."default",
    location_country character varying(255) COLLATE pg_catalog."default",
    location_state character varying(255) COLLATE pg_catalog."default",
    original_filename character varying(255) COLLATE pg_catalog."default",
    parsing_confidence double precision,
    resume_file_path character varying(255) COLLATE pg_catalog."default",
    resume_quality_score integer,
    total_experience_years double precision,
    companies jsonb DEFAULT '[]'::jsonb,
    job_titles jsonb DEFAULT '[]'::jsonb,
    education_degrees jsonb DEFAULT '[]'::jsonb,
    universities jsonb DEFAULT '[]'::jsonb,
    resume_hash character varying(64) COLLATE pg_catalog."default",
    match_score double precision,
    projects jsonb DEFAULT '[]'::jsonb,
    raw_resume_text text COLLATE pg_catalog."default",
    file_path text COLLATE pg_catalog."default",
    file_type character varying(20) COLLATE pg_catalog."default",
    expected_salary_min numeric,
    expected_salary_max numeric,
    other_information text COLLATE pg_catalog."default",
    resume_path text COLLATE pg_catalog."default",
    CONSTRAINT candidates_pkey PRIMARY KEY (id),
    CONSTRAINT candidates_confidence_score_check CHECK (confidence_score >= 0::numeric AND confidence_score <= 1::numeric),
    CONSTRAINT candidates_progress_check CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT candidates_file_type_check CHECK (file_type::text = ANY (ARRAY['pdf'::character varying, 'docx'::character varying, 'txt'::character varying, 'image'::character varying]::text[]))
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.candidates
    OWNER to postgres;

COMMENT ON COLUMN public.candidates.companies
    IS 'Array of companies extracted from resume';

COMMENT ON COLUMN public.candidates.job_titles
    IS 'Array of job titles extracted from resume';

COMMENT ON COLUMN public.candidates.education_degrees
    IS 'Array of education degrees extracted from resume';

COMMENT ON COLUMN public.candidates.universities
    IS 'Array of universities extracted from resume';
-- Index: idx_candidates_email

-- DROP INDEX IF EXISTS public.idx_candidates_email;

CREATE INDEX IF NOT EXISTS idx_candidates_email
    ON public.candidates USING btree
    (email COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_candidates_full_name

-- DROP INDEX IF EXISTS public.idx_candidates_full_name;

CREATE INDEX IF NOT EXISTS idx_candidates_full_name
    ON public.candidates USING btree
    (full_name COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_candidates_match_score

-- DROP INDEX IF EXISTS public.idx_candidates_match_score;

CREATE INDEX IF NOT EXISTS idx_candidates_match_score
    ON public.candidates USING btree
    (match_score DESC NULLS FIRST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_candidates_resume_hash

-- DROP INDEX IF EXISTS public.idx_candidates_resume_hash;

CREATE INDEX IF NOT EXISTS idx_candidates_resume_hash
    ON public.candidates USING btree
    (resume_hash COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: ix_candidates_created_at

-- DROP INDEX IF EXISTS public.ix_candidates_created_at;

CREATE INDEX IF NOT EXISTS ix_candidates_created_at
    ON public.candidates USING btree
    (created_at ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: ix_candidates_email_hash

-- DROP INDEX IF EXISTS public.ix_candidates_email_hash;

CREATE INDEX IF NOT EXISTS ix_candidates_email_hash
    ON public.candidates USING btree
    (email_hash COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: ix_candidates_status

-- DROP INDEX IF EXISTS public.ix_candidates_status;

CREATE INDEX IF NOT EXISTS ix_candidates_status
    ON public.candidates USING btree
    (status ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;

-- Trigger: set_candidates_updated_at

-- DROP TRIGGER IF EXISTS set_candidates_updated_at ON public.candidates;

CREATE OR REPLACE TRIGGER set_candidates_updated_at
    BEFORE UPDATE 
    ON public.candidates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();