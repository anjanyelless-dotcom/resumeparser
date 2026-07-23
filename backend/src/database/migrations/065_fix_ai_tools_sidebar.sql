UPDATE sidebar_modules SET parent_id = (SELECT id FROM sidebar_modules WHERE name='ai_tools') WHERE name IN ('ai_matching', 'jd_matching');

INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'model_test', 'Model Test', id, 'Crosshair', '/model-test', 30 FROM sidebar_modules WHERE name='ai_tools'
ON CONFLICT (name) DO NOTHING;

INSERT INTO sidebar_modules (name, display_name, parent_id, icon, route, sort_order)
SELECT 'section_preview', 'Section Preview', id, 'Eye', '/section-preview', 40 FROM sidebar_modules WHERE name='ai_tools'
ON CONFLICT (name) DO NOTHING;

INSERT INTO modules (name, display_name, category, sort_order) VALUES
('model_test', 'Model Test', 'AI Tools', 30),
('section_preview', 'Section Preview', 'AI Tools', 40)
ON CONFLICT (name) DO NOTHING;
