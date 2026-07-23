BEGIN;

DO $$
DECLARE
  v_ai_matching_module_id UUID;
  v_matching_module_id UUID;
  v_ai_matching_sidebar_id UUID;
  v_matching_sidebar_id UUID;
BEGIN
  -- 1. sidebar_modules
  SELECT id INTO v_ai_matching_sidebar_id FROM sidebar_modules WHERE name = 'ai_matching';
  SELECT id INTO v_matching_sidebar_id FROM sidebar_modules WHERE name = 'matching';

  IF v_matching_sidebar_id IS NOT NULL THEN
    IF v_ai_matching_sidebar_id IS NULL THEN
      UPDATE sidebar_modules SET name = 'ai_matching', display_name = 'AI Matching' WHERE id = v_matching_sidebar_id;
    ELSE
      -- Both exist. Merge permissions and delete matching
      INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible)
      SELECT role_id, v_ai_matching_sidebar_id, visible 
      FROM role_sidebar_permissions 
      WHERE sidebar_module_id = v_matching_sidebar_id
      ON CONFLICT DO NOTHING;

      DELETE FROM role_sidebar_permissions WHERE sidebar_module_id = v_matching_sidebar_id;
      DELETE FROM sidebar_modules WHERE id = v_matching_sidebar_id;
    END IF;
  END IF;

  -- 2. modules
  SELECT id INTO v_ai_matching_module_id FROM modules WHERE name = 'ai_matching';
  SELECT id INTO v_matching_module_id FROM modules WHERE name = 'matching';

  IF v_matching_module_id IS NOT NULL THEN
    IF v_ai_matching_module_id IS NULL THEN
      UPDATE modules SET name = 'ai_matching', display_name = 'AI Matching' WHERE id = v_matching_module_id;
    ELSE
      -- Both exist. Merge permissions and delete matching
      INSERT INTO role_permissions (role_id, module_id, action, allowed, scope_id, sidebar_visible)
      SELECT role_id, v_ai_matching_module_id, action, allowed, scope_id, sidebar_visible 
      FROM role_permissions 
      WHERE module_id = v_matching_module_id
      ON CONFLICT DO NOTHING;

      DELETE FROM role_permissions WHERE module_id = v_matching_module_id;
      DELETE FROM modules WHERE id = v_matching_module_id;
    END IF;
  END IF;

  -- 3. rbac_modules
  SELECT id INTO v_ai_matching_module_id FROM rbac_modules WHERE name = 'ai_matching';
  SELECT id INTO v_matching_module_id FROM rbac_modules WHERE name = 'matching';

  IF v_matching_module_id IS NOT NULL THEN
    IF v_ai_matching_module_id IS NULL THEN
      UPDATE rbac_modules SET name = 'ai_matching', display_name = 'AI Matching' WHERE id = v_matching_module_id;
    ELSE
      DELETE FROM rbac_modules WHERE id = v_matching_module_id;
    END IF;
  END IF;

END $$;

COMMIT;
