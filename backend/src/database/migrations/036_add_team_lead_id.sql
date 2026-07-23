-- Migration 036: Add team_lead_id to users table
-- This allows recruiters to be assigned to team leads for management hierarchy

-- ============================================================
-- 1. Add team_lead_id column to users table
-- ============================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add comment to explain the purpose
COMMENT ON COLUMN users.team_lead_id IS 'References the team lead user who manages this recruiter (NULL for non-recruiters or top-level recruiters)';

-- ============================================================
-- 2. Add index on team_lead_id for performance
-- ============================================================

-- This index will optimize queries like "get all recruiters under this team lead"
CREATE INDEX IF NOT EXISTS idx_users_team_lead_id ON users(team_lead_id) 
WHERE team_lead_id IS NOT NULL;

-- ============================================================
-- 3. Add composite index for role + team_lead_id
-- ============================================================

-- This will optimize queries that filter by both role and team_lead
CREATE INDEX IF NOT EXISTS idx_users_role_team_lead ON users(role, team_lead_id) 
WHERE team_lead_id IS NOT NULL AND role = 'recruiter';

-- ============================================================
-- 4. Verification
-- ============================================================

DO $$
BEGIN
    -- Check if column was added successfully
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'team_lead_id'
    ) THEN
        RAISE NOTICE '✅ team_lead_id column added to users table successfully';
    ELSE
        RAISE EXCEPTION '❌ team_lead_id column was not added';
    END IF;

    -- Check if indexes were created
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' AND indexname = 'idx_users_team_lead_id'
    ) THEN
        RAISE NOTICE '✅ idx_users_team_lead_id index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_users_team_lead_id index was not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' AND indexname = 'idx_users_role_team_lead'
    ) THEN
        RAISE NOTICE '✅ idx_users_role_team_lead index created successfully';
    ELSE
        RAISE EXCEPTION '❌ idx_users_role_team_lead index was not created';
    END IF;
END $$;

-- ============================================================
-- 5. Sample data (optional - for testing)
-- ============================================================

-- This is commented out by default. Uncomment if you want to add sample team lead assignments.
/*
-- Update some recruiters to have team leads (assuming you have team lead users)
UPDATE users 
SET team_lead_id = (
    SELECT id FROM users WHERE role = 'team_lead' LIMIT 1
)
WHERE role = 'recruiter' AND team_lead_id IS NULL
AND id IN (
    SELECT id FROM users WHERE role = 'recruiter' LIMIT 3
);
*/

-- ============================================================
-- Migration complete
-- ============================================================