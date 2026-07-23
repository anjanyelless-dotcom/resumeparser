BEGIN;

-- 1. Fix Settings parent name
UPDATE sidebar_modules SET display_name = 'Settings' WHERE name = 'settings';

-- 2. Remove duplicate AI Matching (keep ai_matching, hide matching)
UPDATE sidebar_modules SET is_active = false WHERE name = 'matching';
UPDATE sidebar_modules SET display_name = 'AI Matching' WHERE name = 'ai_matching';

-- 3. Insert missing 'Model Accuracy' if it doesn't exist, or activate it if it does
INSERT INTO sidebar_modules (id, name, display_name, group_name, parent_id, icon, route, sort_order, is_active)
SELECT uuid_generate_v4(), 'accuracy', 'Model Accuracy', 'Reports & Analytics', (SELECT id FROM sidebar_modules WHERE name='reports'), 'Target', '/accuracy', 20, true
WHERE NOT EXISTS (SELECT 1 FROM sidebar_modules WHERE name='accuracy');

UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), sort_order = 20, route = '/accuracy' WHERE name = 'accuracy';

-- 4. Insert missing 'Team KPIs' if it doesn't exist, or activate it if it does
INSERT INTO sidebar_modules (id, name, display_name, group_name, parent_id, icon, route, sort_order, is_active)
SELECT uuid_generate_v4(), 'team_kpis', 'Team KPIs', 'Reports & Analytics', (SELECT id FROM sidebar_modules WHERE name='reports'), 'BarChart2', '/team-lead/team-kpis', 30, true
WHERE NOT EXISTS (SELECT 1 FROM sidebar_modules WHERE name='team_kpis');

UPDATE sidebar_modules SET is_active = true, parent_id = (SELECT id FROM sidebar_modules WHERE name='reports'), sort_order = 30, route = '/team-lead/team-kpis' WHERE name = 'team_kpis';

COMMIT;
