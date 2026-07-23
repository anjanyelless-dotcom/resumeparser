-- Add priority column to job_descriptions table
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium';
