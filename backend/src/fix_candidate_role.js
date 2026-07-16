const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Client } = require('pg');

async function fixCandidateRoleConstraint() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_HOST?.includes('render.com') ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Check current constraint
    console.log('🔍 Checking current constraint...');
    const constraintCheck = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as consrc 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass AND contype = 'c' AND conname LIKE '%role%'
    `);
    
    console.log('Current role constraints:', constraintCheck.rows);

    // Drop existing constraint
    console.log('🗑️  Dropping existing constraint...');
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    console.log('✅ Existing constraint dropped');

    // Add new constraint with candidate role
    console.log('➕ Adding new constraint with candidate role...');
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'recruiter', 'team_lead', 'client_manager', 'bdm', 'viewer', 'candidate'))
    `);
    console.log('✅ New constraint added successfully');

    // Verify the constraint
    console.log('🔍 Verifying new constraint...');
    const verifyCheck = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as consrc 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass AND contype = 'c' AND conname = 'users_role_check'
    `);
    
    console.log('✅ Updated constraint:', verifyCheck.rows);
    console.log('🎉 Candidate role constraint fixed successfully!');
    console.log('📝 Now candidates can register with role="candidate"');

  } catch (error) {
    console.error('❌ Error fixing constraint:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixCandidateRoleConstraint();
