--
-- PostgreSQL database dump
--

\restrict tf4pdwHnmLhf4WgVXARMFD7T6wFHoUMdhhxYlaMa097UEQMAPdhaDjUOnA8JV7u

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: ats_provider_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ats_provider_enum AS ENUM (
    'greenhouse',
    'lever',
    'workday',
    'ashby',
    'smartrecruiters',
    'bamboohr',
    'unknown'
);


--
-- Name: contact_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contact_type_enum AS ENUM (
    'hr',
    'careers',
    'general',
    'unknown'
);


--
-- Name: hiring_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.hiring_status_enum AS ENUM (
    'unknown',
    'not_hiring',
    'hiring',
    'actively_hiring'
);


--
-- Name: scrape_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.scrape_status_enum AS ENUM (
    'queued',
    'running',
    'success',
    'failed',
    'partial'
);


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    activity_type character varying(50) NOT NULL,
    related_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_activity_type CHECK (((activity_type)::text = ANY ((ARRAY['call_made'::character varying, 'candidate_sourced'::character varying, 'candidate_submitted'::character varying, 'interview_scheduled'::character varying])::text[])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying(255),
    action character varying(100) NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id character varying(255),
    ip_address character varying(64),
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: candidate_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_skills (
    id integer NOT NULL,
    candidate_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    proficiency_level character varying(50),
    years_of_experience numeric(3,1),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    years_experience numeric
);


--
-- Name: candidate_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidate_skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidate_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidate_skills_id_seq OWNED BY public.candidate_skills.id;


--
-- Name: candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    full_name character varying(255),
    email character varying(255),
    phone character varying(50),
    location character varying(255),
    linkedin_url text,
    github_url text,
    summary text,
    raw_resume_text text,
    file_path text,
    file_type character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    review_status character varying(50) DEFAULT 'pending'::character varying,
    years_of_experience character varying(50),
    projects text,
    total_experience_years character varying(50),
    total_years_exp jsonb,
    match_score numeric(5,2),
    current_title character varying(255),
    current_company character varying(255),
    resume_score integer,
    portfolio_url character varying(500),
    notice_period character varying(100),
    expected_salary_min integer,
    expected_salary_max integer,
    skills_summary text,
    experience_level character varying(50),
    is_active boolean DEFAULT true,
    tenant_id character varying(100) DEFAULT 'default'::character varying,
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    CONSTRAINT candidates_file_type_check CHECK (((file_type)::text = ANY ((ARRAY['pdf'::character varying, 'docx'::character varying, 'txt'::character varying, 'image'::character varying])::text[]))),
    CONSTRAINT candidates_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'deleted'::character varying, 'success'::character varying])::text[])))
);


--
-- Name: certifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_communications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    contact_id uuid,
    logged_by uuid NOT NULL,
    communication_type character varying(20) NOT NULL,
    subject character varying(255),
    notes text,
    follow_up_date date,
    tenant_id character varying(255) DEFAULT 'default'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT client_communications_communication_type_check CHECK (((communication_type)::text = ANY ((ARRAY['call'::character varying, 'email'::character varying, 'meeting'::character varying, 'note'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: client_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    contact_name character varying(255),
    designation character varying(100),
    email character varying(255),
    phone character varying(50),
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_pipeline_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_pipeline_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    from_stage character varying(30),
    to_stage character varying(30) NOT NULL,
    changed_by uuid,
    notes text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_name character varying(255) NOT NULL,
    industry character varying(100),
    address text,
    city character varying(100),
    country character varying(100),
    owner_user_id uuid,
    is_archived boolean DEFAULT false,
    tenant_id character varying(100) DEFAULT 'default'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    pipeline_stage character varying(50) DEFAULT 'lead'::character varying
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    website character varying(255),
    industry character varying(100),
    company_size character varying(50),
    about_text text,
    hiring_score integer,
    hiring_status public.hiring_status_enum DEFAULT 'unknown'::public.hiring_status_enum,
    ats_provider public.ats_provider_enum DEFAULT 'unknown'::public.ats_provider_enum,
    career_url character varying(500),
    linkedin_url character varying(500),
    last_scraped_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE companies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.companies IS 'Company intelligence data for tracking external companies and their hiring patterns';


--
-- Name: COLUMN companies.hiring_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.hiring_score IS 'Calculated score (0-100) indicating hiring activity level';


--
-- Name: COLUMN companies.hiring_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.hiring_status IS 'Current hiring status: unknown, not_hiring, hiring, actively_hiring';


--
-- Name: COLUMN companies.ats_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.ats_provider IS 'ATS system used: greenhouse, lever, workday, ashby, smartrecruiters, bamboohr, unknown';


--
-- Name: company_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    email character varying(255),
    phone character varying(50),
    source_page character varying(500),
    contact_type public.contact_type_enum DEFAULT 'unknown'::public.contact_type_enum,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE company_contacts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.company_contacts IS 'Contact information for companies (HR, careers, general contacts)';


--
-- Name: COLUMN company_contacts.source_page; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_contacts.source_page IS 'URL where this contact information was found';


--
-- Name: company_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    location character varying(255),
    experience_level character varying(50),
    job_url character varying(500),
    posted_date date,
    is_active boolean DEFAULT true,
    first_seen_at timestamp with time zone DEFAULT now(),
    last_seen_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE company_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.company_jobs IS 'Job listings tracked from company career pages';


--
-- Name: COLUMN company_jobs.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_jobs.is_active IS 'Whether the job is currently active/open';


--
-- Name: duplicate_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duplicate_candidates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id_1 uuid NOT NULL,
    candidate_id_2 uuid NOT NULL,
    similarity_score double precision NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT duplicate_candidates_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'merged'::character varying, 'ignored'::character varying])::text[])))
);


--
-- Name: education; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.education (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    degree character varying(255),
    institution character varying(255),
    field_of_study character varying(255),
    start_date date,
    end_date date,
    gpa numeric(3,2)
);


--
-- Name: interview_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_feedback (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    interview_id uuid NOT NULL,
    outcome character varying(20) NOT NULL,
    notes text,
    rating integer,
    given_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_outcome CHECK (((outcome)::text = ANY ((ARRAY['pass'::character varying, 'fail'::character varying, 'hold'::character varying])::text[]))),
    CONSTRAINT valid_rating CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5))))
);


--
-- Name: interviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    submission_id uuid NOT NULL,
    round_name character varying(100) NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    mode character varying(20) DEFAULT 'video'::character varying NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    scheduled_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_mode CHECK (((mode)::text = ANY ((ARRAY['phone'::character varying, 'video'::character varying, 'in-person'::character varying])::text[]))),
    CONSTRAINT valid_round_name CHECK (((round_name)::text ~ '^[A-Za-z0-9\s\-]+$'::text)),
    CONSTRAINT valid_status CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'completed'::character varying, 'rescheduled'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: job_descriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_descriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    department character varying(255),
    description text,
    required_skills jsonb DEFAULT '[]'::jsonb,
    experience_years integer,
    created_at timestamp with time zone DEFAULT now(),
    location character varying(255),
    employment_type character varying(50),
    min_experience_years integer,
    max_experience_years integer,
    education_level character varying(100),
    salary_min integer,
    salary_max integer,
    updated_at timestamp with time zone DEFAULT now(),
    education_requirement character varying(255),
    seniority_level character varying(100),
    salary_range character varying(255),
    status character varying(50) DEFAULT 'active'::character varying,
    preferred_skills jsonb DEFAULT '[]'::jsonb,
    currency character varying(10) DEFAULT 'USD'::character varying,
    salary_period character varying(20) DEFAULT 'Yearly'::character varying,
    work_mode character varying(50),
    number_of_openings integer DEFAULT 1,
    notice_period character varying(50),
    created_by_user_id character varying(255),
    client_id character varying(255),
    updated_by_user_id character varying(255),
    country character varying(100),
    state character varying(100),
    city character varying(100),
    pincode character varying(20),
    latitude character varying(50),
    longitude character varying(50),
    location_source character varying(20) DEFAULT 'manual'::character varying
);


--
-- Name: job_recruiter_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_recruiter_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id uuid NOT NULL,
    recruiter_id uuid NOT NULL,
    assigned_by uuid NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_priority CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);


--
-- Name: job_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_skills (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id uuid NOT NULL,
    skill_name character varying(255) NOT NULL,
    skill_type character varying(20) NOT NULL,
    CONSTRAINT job_skills_skill_type_check CHECK (((skill_type)::text = ANY ((ARRAY['required'::character varying, 'preferred'::character varying])::text[])))
);


--
-- Name: labeled_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labeled_data (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    corrected_fields jsonb,
    action character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT labeled_data_action_check CHECK (((action)::text = ANY ((ARRAY['corrected'::character varying, 'skipped'::character varying, 'approved'::character varying])::text[])))
);


--
-- Name: match_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_scores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    job_id uuid NOT NULL,
    overall_score numeric(5,2),
    skill_score numeric(5,2),
    experience_score numeric(5,2),
    education_score numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    recommendation character varying(50),
    missing_skills jsonb,
    skill_details jsonb,
    experience_details jsonb,
    education_details jsonb,
    matched_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    extra_skills jsonb,
    skill_match_count integer,
    experience_match_count integer,
    education_match_count integer,
    total_years_experience numeric(5,2),
    portfolio_experience_months integer,
    parsed_resume_text text,
    parsed_at timestamp without time zone,
    experience_gap_years numeric(5,2),
    skill_gap_count integer,
    education_gap_count integer,
    location_match boolean,
    salary_match boolean,
    overall_match boolean,
    role_score numeric,
    project_score numeric,
    certification_score numeric,
    experience_match_text character varying(100),
    reason text,
    match_summary text,
    match_label character varying(50),
    jd_hash character varying(64),
    updated_at timestamp with time zone DEFAULT now(),
    matched_skills jsonb,
    CONSTRAINT match_scores_education_score_check CHECK (((education_score >= (0)::numeric) AND (education_score <= (100)::numeric))),
    CONSTRAINT match_scores_experience_score_check CHECK (((experience_score >= (0)::numeric) AND (experience_score <= (100)::numeric))),
    CONSTRAINT match_scores_overall_score_check CHECK (((overall_score >= (0)::numeric) AND (overall_score <= (100)::numeric))),
    CONSTRAINT match_scores_skill_score_check CHECK (((skill_score >= (0)::numeric) AND (skill_score <= (100)::numeric)))
);


--
-- Name: parsing_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parsing_jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    confidence_score numeric(5,4),
    parsed_data jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    started_at timestamp with time zone,
    filename text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT parsing_jobs_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT parsing_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    module_name character varying(100) NOT NULL,
    action_name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    job_id uuid NOT NULL,
    client_id uuid NOT NULL,
    recruiter_id uuid NOT NULL,
    billing_amount numeric(10,2),
    placed_at timestamp with time zone DEFAULT now()
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now(),
    granted_by uuid
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: scrape_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scrape_jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    status public.scrape_status_enum DEFAULT 'queued'::public.scrape_status_enum,
    level_reached integer,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scrape_jobs_level_reached_check CHECK (((level_reached >= 0) AND (level_reached <= 5)))
);


--
-- Name: TABLE scrape_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scrape_jobs IS 'Tracking table for company data scraping operations';


--
-- Name: COLUMN scrape_jobs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scrape_jobs.status IS 'Status: queued, running, success, failed, partial';


--
-- Name: COLUMN scrape_jobs.level_reached; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scrape_jobs.level_reached IS 'Depth level reached during scraping (1-5)';


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    skill_name character varying(255) NOT NULL,
    category character varying(100),
    proficiency_level character varying(50),
    years_experience numeric(4,1),
    confidence_score numeric(5,4),
    name character varying(255),
    CONSTRAINT skills_category_check CHECK (((category)::text = ANY ((ARRAY['technical'::character varying, 'soft'::character varying, 'certification'::character varying, 'language'::character varying, 'tool'::character varying])::text[]))),
    CONSTRAINT skills_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT skills_proficiency_level_check CHECK (((proficiency_level)::text = ANY ((ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying, 'expert'::character varying])::text[])))
);


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    submitted_by uuid NOT NULL,
    status character varying(50) DEFAULT 'submitted'::character varying NOT NULL,
    rejection_reason text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rejection_reason_required CHECK ((((status)::text <> 'Rejected'::text) OR ((rejection_reason IS NOT NULL) AND (rejection_reason <> ''::text)))),
    CONSTRAINT valid_status CHECK (((status)::text = ANY ((ARRAY['Submitted'::character varying, 'Under Review'::character varying, 'Shortlisted'::character varying, 'Interview Scheduled'::character varying, 'Interview Completed'::character varying, 'Offer Extended'::character varying, 'Offer Accepted'::character varying, 'Rejected'::character varying, 'On Hold'::character varying])::text[])))
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'recruiter'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true NOT NULL,
    tenant_id character varying(100) DEFAULT 'default'::character varying NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'recruiter'::character varying, 'viewer'::character varying])::text[])))
);


--
-- Name: work_experience; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_experience (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    job_title character varying(255),
    company_name character varying(255),
    start_date date,
    end_date date,
    is_current boolean DEFAULT false,
    description text,
    location character varying(255),
    duration_string character varying(255)
);


--
-- Name: work_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_history (
    id uuid,
    candidate_id uuid,
    job_title character varying(255),
    company_name character varying(255),
    start_date date,
    end_date date,
    is_current boolean,
    description text,
    location character varying(255)
);


--
-- Name: candidate_skills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_skills ALTER COLUMN id SET DEFAULT nextval('public.candidate_skills_id_seq'::regclass);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: candidate_skills candidate_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_skills
    ADD CONSTRAINT candidate_skills_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- Name: client_communications client_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_communications
    ADD CONSTRAINT client_communications_pkey PRIMARY KEY (id);


--
-- Name: client_contacts client_contacts_one_primary_per_client; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_contacts
    ADD CONSTRAINT client_contacts_one_primary_per_client UNIQUE (client_id, is_primary) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: client_contacts client_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_contacts
    ADD CONSTRAINT client_contacts_pkey PRIMARY KEY (id);


--
-- Name: client_pipeline_history client_pipeline_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pipeline_history
    ADD CONSTRAINT client_pipeline_history_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_website_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_website_key UNIQUE (website);


--
-- Name: company_contacts company_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_contacts
    ADD CONSTRAINT company_contacts_pkey PRIMARY KEY (id);


--
-- Name: company_jobs company_jobs_company_id_job_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_jobs
    ADD CONSTRAINT company_jobs_company_id_job_url_key UNIQUE (company_id, job_url);


--
-- Name: company_jobs company_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_jobs
    ADD CONSTRAINT company_jobs_pkey PRIMARY KEY (id);


--
-- Name: duplicate_candidates duplicate_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duplicate_candidates
    ADD CONSTRAINT duplicate_candidates_pkey PRIMARY KEY (id);


--
-- Name: education education_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.education
    ADD CONSTRAINT education_pkey PRIMARY KEY (id);


--
-- Name: interview_feedback interview_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_feedback
    ADD CONSTRAINT interview_feedback_pkey PRIMARY KEY (id);


--
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- Name: job_descriptions job_descriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_descriptions
    ADD CONSTRAINT job_descriptions_pkey PRIMARY KEY (id);


--
-- Name: job_recruiter_assignments job_recruiter_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_recruiter_assignments
    ADD CONSTRAINT job_recruiter_assignments_pkey PRIMARY KEY (id);


--
-- Name: job_skills job_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_skills
    ADD CONSTRAINT job_skills_pkey PRIMARY KEY (id);


--
-- Name: labeled_data labeled_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_data
    ADD CONSTRAINT labeled_data_pkey PRIMARY KEY (id);


--
-- Name: match_scores match_scores_candidate_id_job_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_scores
    ADD CONSTRAINT match_scores_candidate_id_job_id_key UNIQUE (candidate_id, job_id);


--
-- Name: match_scores match_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_scores
    ADD CONSTRAINT match_scores_pkey PRIMARY KEY (id);


--
-- Name: parsing_jobs parsing_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parsing_jobs
    ADD CONSTRAINT parsing_jobs_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_module_name_action_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_module_name_action_name_key UNIQUE (module_name, action_name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: placements placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scrape_jobs scrape_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrape_jobs
    ADD CONSTRAINT scrape_jobs_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: submissions unique_job_candidate; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT unique_job_candidate UNIQUE (job_id, candidate_id);


--
-- Name: job_recruiter_assignments unique_job_recruiter; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_recruiter_assignments
    ADD CONSTRAINT unique_job_recruiter UNIQUE (job_id, recruiter_id);


--
-- Name: interviews unique_submission_round; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT unique_submission_round UNIQUE (submission_id, round_name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_experience work_experience_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_experience
    ADD CONSTRAINT work_experience_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_log_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_activity_type ON public.activity_log USING btree (activity_type);


--
-- Name: idx_activity_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at);


--
-- Name: idx_activity_log_related_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_related_id ON public.activity_log USING btree (related_id);


--
-- Name: idx_activity_log_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_type_date ON public.activity_log USING btree (activity_type, created_at);


--
-- Name: idx_activity_log_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_user_date ON public.activity_log USING btree (user_id, created_at);


--
-- Name: idx_activity_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_user_id ON public.activity_log USING btree (user_id);


--
-- Name: idx_activity_log_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_user_type ON public.activity_log USING btree (user_id, activity_type);


--
-- Name: idx_candidate_skills_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_skills_candidate_id ON public.candidate_skills USING btree (candidate_id);


--
-- Name: idx_candidate_skills_skill_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_skills_skill_id ON public.candidate_skills USING btree (skill_id);


--
-- Name: idx_candidates_current_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_current_company ON public.candidates USING btree (current_company);


--
-- Name: idx_candidates_current_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_current_title ON public.candidates USING btree (current_title);


--
-- Name: idx_candidates_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_deleted_at ON public.candidates USING btree (deleted_at);


--
-- Name: idx_candidates_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_email ON public.candidates USING btree (email);


--
-- Name: idx_candidates_full_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_full_name ON public.candidates USING btree (full_name);


--
-- Name: idx_candidates_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_is_deleted ON public.candidates USING btree (is_deleted);


--
-- Name: idx_candidates_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_tenant_id ON public.candidates USING btree (tenant_id);


--
-- Name: idx_client_communications_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_client_id ON public.client_communications USING btree (client_id);


--
-- Name: idx_client_communications_client_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_client_type_date ON public.client_communications USING btree (client_id, communication_type, created_at DESC);


--
-- Name: idx_client_communications_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_contact_id ON public.client_communications USING btree (contact_id) WHERE (contact_id IS NOT NULL);


--
-- Name: idx_client_communications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_created_at ON public.client_communications USING btree (created_at DESC);


--
-- Name: idx_client_communications_follow_up_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_follow_up_date ON public.client_communications USING btree (follow_up_date) WHERE (follow_up_date IS NOT NULL);


--
-- Name: idx_client_communications_logged_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_logged_by ON public.client_communications USING btree (logged_by);


--
-- Name: idx_client_communications_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_tenant_id ON public.client_communications USING btree (tenant_id);


--
-- Name: idx_client_communications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_type ON public.client_communications USING btree (communication_type);


--
-- Name: idx_client_contacts_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_contacts_client_id ON public.client_contacts USING btree (client_id);


--
-- Name: idx_client_contacts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_contacts_created_at ON public.client_contacts USING btree (created_at);


--
-- Name: idx_client_contacts_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_contacts_email ON public.client_contacts USING btree (email);


--
-- Name: idx_client_contacts_is_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_contacts_is_primary ON public.client_contacts USING btree (is_primary);


--
-- Name: idx_client_contacts_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_contacts_phone ON public.client_contacts USING btree (phone);


--
-- Name: idx_client_pipeline_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_pipeline_history_changed_at ON public.client_pipeline_history USING btree (changed_at DESC);


--
-- Name: idx_client_pipeline_history_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_pipeline_history_changed_by ON public.client_pipeline_history USING btree (changed_by);


--
-- Name: idx_client_pipeline_history_client_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_pipeline_history_client_date ON public.client_pipeline_history USING btree (client_id, changed_at DESC);


--
-- Name: idx_client_pipeline_history_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_pipeline_history_client_id ON public.client_pipeline_history USING btree (client_id);


--
-- Name: idx_client_pipeline_history_stage_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_pipeline_history_stage_date ON public.client_pipeline_history USING btree (to_stage, changed_at DESC);


--
-- Name: idx_client_pipeline_history_to_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_pipeline_history_to_stage ON public.client_pipeline_history USING btree (to_stage);


--
-- Name: idx_clients_company_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_company_name ON public.clients USING btree (company_name);


--
-- Name: idx_clients_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_created_at ON public.clients USING btree (created_at);


--
-- Name: idx_clients_is_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_is_archived ON public.clients USING btree (is_archived);


--
-- Name: idx_clients_owner_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_owner_user_id ON public.clients USING btree (owner_user_id);


--
-- Name: idx_clients_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_tenant_id ON public.clients USING btree (tenant_id);


--
-- Name: idx_companies_ats_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_ats_provider ON public.companies USING btree (ats_provider);


--
-- Name: idx_companies_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_created_at ON public.companies USING btree (created_at);


--
-- Name: idx_companies_hiring_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_hiring_status ON public.companies USING btree (hiring_status);


--
-- Name: idx_companies_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_industry ON public.companies USING btree (industry);


--
-- Name: idx_companies_last_scraped_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_last_scraped_at ON public.companies USING btree (last_scraped_at);


--
-- Name: idx_companies_website; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_website ON public.companies USING btree (website);


--
-- Name: idx_company_contacts_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_contacts_company_id ON public.company_contacts USING btree (company_id);


--
-- Name: idx_company_contacts_contact_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_contacts_contact_type ON public.company_contacts USING btree (contact_type);


--
-- Name: idx_company_contacts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_contacts_created_at ON public.company_contacts USING btree (created_at);


--
-- Name: idx_company_contacts_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_contacts_email ON public.company_contacts USING btree (email);


--
-- Name: idx_company_jobs_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_jobs_company_id ON public.company_jobs USING btree (company_id);


--
-- Name: idx_company_jobs_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_jobs_is_active ON public.company_jobs USING btree (is_active);


--
-- Name: idx_company_jobs_job_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_jobs_job_url ON public.company_jobs USING btree (job_url);


--
-- Name: idx_company_jobs_last_seen_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_jobs_last_seen_at ON public.company_jobs USING btree (last_seen_at);


--
-- Name: idx_company_jobs_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_jobs_location ON public.company_jobs USING btree (location);


--
-- Name: idx_company_jobs_posted_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_jobs_posted_date ON public.company_jobs USING btree (posted_date);


--
-- Name: idx_company_jobs_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_jobs_title ON public.company_jobs USING btree (title);


--
-- Name: idx_education_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_education_candidate_id ON public.education USING btree (candidate_id);


--
-- Name: idx_interview_feedback_given_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_feedback_given_by ON public.interview_feedback USING btree (given_by);


--
-- Name: idx_interview_feedback_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_feedback_interview_id ON public.interview_feedback USING btree (interview_id);


--
-- Name: idx_interview_feedback_outcome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_feedback_outcome ON public.interview_feedback USING btree (outcome);


--
-- Name: idx_interview_feedback_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_feedback_rating ON public.interview_feedback USING btree (rating);


--
-- Name: idx_interviews_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_mode ON public.interviews USING btree (mode);


--
-- Name: idx_interviews_round_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_round_name ON public.interviews USING btree (round_name);


--
-- Name: idx_interviews_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_scheduled_at ON public.interviews USING btree (scheduled_at);


--
-- Name: idx_interviews_scheduled_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_scheduled_by ON public.interviews USING btree (scheduled_by);


--
-- Name: idx_interviews_scheduled_date_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_scheduled_date_status ON public.interviews USING btree (scheduled_at, status);


--
-- Name: idx_interviews_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_status ON public.interviews USING btree (status);


--
-- Name: idx_interviews_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_submission_id ON public.interviews USING btree (submission_id);


--
-- Name: idx_interviews_submission_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_submission_status ON public.interviews USING btree (submission_id, status);


--
-- Name: idx_job_descriptions_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_descriptions_client_id ON public.job_descriptions USING btree (client_id);


--
-- Name: idx_job_descriptions_created_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_descriptions_created_by_user_id ON public.job_descriptions USING btree (created_by_user_id);


--
-- Name: idx_job_descriptions_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_descriptions_department ON public.job_descriptions USING btree (department);


--
-- Name: idx_job_descriptions_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_descriptions_title ON public.job_descriptions USING btree (title);


--
-- Name: idx_job_descriptions_updated_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_descriptions_updated_by_user_id ON public.job_descriptions USING btree (updated_by_user_id);


--
-- Name: idx_job_recruiter_assignments_assigned_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_recruiter_assignments_assigned_by ON public.job_recruiter_assignments USING btree (assigned_by);


--
-- Name: idx_job_recruiter_assignments_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_recruiter_assignments_job_id ON public.job_recruiter_assignments USING btree (job_id);


--
-- Name: idx_job_recruiter_assignments_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_recruiter_assignments_priority ON public.job_recruiter_assignments USING btree (priority);


--
-- Name: idx_job_recruiter_assignments_recruiter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_recruiter_assignments_recruiter_id ON public.job_recruiter_assignments USING btree (recruiter_id);


--
-- Name: idx_job_recruiter_assignments_recruiter_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_recruiter_assignments_recruiter_priority ON public.job_recruiter_assignments USING btree (recruiter_id, priority);


--
-- Name: idx_match_scores_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_scores_candidate_id ON public.match_scores USING btree (candidate_id);


--
-- Name: idx_match_scores_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_scores_job_id ON public.match_scores USING btree (job_id);


--
-- Name: idx_match_scores_overall_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_scores_overall_score ON public.match_scores USING btree (overall_score DESC);


--
-- Name: idx_parsing_jobs_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parsing_jobs_candidate_id ON public.parsing_jobs USING btree (candidate_id);


--
-- Name: idx_parsing_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parsing_jobs_status ON public.parsing_jobs USING btree (status);


--
-- Name: idx_permissions_module_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permissions_module_action ON public.permissions USING btree (module_name, action_name);


--
-- Name: idx_placements_billing_amount; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placements_billing_amount ON public.placements USING btree (billing_amount);


--
-- Name: idx_placements_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placements_candidate_id ON public.placements USING btree (candidate_id);


--
-- Name: idx_placements_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placements_client_id ON public.placements USING btree (client_id);


--
-- Name: idx_placements_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placements_job_id ON public.placements USING btree (job_id);


--
-- Name: idx_placements_placed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placements_placed_at ON public.placements USING btree (placed_at);


--
-- Name: idx_placements_recruiter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placements_recruiter_id ON public.placements USING btree (recruiter_id);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_roles_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_name ON public.roles USING btree (name);


--
-- Name: idx_scrape_jobs_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scrape_jobs_company_id ON public.scrape_jobs USING btree (company_id);


--
-- Name: idx_scrape_jobs_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scrape_jobs_completed_at ON public.scrape_jobs USING btree (completed_at);


--
-- Name: idx_scrape_jobs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scrape_jobs_created_at ON public.scrape_jobs USING btree (created_at);


--
-- Name: idx_scrape_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scrape_jobs_status ON public.scrape_jobs USING btree (status);


--
-- Name: idx_skills_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skills_candidate_id ON public.skills USING btree (candidate_id);


--
-- Name: idx_skills_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skills_category ON public.skills USING btree (category);


--
-- Name: idx_skills_skill_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skills_skill_name ON public.skills USING btree (skill_name);


--
-- Name: idx_submissions_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_candidate_id ON public.submissions USING btree (candidate_id);


--
-- Name: idx_submissions_candidate_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_candidate_status ON public.submissions USING btree (candidate_id, status);


--
-- Name: idx_submissions_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_job_id ON public.submissions USING btree (job_id);


--
-- Name: idx_submissions_job_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_job_status ON public.submissions USING btree (job_id, status);


--
-- Name: idx_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_status ON public.submissions USING btree (status);


--
-- Name: idx_submissions_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_submitted_at ON public.submissions USING btree (submitted_at);


--
-- Name: idx_submissions_submitted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_submitted_by ON public.submissions USING btree (submitted_by);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_work_experience_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_experience_candidate_id ON public.work_experience USING btree (candidate_id);


--
-- Name: candidates set_candidates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_candidates_updated_at BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: companies update_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: candidate_skills candidate_skills_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_skills
    ADD CONSTRAINT candidate_skills_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: candidate_skills candidate_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_skills
    ADD CONSTRAINT candidate_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: certifications certifications_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: client_communications client_communications_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_communications
    ADD CONSTRAINT client_communications_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_communications client_communications_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_communications
    ADD CONSTRAINT client_communications_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.client_contacts(id) ON DELETE SET NULL;


--
-- Name: client_communications client_communications_logged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_communications
    ADD CONSTRAINT client_communications_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: client_contacts client_contacts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_contacts
    ADD CONSTRAINT client_contacts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_pipeline_history client_pipeline_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pipeline_history
    ADD CONSTRAINT client_pipeline_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: client_pipeline_history client_pipeline_history_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pipeline_history
    ADD CONSTRAINT client_pipeline_history_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: clients clients_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- Name: company_contacts company_contacts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_contacts
    ADD CONSTRAINT company_contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_jobs company_jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_jobs
    ADD CONSTRAINT company_jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: duplicate_candidates duplicate_candidates_candidate_id_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duplicate_candidates
    ADD CONSTRAINT duplicate_candidates_candidate_id_1_fkey FOREIGN KEY (candidate_id_1) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: duplicate_candidates duplicate_candidates_candidate_id_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duplicate_candidates
    ADD CONSTRAINT duplicate_candidates_candidate_id_2_fkey FOREIGN KEY (candidate_id_2) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: education education_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.education
    ADD CONSTRAINT education_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: interview_feedback interview_feedback_given_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_feedback
    ADD CONSTRAINT interview_feedback_given_by_fkey FOREIGN KEY (given_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: interview_feedback interview_feedback_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_feedback
    ADD CONSTRAINT interview_feedback_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interviews interviews_scheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: interviews interviews_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;


--
-- Name: job_recruiter_assignments job_recruiter_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_recruiter_assignments
    ADD CONSTRAINT job_recruiter_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: job_recruiter_assignments job_recruiter_assignments_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_recruiter_assignments
    ADD CONSTRAINT job_recruiter_assignments_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE;


--
-- Name: job_recruiter_assignments job_recruiter_assignments_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_recruiter_assignments
    ADD CONSTRAINT job_recruiter_assignments_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_skills job_skills_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_skills
    ADD CONSTRAINT job_skills_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE;


--
-- Name: labeled_data labeled_data_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_data
    ADD CONSTRAINT labeled_data_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: match_scores match_scores_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_scores
    ADD CONSTRAINT match_scores_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: match_scores match_scores_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_scores
    ADD CONSTRAINT match_scores_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE;


--
-- Name: parsing_jobs parsing_jobs_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parsing_jobs
    ADD CONSTRAINT parsing_jobs_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: placements placements_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: placements placements_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: placements placements_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE;


--
-- Name: placements placements_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: scrape_jobs scrape_jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrape_jobs
    ADD CONSTRAINT scrape_jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: skills skills_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: work_experience work_experience_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_experience
    ADD CONSTRAINT work_experience_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict tf4pdwHnmLhf4WgVXARMFD7T6wFHoUMdhhxYlaMa097UEQMAPdhaDjUOnA8JV7u

