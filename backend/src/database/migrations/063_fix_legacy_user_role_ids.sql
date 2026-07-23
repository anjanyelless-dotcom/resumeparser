BEGIN;

-- Migrate any existing users who have a string 'role' but no 'role_id' yet
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.role::text = r.name::text
  AND u.role_id IS NULL;

-- As a strict fallback for anyone stuck without a role_id but has role='admin'
UPDATE users u
SET role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
WHERE u.role::text = 'admin' AND u.role_id IS NULL;

COMMIT;
