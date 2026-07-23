const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'resume_parser',
  password: 'Surya@123',
  port: 5432,
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT name, display_name, parent_id, sort_order FROM sidebar_modules WHERE is_active = true ORDER BY sort_order");
    console.table(res.rows);
  } finally {
    client.release();
    pool.end();
  }
}
main();
