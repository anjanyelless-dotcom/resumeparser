import fs from "fs";
import path from "path";
import pool from "../database/db";

async function main() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error("Usage: npx ts-node scripts/apply_single_migration.ts <migration-filename>");
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, "../database/migrations", migrationFile);
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`Reading migration from: ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, "utf8");

  const client = await pool.connect();
  try {
    console.log(`Applying migration ${migrationFile}...`);
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
