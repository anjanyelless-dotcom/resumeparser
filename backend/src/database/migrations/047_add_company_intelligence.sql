-- ============================================================
-- MIGRATION 047: Add Company Intelligence Module
-- ============================================================
-- Adds missing columns to existing tables for company tracking,
-- contacts, jobs, and scrape jobs.
-- Includes proper indexes and foreign key relationships.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Create ENUM types
-- ============================================================

-- Hiring status enum
DO $$ BEGIN
    CREATE TYPE hiring_status_enum AS ENUM ('unknown', 'not_hiring', 'hiring', 'actively_hiring');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ATS provider enum
DO $$ BEGIN
    CREATE TYPE ats_provider_enum AS ENUM ('greenhouse', 'lever', 'workday', 'ashby', 'smartrecruiters', 'bamboohr', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Contact type enum
DO $$ BEGIN
    CREATE TYPE contact_type_enum AS ENUM ('hr', 'careers', 'general', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Scrape job status enum
DO $$ BEGIN
    CREATE TYPE scrape_status_enum AS ENUM ('queued', 'running', 'success', 'failed', 'partial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 2. Alter companies table
-- ============================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS about_text TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ats_provider ats_provider_enum DEFAULT 'unknown';

-- Attempt to alter type if possible, otherwise it stays varchar
DO $$ BEGIN
    ALTER TABLE companies ALTER COLUMN hiring_status TYPE hiring_status_enum USING hiring_status::hiring_status_enum;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Create indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_website ON companies (website);
CREATE INDEX IF NOT EXISTS idx_companies_hiring_status ON companies (hiring_status);
CREATE INDEX IF NOT EXISTS idx_companies_ats_provider ON companies (ats_provider);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies (industry);
CREATE INDEX IF NOT EXISTS idx_companies_last_scraped_at ON companies (last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies (created_at);

-- ============================================================
-- 3. Alter company_contacts table
-- ============================================================

ALTER TABLE company_contacts ADD COLUMN IF NOT EXISTS source_page VARCHAR(500);

DO $$ BEGIN
    ALTER TABLE company_contacts ALTER COLUMN contact_type TYPE contact_type_enum USING contact_type::contact_type_enum;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Create indexes for company_contacts
CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON company_contacts (company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_email ON company_contacts (email);
CREATE INDEX IF NOT EXISTS idx_company_contacts_contact_type ON company_contacts (contact_type);
CREATE INDEX IF NOT EXISTS idx_company_contacts_created_at ON company_contacts (created_at);

-- ============================================================
-- 4. Alter company_jobs table
-- ============================================================

ALTER TABLE company_jobs ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT NOW();
-- Add unique constraint if not exists
DO $$ BEGIN
    ALTER TABLE company_jobs ADD CONSTRAINT company_jobs_company_id_job_url_key UNIQUE (company_id, job_url);
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN others THEN null;
END $$;

-- Create indexes for company_jobs
CREATE INDEX IF NOT EXISTS idx_company_jobs_company_id ON company_jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_company_jobs_job_url ON company_jobs (job_url);
CREATE INDEX IF NOT EXISTS idx_company_jobs_title ON company_jobs (title);
CREATE INDEX IF NOT EXISTS idx_company_jobs_location ON company_jobs (location);
CREATE INDEX IF NOT EXISTS idx_company_jobs_is_active ON company_jobs (is_active);
CREATE INDEX IF NOT EXISTS idx_company_jobs_posted_date ON company_jobs (posted_date);
CREATE INDEX IF NOT EXISTS idx_company_jobs_last_seen_at ON company_jobs (last_seen_at);

-- ============================================================
-- 5. Alter scrape_jobs table
-- ============================================================

ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DO $$ BEGIN
    ALTER TABLE scrape_jobs ALTER COLUMN status TYPE scrape_status_enum USING status::scrape_status_enum;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Create indexes for scrape_jobs
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_company_id ON scrape_jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs (status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs (created_at);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_completed_at ON scrape_jobs (completed_at);

-- ============================================================
-- DONE
-- ============================================================
