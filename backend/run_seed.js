const { Pool } = require('pg');
require('dotenv').config({ path: './src/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function clearDatabase() {
  const tables = [
    'client_communications',
    'submissions',
    'job_recruiter_assignments',
    'candidate_skills',
    'education',
    'work_history',
    'job_descriptions',
    'clients',
    'client_contacts',
    'candidates',
    'skills',
    'users'
  ];

  console.log('🧹 Clearing existing data...');
  
  for (const table of tables) {
    try {
      await pool.query(`DELETE FROM ${table}`);
      console.log(`   ✅ Cleared ${table}`);
    } catch (err) {
      console.log(`   ⚠️  Skipped ${table}: ${err.message}`);
    }
  }
}

async function runSeedData() {
  const fs = require('fs');
  const path = require('path');

  try {
    // Clear existing data first
    await clearDatabase();
    console.log('');

    console.log('🌱 Starting seed data insertion...');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`👤 User: ${process.env.DB_USER}`);

    // Read the seed data file
    const seedDataPath = path.join(__dirname, 'src/database/seed_data.sql');
    const seedData = fs.readFileSync(seedDataPath, 'utf8');

    // Execute the entire file as a single batch
    console.log(`📝 Executing seed data file...`);

    try {
      await pool.query(seedData);
      console.log(`✅ Seed data inserted successfully!`);
    } catch (err) {
      console.error(`❌ Error executing seed data: ${err.message}`);
    }

    // Display summary
    const summary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM skills) as skills,
        (SELECT COUNT(*) FROM clients) as clients,
        (SELECT COUNT(*) FROM candidates) as candidates,
        (SELECT COUNT(*) FROM job_descriptions) as jobs,
        (SELECT COUNT(*) FROM submissions) as submissions
    `);

    if (summary.rows.length > 0) {
      const row = summary.rows[0];
      console.log(`\n📊 Current Data Summary:`);
      console.log(`   👤 Users: ${row.users}`);
      console.log(`   🔧 Skills: ${row.skills}`);
      console.log(`   🏢 Clients: ${row.clients}`);
      console.log(`   👥 Candidates: ${row.candidates}`);
      console.log(`   💼 Jobs: ${row.jobs}`);
      console.log(`   📋 Submissions: ${row.submissions}`);
    }

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeedData();