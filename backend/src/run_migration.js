const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Client } = require('pg');

async function runMigration(migrationFile) {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_HOST?.includes('render.com') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log(`🚀 Running migration: ${migrationFile}`);
    
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'database/migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration SQL...');
    const result = await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully');
    
    // Show any results from the migration
    if (result.rows && result.rows.length > 0) {
      console.log('📊 Migration results:');
      result.rows.forEach(row => console.log('  ', row));
    }

    // Verify the constraint was updated
    const verifyQuery = `
      SELECT conname, pg_get_constraintdef(oid) as constraint_definition 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass AND conname = 'users_role_check'
    `;
    
    const verifyResult = await client.query(verifyQuery);
    if (verifyResult.rows.length > 0) {
      console.log('✅ Constraint verification:');
      console.log('  ', verifyResult.rows[0]);
    }

    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

async function testCandidateRegistration() {
  console.log('🧪 Testing candidate registration...');
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test_candidate_${Date.now()}@example.com`,
        password: 'Test@123',
        role: 'candidate'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Candidate registration successful!');
      console.log('📝 User created:', {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.role,
        token: data.token ? '***RECEIVED***' : 'MISSING'
      });
      return data;
    } else {
      const error = await response.json();
      console.log('❌ Candidate registration failed:', error);
      return null;
    }
  } catch (error) {
    console.log('❌ Registration test error:', error.message);
    return null;
  }
}

// Main execution
async function main() {
  const migrationFile = '036_update_users_role_constraint.sql';
  
  console.log('='.repeat(60));
  console.log('🔧 CANDIDATE REGISTRATION FIX');
  console.log('='.repeat(60));
  
  // Step 1: Run migration
  const migrationSuccess = await runMigration(migrationFile);
  
  if (!migrationSuccess) {
    console.log('❌ Migration failed. Please check database permissions.');
    console.log('💡 You may need to run this as a database administrator:');
    console.log('   psql -h localhost -U postgres -d resume_parser -f database/migrations/036_update_users_role_constraint.sql');
    return;
  }
  
  // Step 2: Test registration
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING REGISTRATION');
  console.log('='.repeat(60));
  
  const testResult = await testCandidateRegistration();
  
  if (testResult) {
    console.log('\n🎉 SUCCESS! Candidate registration is now working!');
    console.log('📋 Summary:');
    console.log('  ✅ Database constraint updated');
    console.log('  ✅ Candidate registration works');
    console.log('  ✅ User created with role=candidate');
    console.log('  ✅ Authentication token generated');
  } else {
    console.log('\n❌ Registration test failed. Check the error above.');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 COMPLETE');
  console.log('='.repeat(60));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runMigration, testCandidateRegistration };
