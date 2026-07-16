import pool from "../database/db";

async function main() {
  const client = await pool.connect();
  try {
    console.log("Dropping all existing tables to start fresh...");
    await client.query("DROP SCHEMA public CASCADE;");
    await client.query("CREATE SCHEMA public;");
    await client.query("GRANT ALL ON SCHEMA public TO postgres;");
    await client.query("GRANT ALL ON SCHEMA public TO public;");
    console.log("Database reset successfully. It is now clean.");
  } catch (error) {
    console.error("Reset execution failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
