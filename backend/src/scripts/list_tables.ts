import pool from "../database/db";

async function main() {
  const client = await pool.connect();
  try {
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log("=== TABLES IN DB ===");
    for (const row of tablesResult.rows) {
      console.log(row.table_name);
    }
  } catch (error) {
    console.error("DB check failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
