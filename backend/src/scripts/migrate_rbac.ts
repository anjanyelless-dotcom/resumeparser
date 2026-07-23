import fs from 'fs';
import path from 'path';
import pool from '../database/db';

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../database/migrations/enterprise_rbac.sql');
    const seedPath = path.join(__dirname, '../database/seeds/enterprise_rbac_seed.sql');
    
    console.log('Reading migration file...');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Reading seed file...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    
    console.log('Executing migration...');
    await pool.query(migrationSql);
    console.log('Migration executed successfully.');
    
    console.log('Executing seed...');
    await pool.query(seedSql);
    console.log('Seed executed successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  }
}

runMigration();
