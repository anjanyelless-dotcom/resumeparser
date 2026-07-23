BEGIN;

-- Remove duplicates or inactive items in sidebar_modules to avoid confusion
DELETE FROM sidebar_modules WHERE name = 'matching';
DELETE FROM sidebar_modules WHERE name = 'ai_matching_tool';

-- Ensure ai_matching has the correct display_name and is active in sidebar_modules
UPDATE sidebar_modules 
SET display_name = 'AI Matching', is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools' LIMIT 1)
WHERE name = 'ai_matching';

-- If ai_matching does not exist in sidebar_modules, insert it
INSERT INTO sidebar_modules (id, name, display_name, parent_id, icon, route, sort_order, is_active)
SELECT uuid_generate_v4(), 'ai_matching', 'AI Matching', id, 'Zap', '/matching', 10, true
FROM sidebar_modules WHERE name = 'ai_tools'
AND NOT EXISTS (SELECT 1 FROM sidebar_modules WHERE name = 'ai_matching');

-- Clean up jd_analyzer if jd_matching already exists
DELETE FROM sidebar_modules WHERE name = 'jd_analyzer' AND EXISTS (SELECT 1 FROM sidebar_modules WHERE name = 'jd_matching');
UPDATE sidebar_modules SET name = 'jd_matching', display_name = 'JD Matching' WHERE name = 'jd_analyzer';

-- Ensure model_test is properly named in sidebar_modules
UPDATE sidebar_modules SET display_name = 'Model Test' WHERE name = 'model_test';

-- Now ensure the `modules` table matches exactly with `sidebar_modules` for the 'AI TOOLS' category
-- 1. AI Matching
INSERT INTO modules (name, display_name, category, sort_order)
VALUES ('ai_matching', 'AI Matching', 'AI TOOLS', 10)
ON CONFLICT (name) DO UPDATE SET category = 'AI TOOLS', display_name = 'AI Matching';

-- 2. JD Matching
INSERT INTO modules (name, display_name, category, sort_order)
VALUES ('jd_matching', 'JD Matching', 'AI TOOLS', 20)
ON CONFLICT (name) DO UPDATE SET category = 'AI TOOLS', display_name = 'JD Matching';

-- Replace jd_analyzer in modules if it exists
DELETE FROM modules WHERE name = 'jd_analyzer' AND EXISTS (SELECT 1 FROM modules WHERE name = 'jd_matching');
UPDATE modules SET name = 'jd_matching' WHERE name = 'jd_analyzer';

-- 3. Model Test
INSERT INTO modules (name, display_name, category, sort_order)
VALUES ('model_test', 'Model Test', 'AI TOOLS', 30)
ON CONFLICT (name) DO UPDATE SET category = 'AI TOOLS', display_name = 'Model Test';

-- 4. Section Preview
INSERT INTO modules (name, display_name, category, sort_order)
VALUES ('section_preview', 'Section Preview', 'AI TOOLS', 40)
ON CONFLICT (name) DO UPDATE SET category = 'AI TOOLS', display_name = 'Section Preview';

-- Explicitly ensure categories are exactly 'AI TOOLS' 
UPDATE modules SET category = 'AI TOOLS' WHERE name IN ('ai_matching', 'jd_matching', 'model_test', 'section_preview');

COMMIT;
