const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'resume_parser',
  password: 'Surya@123',
  port: 5432,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Fixing Admin permissions...');

    // Ensure action 'review' exists
    await client.query(`INSERT INTO actions (name, display_name) VALUES ('review', 'Review') ON CONFLICT DO NOTHING;`);

    // Ensure module 'submissions' exists
    await client.query(`INSERT INTO modules (name, display_name) VALUES ('submissions', 'Submissions') ON CONFLICT DO NOTHING;`);

    // Debug
    const roles = await client.query(`SELECT id, name FROM roles WHERE name ILIKE 'admin'`);
    console.log('Roles:', roles.rows);
    const mods = await client.query(`SELECT id, name FROM modules WHERE name = 'submissions'`);
    console.log('Modules:', mods.rows);
    const acts = await client.query(`SELECT id, name FROM actions WHERE name = 'review'`);
    console.log('Actions:', acts.rows);
    const scopes = await client.query(`SELECT id, name FROM scopes WHERE name = 'all'`);
    console.log('Scopes:', scopes.rows);

    // Grant 'submissions:review' to Admin
    const res = await client.query(`
      INSERT INTO role_permissions (role_id, module_id, action, allowed, scope_id, sidebar_visible)
      SELECT r.id, m.id, a.name, true, s.id, true
      FROM roles r
      CROSS JOIN modules m
      CROSS JOIN actions a
      CROSS JOIN scopes s
      WHERE r.name ILIKE 'admin' 
        AND m.name = 'submissions' 
        AND a.name = 'review'
        AND s.name = 'all'
      ON CONFLICT (role_id, module_id, action) DO UPDATE SET allowed = true;
    `);

    console.log(`Updated ${res.rowCount} rows.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
