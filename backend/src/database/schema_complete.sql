-- ============================================================
-- RESUME PARSER - COMPLETE PRODUCTION SCHEMA
-- schema_complete.sql - Complete schema matching production
-- ============================================================
--
-- This file represents the COMPLETE production database schema
-- Includes all tables that exist in production environment
-- This is the SINGLE SOURCE OF TRUTH for the database.
--
-- Usage (psql):
--   psql -U postgres -d resume_parser -f schema_complete.sql
--
============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$ BEGIN
    CREATE TYPE candidate_status AS ENUM (
        'pending', 'processing', 'success', 'failed', 'deleted'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE parsing_job_status AS ENUM (
        'pending', 'processing', 'completed', 'success', 'failed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE proficiency_level AS ENUM (
        'beginner', 'intermediate', 'advanced', 'expert'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM (
        'pending', 'reviewed', 'approved', 'rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- CORE USER MANAGEMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'recruiter',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'default'
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);

-- ============================================================
-- RBAC SYSTEM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles (name);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_name VARCHAR(100) NOT NULL,
    action_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_name, action_name)
);

CREATE INDEX IF NOT EXISTS idx_permissions_module_action ON permissions (module_name, action_name);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES users (id),
    UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions (permission_id);

-- ============================================================
-- SYSTEM AND AUDIT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users (id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users (id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings (key);

-- ============================================================
-- CANDIDATE MANAGEMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255),
    email_hash VARCHAR(255),
    full_name VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),
    linkedin_url TEXT,
    github_url TEXT,
    summary TEXT,
    raw_resume_text TEXT,
    file_path TEXT,
    file_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status candidate_status DEFAULT 'pending',
    review_status review_status DEFAULT 'pending',
    years_of_experience VARCHAR(50),
    projects TEXT,
    total_experience_years VARCHAR(50),
    total_years_exp JSONB,
    match_score NUMERIC,
    current_title VARCHAR(255),
    current_company VARCHAR(255),
    resume_score INTEGER,
    portfolio_url VARCHAR(255),
    notice_period VARCHAR(100),
    expected_salary_min INTEGER,
    expected_salary_max INTEGER,
    skills_summary TEXT,
    experience_level VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    resume_file_path VARCHAR(500),
    original_filename VARCHAR(255),
    companies JSONB DEFAULT '[]'::jsonb,
    job_titles JSONB DEFAULT '[]'::jsonb,
    education_degrees JSONB DEFAULT '[]'::jsonb,
    universities JSONB DEFAULT '[]'::jsonb,
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMPTZ,
    other_information TEXT,
    summary_manually_edited BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    current_job_title VARCHAR(255),
    resume_hash VARCHAR(255),
    resume_quality_score INTEGER,
    confidence_score NUMERIC
);

-- Create indexes for candidates
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates (email);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates (status);
CREATE INDEX IF NOT EXISTS idx_candidates_review_status ON candidates (review_status);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant_id ON candidates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_deleted_at ON candidates (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_resume_file_path ON candidates (resume_file_path);
CREATE INDEX IF NOT EXISTS idx_candidates_original_filename ON candidates (original_filename);

CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    normalized_name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) DEFAULT 'technical',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills (name);
CREATE INDEX IF NOT EXISTS idx_skills_normalized_name ON skills (normalized_name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills (category);

CREATE TABLE IF NOT EXISTS candidate_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
    proficiency_level proficiency_level,
    years_experience NUMERIC(3,1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(candidate_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate_id ON candidate_skills (candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill_id ON candidate_skills (skill_id);

CREATE TABLE IF NOT EXISTS work_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    location VARCHAR(255),
    description TEXT,
    display_order INTEGER DEFAULT 0,
    client_name VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_work_history_candidate_id ON work_history (candidate_id);
CREATE INDEX IF NOT EXISTS idx_work_history_company_name ON work_history (company_name);

CREATE TABLE IF NOT EXISTS work_experience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    location VARCHAR(255),
    description TEXT,
    display_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_work_experience_candidate_id ON work_experience (candidate_id);

CREATE TABLE IF NOT EXISTS education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255),
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE,
    gpa NUMERIC(3,2),
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_education_candidate_id ON education (candidate_id);
CREATE INDEX IF NOT EXISTS idx_education_institution ON education (institution);

CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    issuer VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_id VARCHAR(255),
    credential_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_certifications_candidate_id ON certifications (candidate_id);

CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    duplicate_candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    similarity_score NUMERIC(5,2),
    match_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(original_candidate_id, duplicate_candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_original ON duplicate_candidates (original_candidate_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_duplicate ON duplicate_candidates (duplicate_candidate_id);

-- ============================================================
-- JOB MANAGEMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS job_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    description TEXT,
    required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    experience_years INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users (id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    location VARCHAR(255),
    salary_min INTEGER,
    salary_max INTEGER,
    employment_type VARCHAR(50),
    posted_date DATE,
    closing_date DATE,
    jd_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_title ON job_descriptions (title);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_department ON job_descriptions (department);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_status ON job_descriptions (status);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_by ON job_descriptions (created_by_user_id);

CREATE TABLE IF NOT EXISTS job_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES job_descriptions (id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    skill_type VARCHAR(20) NOT NULL CHECK (skill_type IN ('required', 'preferred')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills (job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill_name ON job_skills (skill_name);

-- ============================================================
-- MATCHING AND SCORING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS match_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    job_id UUID REFERENCES job_descriptions (id) ON DELETE SET NULL,
    overall_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
    skill_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    experience_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    education_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    recommendation VARCHAR(100),
    missing_skills TEXT[] DEFAULT '{}'::text[],
    skill_details JSONB,
    experience_details JSONB,
    education_details JSONB,
    matched_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    extra_skills TEXT[] DEFAULT '{}'::text[],
    skill_match_count INTEGER DEFAULT 0,
    experience_match_count INTEGER DEFAULT 0,
    education_match_count INTEGER DEFAULT 0,
    total_years_experience NUMERIC(5,2),
    portfolio_experience_months INTEGER,
    parsed_resume_text TEXT,
    parsed_at TIMESTAMP WITHOUT TIME ZONE,
    experience_gap_years NUMERIC(5,2),
    skill_gap_count INTEGER DEFAULT 0,
    education_gap_count INTEGER DEFAULT 0,
    location_match BOOLEAN DEFAULT false,
    salary_match BOOLEAN DEFAULT false,
    overall_match BOOLEAN DEFAULT false,
    role_score NUMERIC,
    project_score NUMERIC,
    certification_score NUMERIC,
    experience_match_text VARCHAR(100),
    reason TEXT,
    match_summary TEXT,
    match_label VARCHAR(50),
    jd_hash VARCHAR(64),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    matched_skills TEXT[] DEFAULT '{}'::text[],
    matching_skills TEXT[] DEFAULT '{}'::text[],
    UNIQUE (candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_match_scores_candidate_id ON match_scores (candidate_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_job_id ON match_scores (job_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_overall_score ON match_scores (overall_score DESC);

-- ============================================================
-- ATS (APPLICANT TRACKING SYSTEM) TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    owner_user_id UUID REFERENCES users (id),
    is_archived BOOLEAN DEFAULT false,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients (company_name);
CREATE INDEX IF NOT EXISTS idx_clients_owner_user_id ON clients (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_is_archived ON clients (is_archived);

CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts (client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts (email);

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    industry VARCHAR(100),
    size VARCHAR(50),
    description TEXT,
    location VARCHAR(255),
    founded_year INTEGER,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies (name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies (industry);

CREATE TABLE IF NOT EXISTS company_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    designation VARCHAR(255),
    contact_type VARCHAR(50) DEFAULT 'general',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON company_contacts (company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_email ON company_contacts (email);

CREATE TABLE IF NOT EXISTS company_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    experience_level VARCHAR(50),
    job_url TEXT,
    posted_date DATE,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    salary_range VARCHAR(100),
    employment_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, job_url)
);

CREATE INDEX IF NOT EXISTS idx_company_jobs_company_id ON company_jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_company_jobs_title ON company_jobs (title);
CREATE INDEX IF NOT EXISTS idx_company_jobs_location ON company_jobs (location);

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES job_descriptions (id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'submitted',
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    client_id UUID REFERENCES clients (id),
    priority VARCHAR(20) DEFAULT 'normal',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_job_id ON submissions (job_id);
CREATE INDEX IF NOT EXISTS idx_submissions_candidate_id ON submissions (candidate_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON submissions (submitted_by);

CREATE TABLE IF NOT EXISTS job_recruiter_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES job_descriptions (id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, recruiter_id)
);

CREATE INDEX IF NOT EXISTS idx_job_recruiter_assignments_job_id ON job_recruiter_assignments (job_id);
CREATE INDEX IF NOT EXISTS idx_job_recruiter_assignments_recruiter_id ON job_recruiter_assignments (recruiter_id);

-- ============================================================
-- INTERVIEW MANAGEMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
    round_name VARCHAR(100) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'video',
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    scheduled_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_round_name CHECK (round_name ~ '^[A-Za-z0-9\s\-]+$'),
    CONSTRAINT valid_mode CHECK (mode IN ('phone', 'video', 'in-person')),
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'completed', 'rescheduled', 'cancelled')),
    UNIQUE(submission_id, round_name)
);

CREATE INDEX IF NOT EXISTS idx_interviews_submission_id ON interviews (submission_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_by ON interviews (scheduled_by);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews (status);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON interviews (scheduled_at);

CREATE TABLE IF NOT EXISTS interview_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    outcome VARCHAR(20) NOT NULL,
    notes TEXT,
    rating INTEGER,
    given_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_outcome CHECK (outcome IN ('pass', 'fail', 'hold')),
    CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON interview_feedback (interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_given_by ON interview_feedback (given_by);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_outcome ON interview_feedback (outcome);

-- ============================================================
-- PLACEMENTS AND CLIENT MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients (id),
    job_id UUID REFERENCES job_descriptions (id),
    recruiter_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    placement_date DATE NOT NULL,
    salary_offered NUMERIC(10,2),
    bonus NUMERIC(10,2),
    contract_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_placements_candidate_id ON placements (candidate_id);
CREATE INDEX IF NOT EXISTS idx_placements_client_id ON placements (client_id);
CREATE INDEX IF NOT EXISTS idx_placements_recruiter_id ON placements (recruiter_id);
CREATE INDEX IF NOT EXISTS idx_placements_placement_date ON placements (placement_date);

CREATE TABLE IF NOT EXISTS client_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    contact_id UUID REFERENCES client_contacts (id),
    logged_by UUID NOT NULL REFERENCES users (id),
    communication_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    notes TEXT NOT NULL,
    follow_up_date DATE,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_communications_client_id ON client_communications (client_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_logged_by ON client_communications (logged_by);
CREATE INDEX IF NOT EXISTS idx_client_communications_type ON client_communications (communication_type);

CREATE TABLE IF NOT EXISTS client_pipeline_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users (id),
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_pipeline_history_client_id ON client_pipeline_history (client_id);
CREATE INDEX IF NOT EXISTS idx_client_pipeline_history_changed_by ON client_pipeline_history (changed_by);

-- ============================================================
-- SYSTEM AND UTILITY TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS parsing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates (id) ON DELETE CASCADE,
    status parsing_job_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    parser_version VARCHAR(50),
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parsing_jobs_candidate_id ON parsing_jobs (candidate_id);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_status ON parsing_jobs (status);

CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies (id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    jobs_found INTEGER DEFAULT 0,
    jobs_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_company_id ON scrape_jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs (status);

CREATE TABLE IF NOT EXISTS labeled_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates (id) ON DELETE CASCADE,
    label_type VARCHAR(100) NOT NULL,
    label_value TEXT NOT NULL,
    confidence_score NUMERIC(5,2),
    labeled_by UUID REFERENCES users (id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    corrected_fields JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_labeled_data_candidate_id ON labeled_data (candidate_id);
CREATE INDEX IF NOT EXISTS idx_labeled_data_label_type ON labeled_data (label_type);

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_descriptions_updated_at BEFORE UPDATE ON job_descriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_match_scores_updated_at BEFORE UPDATE ON match_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_recruiter_assignments_updated_at BEFORE UPDATE ON job_recruiter_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_placements_updated_at BEFORE UPDATE ON placements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- COMPLETE SCHEMA - END
-- ============================================================
