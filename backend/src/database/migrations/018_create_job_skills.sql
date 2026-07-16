-- Table: public.job_skills

-- DROP TABLE IF EXISTS public.job_skills;

CREATE TABLE IF NOT EXISTS public.job_skills
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    job_id uuid NOT NULL,
    skill_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    skill_type character varying(50) COLLATE pg_catalog."default" DEFAULT 'required'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT job_skills_pkey PRIMARY KEY (id),
    CONSTRAINT job_skills_job_id_fkey FOREIGN KEY (job_id)
        REFERENCES public.job_descriptions (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT job_skills_skill_type_check CHECK (skill_type::text = ANY (ARRAY['required'::character varying, 'preferred'::character varying]::text[]))
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.job_skills
    OWNER to postgres;
-- Index: idx_job_skills_job_id

-- DROP INDEX IF EXISTS public.idx_job_skills_job_id;

CREATE INDEX IF NOT EXISTS idx_job_skills_job_id
    ON public.job_skills USING btree
    (job_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;