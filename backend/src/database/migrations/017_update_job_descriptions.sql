-- Table: public.job_descriptions

-- DROP TABLE IF EXISTS public.job_descriptions;

CREATE TABLE IF NOT EXISTS public.job_descriptions
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title character varying(255) COLLATE pg_catalog."default" NOT NULL,
    department character varying(255) COLLATE pg_catalog."default",
    description text COLLATE pg_catalog."default",
    required_skills jsonb DEFAULT '[]'::jsonb,
    experience_years integer,
    created_at timestamp with time zone DEFAULT now(),
    location character varying(255) COLLATE pg_catalog."default",
    employment_type character varying(50) COLLATE pg_catalog."default",
    min_experience_years integer,
    max_experience_years integer,
    education_level character varying(100) COLLATE pg_catalog."default",
    salary_min integer,
    salary_max integer,
    updated_at timestamp with time zone DEFAULT now(),
    education_requirement character varying(255) COLLATE pg_catalog."default",
    seniority_level character varying(100) COLLATE pg_catalog."default",
    salary_range character varying(255) COLLATE pg_catalog."default",
    status character varying(50) COLLATE pg_catalog."default" DEFAULT 'active'::character varying,
    preferred_skills jsonb DEFAULT '[]'::jsonb,
    currency character varying(10) COLLATE pg_catalog."default" DEFAULT 'USD'::character varying,
    salary_period character varying(20) COLLATE pg_catalog."default" DEFAULT 'Yearly'::character varying,
    work_mode character varying(50) COLLATE pg_catalog."default",
    number_of_openings integer DEFAULT 1,
    notice_period character varying(50) COLLATE pg_catalog."default",
    CONSTRAINT job_descriptions_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.job_descriptions
    OWNER to postgres;
-- Index: idx_job_descriptions_department

-- DROP INDEX IF EXISTS public.idx_job_descriptions_department;

CREATE INDEX IF NOT EXISTS idx_job_descriptions_department
    ON public.job_descriptions USING btree
    (department COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_job_descriptions_title

-- DROP INDEX IF EXISTS public.idx_job_descriptions_title;

CREATE INDEX IF NOT EXISTS idx_job_descriptions_title
    ON public.job_descriptions USING btree
    (title COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;