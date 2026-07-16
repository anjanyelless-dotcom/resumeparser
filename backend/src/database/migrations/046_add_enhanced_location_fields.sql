-- Migration: Add Enhanced Location Fields to job_descriptions
-- This adds support for automatic location detection via GeoNames API

-- Add enhanced location columns to job_descriptions table
ALTER TABLE job_descriptions
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
ADD COLUMN IF NOT EXISTS latitude VARCHAR(20),
ADD COLUMN IF NOT EXISTS longitude VARCHAR(20),
ADD COLUMN IF NOT EXISTS location_source VARCHAR(20) CHECK (location_source IN ('manual', 'pincode', 'geolocation'));

-- Add indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_job_descriptions_country ON job_descriptions(country);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_state ON job_descriptions(state);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_city ON job_descriptions(city);

-- Add comment for documentation
COMMENT ON COLUMN job_descriptions.country IS 'Country name from location detection or manual selection';
COMMENT ON COLUMN job_descriptions.state IS 'State/Province name from location detection or manual selection';
COMMENT ON COLUMN job_descriptions.city IS 'City name from location detection or manual selection';
COMMENT ON COLUMN job_descriptions.pincode IS 'Postal/ZIP code from PIN code detection';
COMMENT ON COLUMN job_descriptions.latitude IS 'Latitude coordinate from geolocation';
COMMENT ON COLUMN job_descriptions.longitude IS 'Longitude coordinate from geolocation';
COMMENT ON COLUMN job_descriptions.location_source IS 'Source of location data: manual, pincode, or geolocation';