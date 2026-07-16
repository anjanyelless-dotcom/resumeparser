import pool from "../database/db";

async function main() {
  const client = await pool.connect();
  try {
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log("=== TABLES FOUND ===");
    for (const row of tablesResult.rows) {
      console.log(`- ${row.table_name}`);
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
      `, [row.table_name]);
      for (const col of columnsResult.rows) {
        console.log(`    * ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      }
    }
  } catch (error) {
    console.error("DB check failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
