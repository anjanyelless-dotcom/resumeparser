BEGIN;

-- Utility function to grant permission
CREATE OR REPLACE FUNCTION grant_permission_safely(
    p_role_name VARCHAR,
    p_module_name VARCHAR,
    p_action_name VARCHAR,
    p_scope_name VARCHAR
) RETURNS VOID AS $$
DECLARE
    v_role_id UUID;
    v_module_id UUID;
    v_scope_id UUID;
BEGIN
    SELECT id INTO v_role_id FROM roles WHERE name = p_role_name LIMIT 1;
    SELECT id INTO v_module_id FROM modules WHERE name = p_module_name LIMIT 1;
    SELECT id INTO v_scope_id FROM scopes WHERE name = p_scope_name LIMIT 1;

    IF v_role_id IS NOT NULL AND v_module_id IS NOT NULL AND v_scope_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_id, action, allowed, scope_id, sidebar_visible)
        VALUES (v_role_id, v_module_id, p_action_name, true, v_scope_id, true)
        ON CONFLICT (role_id, module_id, action) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- RECRUITER PERMISSIONS
    PERFORM grant_permission_safely('recruiter', 'candidates', 'view', 'assigned');
    PERFORM grant_permission_safely('recruiter', 'jobs', 'view', 'assigned');
    PERFORM grant_permission_safely('recruiter', 'interviews', 'view', 'assigned');
    PERFORM grant_permission_safely('recruiter', 'submissions', 'view', 'assigned');
    PERFORM grant_permission_safely('recruiter', 'dashboard_parent', 'view', 'none');
    PERFORM grant_permission_safely('recruiter', 'upload_resume', 'view', 'none');
    PERFORM grant_permission_safely('recruiter', 'jd_matching', 'view', 'none');
    PERFORM grant_permission_safely('recruiter', 'boolean_search', 'view', 'none');
    PERFORM grant_permission_safely('recruiter', 'xray_search', 'view', 'none');

    -- TEAM LEAD PERMISSIONS
    PERFORM grant_permission_safely('team_lead', 'candidates', 'view', 'team');
    PERFORM grant_permission_safely('team_lead', 'jobs', 'view', 'team');
    PERFORM grant_permission_safely('team_lead', 'interviews', 'view', 'team');
    PERFORM grant_permission_safely('team_lead', 'submissions', 'view', 'team');
    PERFORM grant_permission_safely('team_lead', 'dashboard_parent', 'view', 'none');
    PERFORM grant_permission_safely('team_lead', 'team_kpis', 'view', 'team');
    PERFORM grant_permission_safely('team_lead', 'upload_resume', 'view', 'none');
    PERFORM grant_permission_safely('team_lead', 'jd_matching', 'view', 'none');

    -- MANAGER PERMISSIONS
    PERFORM grant_permission_safely('manager', 'candidates', 'view', 'organization');
    PERFORM grant_permission_safely('manager', 'jobs', 'view', 'organization');
    PERFORM grant_permission_safely('manager', 'interviews', 'view', 'organization');
    PERFORM grant_permission_safely('manager', 'submissions', 'view', 'organization');
    PERFORM grant_permission_safely('manager', 'clients', 'view', 'organization');
    PERFORM grant_permission_safely('manager', 'dashboard_parent', 'view', 'none');
    PERFORM grant_permission_safely('manager', 'team_kpis', 'view', 'organization');
    PERFORM grant_permission_safely('manager', 'analytics', 'view', 'organization');

    -- BDM PERMISSIONS
    PERFORM grant_permission_safely('bdm', 'clients', 'view', 'own');
    PERFORM grant_permission_safely('bdm', 'client_pipeline', 'view', 'own');
    PERFORM grant_permission_safely('bdm', 'jobs', 'view', 'assigned');
    PERFORM grant_permission_safely('bdm', 'dashboard_parent', 'view', 'none');
    PERFORM grant_permission_safely('bdm', 'analytics', 'view', 'own');

END $$;

DROP FUNCTION grant_permission_safely;

COMMIT;
