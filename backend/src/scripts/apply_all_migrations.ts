import fs from "fs";
import path from "path";
import pool from "../database/db";

async function main() {
  const migrationsDir = path.join(__dirname, "../database/migrations");
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found at: ${migrationsDir}`);
    process.exit(1);
  }

  // Get and sort migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files.`);

  const client = await pool.connect();
  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get list of already applied migrations
    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const appliedMigrations = new Set(rows.map(r => r.version));

    // Seeding logic: If tracker is empty but tables exist, mark current files as applied
    if (appliedMigrations.size === 0) {
      const checkResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'alembic_version'
        );
      `);
      if (checkResult.rows[0].exists) {
        console.log("Existing database detected. Seeding migration tracker to prevent re-running scripts...");
        for (const file of files) {
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
          appliedMigrations.add(file);
        }
        console.log("Migration tracker seeded successfully. No new migrations need to be applied.");
        return; // We can exit early since all current files are now marked as applied
      }
    }

    let appliedCount = 0;

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        // console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      console.log(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(filePath, "utf8");
      
      try {
        // Execute migration
        await client.query(sql);
        
        // Reset search_path to public in case the migration script cleared it (e.g. pg_dump sets it to '')
        await client.query("SET search_path TO public;");
        
        await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1)', [file]);
        console.log(`Successfully applied: ${file}`);
        appliedCount++;
      } catch (err) {
        throw err;
      }
    }
    
    if (appliedCount === 0) {
      console.log("All migrations are already up to date. Nothing to apply.");
    } else {
      console.log(`Successfully applied ${appliedCount} new migrations.`);
    }
  } catch (error) {
    console.error("Migration execution failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
