/**
 * Company Intelligence Model Definitions
 * 
 * TypeScript interfaces for company intelligence tables:
 * - companies
 * - company_contacts
 * - company_jobs
 * - scrape_jobs
 */

// ============================================================
// ENUM Types
// ============================================================

export type HiringStatus = 'unknown' | 'not_hiring' | 'hiring' | 'actively_hiring';
export type ATSProvider = 'greenhouse' | 'lever' | 'workday' | 'ashby' | 'smartrecruiters' | 'bamboohr' | 'unknown';
export type ContactType = 'hr' | 'careers' | 'general' | 'unknown';
export type ScrapeStatus = 'queued' | 'running' | 'success' | 'failed' | 'partial';

// ============================================================
// Company Interface
// ============================================================

export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  company_size?: string;
  about_text?: string;
  hiring_score?: number;
  hiring_status: HiringStatus;
  ats_provider: ATSProvider;
  career_url?: string;
  linkedin_url?: string;
  last_scraped_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCompanyInput {
  name: string;
  website?: string;
  industry?: string;
  company_size?: string;
  about_text?: string;
  hiring_score?: number;
  hiring_status?: HiringStatus;
  ats_provider?: ATSProvider;
  career_url?: string;
  linkedin_url?: string;
}

export interface UpdateCompanyInput {
  name?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  about_text?: string;
  hiring_score?: number;
  hiring_status?: HiringStatus;
  ats_provider?: ATSProvider;
  career_url?: string;
  linkedin_url?: string;
  last_scraped_at?: Date;
}

// ============================================================
// Company Contact Interface
// ============================================================

export interface CompanyContact {
  id: string;
  company_id: string;
  email?: string;
  phone?: string;
  source_page?: string;
  contact_type: ContactType;
  created_at: Date;
}

export interface CreateCompanyContactInput {
  company_id: string;
  email?: string;
  phone?: string;
  source_page?: string;
  contact_type?: ContactType;
}

// ============================================================
// Company Job Interface
// ============================================================

export interface CompanyJob {
  id: string;
  company_id: string;
  title: string;
  location?: string;
  experience_level?: string;
  job_url?: string;
  posted_date?: Date;
  is_active: boolean;
  first_seen_at: Date;
  last_seen_at: Date;
}

export interface CreateCompanyJobInput {
  company_id: string;
  title: string;
  location?: string;
  experience_level?: string;
  job_url?: string;
  posted_date?: Date;
  is_active?: boolean;
}

export interface UpdateCompanyJobInput {
  title?: string;
  location?: string;
  experience_level?: string;
  job_url?: string;
  posted_date?: Date;
  is_active?: boolean;
  last_seen_at?: Date;
}

// ============================================================
// Scrape Job Interface
// ============================================================

export interface ScrapeJob {
  id: string;
  company_id: string;
  status: ScrapeStatus;
  level_reached?: number;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

export interface CreateScrapeJobInput {
  company_id: string;
  status?: ScrapeStatus;
  level_reached?: number;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
}

export interface UpdateScrapeJobInput {
  status?: ScrapeStatus;
  level_reached?: number;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
}

// ============================================================
// Query Result Types (with relations)
// ============================================================

export interface CompanyWithContacts extends Company {
  contacts?: CompanyContact[];
}

export interface CompanyWithJobs extends Company {
  jobs?: CompanyJob[];
}

export interface CompanyWithAllRelations extends Company {
  contacts?: CompanyContact[];
  jobs?: CompanyJob[];
  latest_scrape_job?: ScrapeJob;
}
