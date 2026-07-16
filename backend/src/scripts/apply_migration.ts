import fs from "fs";
import path from "path";
import pool from "../database/db";

async function main() {
  const migrationPath = path.join(__dirname, "../database/migrations/010_schema_additions.sql");
  console.log(`Reading migration from: ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, "utf8");

  const client = await pool.connect();
  try {
    console.log("Applying schema additions...");
    await client.query(sql);
    console.log("Migration applied successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
