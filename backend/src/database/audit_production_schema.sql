-- ============================================================
-- PRODUCTION DATABASE SCHEMA AUDIT
-- Extract all tables and columns for comparison
-- ============================================================

-- Get all tables and columns
SELECT 
    'PRODUCTION' as environment,
    table_name,
    column_name,
    ordinal_position,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name, ordinal_position;

-- Get all tables
SELECT 
    'PRODUCTION' as environment,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Get all indexes
SELECT 
    'PRODUCTION' as environment,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Get all constraints
SELECT 
    'PRODUCTION' as environment,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Check for migration tracking table
SELECT 
    'PRODUCTION' as environment,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name LIKE '%migration%'
ORDER BY table_name, ordinal_position;
