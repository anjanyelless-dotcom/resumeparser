import pool from "../database/db";

async function main() {
  const client = await pool.connect();
  try {
    const tables = ["skills", "candidate_skills", "work_history", "work_experience"];
    for (const table of tables) {
      console.log(`=== TABLE: ${table} ===`);
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      for (const col of columnsResult.rows) {
        console.log(`- ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      }
      console.log("");
    }
  } catch (error) {
    console.error("DB check failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
