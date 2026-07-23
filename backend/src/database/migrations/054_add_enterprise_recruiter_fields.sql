-- Add fields for candidate tracking
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS assigned_recruiter_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id);

-- Add profile fields to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT 'en';
