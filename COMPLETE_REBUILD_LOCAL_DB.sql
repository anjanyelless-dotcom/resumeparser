-- Complete Local Database Rebuild to Match Production
-- This script will completely rebuild the local database to match production exactly

-- Step 1: Drop and recreate the database
DROP DATABASE IF EXISTS resume_parser;
CREATE DATABASE resume_parser;

-- Step 2: Connect to the new database and apply production schema
-- This will be done by importing production_schema_dump.sql

-- After running this script:
-- 1. Import: psql -U postgres -d resume_parser -f production_schema_dump.sql
-- 2. Create user and grant permissions
-- 3. Verify synchronization

-- User creation and permissions (run after schema import):
CREATE USER anjanyelle WITH PASSWORD 'anjanyelle';
GRANT ALL PRIVILEGES ON DATABASE resume_parser TO anjanyelle;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anjanyelle;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anjanyelle;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anjanyelle;
