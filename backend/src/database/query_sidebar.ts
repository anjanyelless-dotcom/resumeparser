import pool from "./db";

async function main() {
  const res = await pool.query("SELECT name, display_name, route FROM sidebar_modules WHERE is_active=true ORDER BY sort_order;");
  console.table(res.rows);
  process.exit(0);
}
main();
