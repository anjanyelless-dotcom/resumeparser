-- Companies and related tables migration

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  career_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  hiring_status VARCHAR(50) DEFAULT 'unknown',
  hiring_score INTEGER,
  last_scraped_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create company_contacts table
CREATE TABLE IF NOT EXISTS company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_type VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create company_jobs table
CREATE TABLE IF NOT EXISTS company_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  experience_level VARCHAR(50),
  job_url VARCHAR(500),
  posted_date DATE,
  last_seen_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create scrape_jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'queued',
  level_reached INTEGER DEFAULT 1,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_website ON companies(website);
CREATE INDEX IF NOT EXISTS idx_companies_hiring_status ON companies(hiring_status);
CREATE INDEX IF NOT EXISTS idx_companies_hiring_score ON companies(hiring_score);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON company_contacts(company_id);

CREATE INDEX IF NOT EXISTS idx_company_jobs_company_id ON company_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_company_jobs_is_active ON company_jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_company_jobs_posted_date ON company_jobs(posted_date);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_company_id ON scrape_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_company_jobs_updated_at BEFORE UPDATE ON company_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_scrape_jobs_updated_at BEFORE UPDATE ON scrape_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
