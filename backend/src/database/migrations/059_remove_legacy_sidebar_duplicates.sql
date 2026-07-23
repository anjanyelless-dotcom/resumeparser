BEGIN;

-- Remove legacy root sidebar items that conflict with the unified enterprise RBAC structure
DELETE FROM sidebar_modules WHERE name IN ('client_management', 'reports_analytics', 'dashboard_parent', 'settings_admin');

-- Remove any other legacy items that were replaced by the unified migration (if any exist without parents)
-- We only want the 11 official root modules defined in 057.
DELETE FROM sidebar_modules 
WHERE parent_id IS NULL 
AND name NOT IN (
    'dashboard', 
    'recruitment', 
    'job_management', 
    'client_mgmt', 
    'hiring_process', 
    'activities', 
    'reports', 
    'user_management', 
    'settings', 
    'ai_tools', 
    'administration'
);

COMMIT;
