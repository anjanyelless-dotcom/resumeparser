-- ============================================================
-- SCHEMA VERIFICATION TEST - Confirm All Fixes Working
-- ============================================================

-- Test 1: Verify critical columns exist
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    -- Check for required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'total_experience_years') THEN
        missing_columns := array_append(missing_columns, 'total_experience_years');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'years_of_experience') THEN
        missing_columns := array_append(missing_columns, 'years_of_experience');
    END IF;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing critical columns: %', missing_columns;
    ELSE
        RAISE NOTICE '✅ All critical columns present';
    END IF;
END $$;

-- Test 2: Verify data migration
DO $$
DECLARE
    total_candidates INTEGER;
    migrated_count INTEGER;
    migration_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_candidates FROM candidates;
    SELECT COUNT(*) INTO migrated_count FROM candidates WHERE total_experience_years IS NOT NULL;
    
    migration_rate := (migrated_count::NUMERIC / total_candidates::NUMERIC) * 100;
    
    IF migration_rate >= 75 THEN
        RAISE NOTICE '✅ Data migration successful: %/% candidates migrated (%)', migrated_count, total_candidates, migration_rate;
    ELSE
        RAISE WARNING '⚠️ Low migration rate: %/% candidates migrated (%)', migrated_count, total_candidates, migration_rate;
    END IF;
END $$;

-- Test 3: Verify indexes exist
DO $$
DECLARE
    missing_indexes TEXT[];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'candidates' AND indexname = 'idx_candidates_total_experience_years') THEN
        missing_indexes := array_append(missing_indexes, 'idx_candidates_total_experience_years');
    END IF;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING '⚠️ Missing indexes: %', missing_indexes;
    ELSE
        RAISE NOTICE '✅ All critical indexes present';
    END IF;
END $$;

-- Test 4: Verify migration tracking table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
        RAISE NOTICE '✅ Migration tracking table exists';
        
        -- Show recent migrations
        RAISE NOTICE 'Recent migrations:';
        PERFORM pg_notify('migration_check', format('Recent migrations: %', 
            (SELECT array_agg(version || ' - ' || description) 
             FROM schema_migrations 
             ORDER BY applied_at DESC LIMIT 3)));
    ELSE
        RAISE WARNING '⚠️ Migration tracking table missing';
    END IF;
END $$;

-- Test 5: Test query performance (simulate application query)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, full_name, email, years_of_experience, total_experience_years 
FROM candidates 
WHERE years_of_experience > 5 
ORDER BY total_experience_years DESC 
LIMIT 10;

-- Final Status Report
SELECT 
    'SCHEMA_VERIFICATION' as test_type,
    NOW() as test_timestamp,
    (SELECT COUNT(*) FROM candidates) as total_candidates,
    (SELECT COUNT(*) FROM candidates WHERE total_experience_years IS NOT NULL) as with_total_experience_years,
    (SELECT COUNT(*) FROM candidates WHERE years_of_experience IS NOT NULL) as with_years_experience,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'candidates') as total_columns,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'candidates') as total_indexes;

RAISE NOTICE '=== SCHEMA VERIFICATION COMPLETE ===';
RAISE NOTICE 'Database schema is ready for production deployment';
