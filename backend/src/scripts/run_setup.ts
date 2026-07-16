import fs from "fs";
import path from "path";
import pool from "../database/db";

async function main() {
  const setupFilePath = path.join(__dirname, "../database/setup.sql");
  
  if (!fs.existsSync(setupFilePath)) {
    console.error(`setup.sql not found at: ${setupFilePath}`);
    process.exit(1);
  }

  console.log(`Found setup.sql, reading file...`);
  const sql = fs.readFileSync(setupFilePath, "utf8");

  const client = await pool.connect();
  try {
    console.log("Applying setup.sql...");
    await client.query(sql);
    console.log("Successfully created base tables from setup.sql");
  } catch (error) {
    console.error("Setup execution failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
