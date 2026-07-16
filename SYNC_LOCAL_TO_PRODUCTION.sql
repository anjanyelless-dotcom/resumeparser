-- Local to Production Database Synchronization Script
-- This script will drop extra tables that exist locally but not in production
-- and then apply the production schema

-- Script generated on: $(date)
-- Production commit: 7d4f7f123d40a285321f01950445173284854afc

-- Step 1: Drop extra tables that exist locally but not in production
-- These tables are development/testing artifacts and should not exist in production

-- Drop statistics tables
DROP TABLE IF EXISTS activity_stats CASCADE;
DROP TABLE IF EXISTS client_communication_stats CASCADE;
DROP TABLE IF EXISTS correction_stats CASCADE;
DROP TABLE IF EXISTS labeling_statistics CASCADE;
DROP TABLE IF EXISTS submission_stats CASCADE;

-- Drop evaluation/testing tables
DROP TABLE IF EXISTS evaluation_confidence_scores CASCADE;
DROP TABLE IF EXISTS evaluation_debug_logs CASCADE;
DROP TABLE IF EXISTS evaluation_error_logs CASCADE;
DROP TABLE IF EXISTS evaluation_performance_metrics CASCADE;
DROP TABLE IF EXISTS evaluation_summary CASCADE;
DROP TABLE IF EXISTS evaluation_test_cases CASCADE;
DROP TABLE IF EXISTS evaluation_test_results CASCADE;
DROP TABLE IF EXISTS evaluation_test_suites CASCADE;

-- Drop development feature tables
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS candidate_achievements CASCADE;
DROP TABLE IF EXISTS correction_patterns CASCADE;
DROP TABLE IF EXISTS corrections CASCADE;
DROP TABLE IF EXISTS daily_activity_summary CASCADE;
DROP TABLE IF EXISTS jd_match_results CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS revoked_tokens CASCADE;
DROP TABLE IF EXISTS skill_suggestions CASCADE;

-- Drop migration tracking tables (will be recreated if needed)
DROP TABLE IF EXISTS alembic_version CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;

-- Drop views (will be recreated if needed)
DROP VIEW IF EXISTS v_accuracy_trends CASCADE;
DROP VIEW IF EXISTS v_error_analysis CASCADE;
DROP VIEW IF EXISTS v_parsing_job_performance CASCADE;

-- Step 2: Apply production schema
-- This will be done by importing the production schema dump

-- After running this script:
-- 1. Import production_schema_dump.sql
-- 2. Verify table counts match (should be 33)
-- 3. Test API functionality

-- Verification queries:
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Should return: 33
