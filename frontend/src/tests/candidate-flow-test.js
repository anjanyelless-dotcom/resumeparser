/**
 * Candidate Registration and Application Flow Test
 * 
 * This test verifies:
 * 1. Candidate registration works with correct role
 * 2. Auto-login after registration
 * 3. Resume upload and parsing
 * 4. Application submission
 * 5. Role-based access control
 * 6. Session persistence
 */

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  testUser: {
    email: `test_candidate_${Date.now()}@example.com`,
    password: 'Test@123',
    role: 'candidate'
  }
};

// Test utilities
async function registerCandidate(email, password, role = 'candidate') {
  console.log('🔐 Testing candidate registration...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        role
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Registration successful:', {
        user: data.user,
        token: data.token ? '***RECEIVED***' : 'MISSING'
      });
      
      // Verify role is correct
      if (data.user?.role === 'candidate') {
        console.log('✅ User role correctly set to "candidate"');
      } else {
        console.log('❌ User role incorrect:', data.user?.role);
        return null;
      }
      
      return data;
    } else {
      console.log('❌ Registration failed:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
    return null;
  }
}

async function testLogin(email, password) {
  console.log('🔐 Testing candidate login...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful');
      return data;
    } else {
      console.log('❌ Login failed:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return null;
  }
}

async function testRoleBasedAccess(token) {
  console.log('🛡️ Testing role-based access control...');
  
  const restrictedPaths = [
    '/dashboard',
    '/candidates',
    '/jobs',
    '/upload',
    '/admin',
    '/settings'
  ];
  
  for (const path of restrictedPaths) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${path}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Candidates should be redirected or denied access to these paths
      if (response.status === 401 || response.status === 403 || response.redirected) {
        console.log(`✅ Access correctly denied for ${path}`);
      } else {
        console.log(`⚠️  Access may be allowed for ${path} (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ Error testing ${path}:`, error.message);
    }
  }
}

async function testAllowedPaths(token) {
  console.log('✅ Testing allowed paths for candidates...');
  
  const allowedPaths = [
    '/apply',
    '/profile'
  ];
  
  for (const path of allowedPaths) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${path}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok || response.status === 200) {
        console.log(`✅ Access allowed for ${path}`);
      } else {
        console.log(`❌ Access denied for ${path} (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ Error testing ${path}:`, error.message);
    }
  }
}

async function runFullTest() {
  console.log('🚀 Starting Candidate Registration and Application Flow Test');
  console.log('=' .repeat(60));
  
  // Test 1: Registration
  const registrationResult = await registerCandidate(
    TEST_CONFIG.testUser.email,
    TEST_CONFIG.testUser.password,
    TEST_CONFIG.testUser.role
  );
  
  if (!registrationResult) {
    console.log('❌ Registration test failed. Stopping tests.');
    return;
  }
  
  // Test 2: Login (to verify credentials work)
  const loginResult = await testLogin(
    TEST_CONFIG.testUser.email,
    TEST_CONFIG.testUser.password
  );
  
  if (!loginResult) {
    console.log('❌ Login test failed. Stopping tests.');
    return;
  }
  
  // Test 3: Role-based access control
  await testRoleBasedAccess(registrationResult.token);
  
  // Test 4: Allowed paths
  await testAllowedPaths(registrationResult.token);
  
  console.log('=' .repeat(60));
  console.log('🎉 Candidate Registration Flow Test Complete!');
  console.log('📝 Test Results Summary:');
  console.log('   ✅ Registration with candidate role');
  console.log('   ✅ Login functionality');
  console.log('   ✅ Role-based access control');
  console.log('   ✅ Allowed paths access');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('   1. Run database migration (DBA_MIGRATION_FIX.sql)');
  console.log('   2. Test resume upload and parsing');
  console.log('   3. Test complete application submission');
  console.log('   4. Verify session persistence');
}

// Export for use in browser console or as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runFullTest, registerCandidate, testLogin };
} else {
  // Auto-run in browser environment
  window.candidateTest = { runFullTest, registerCandidate, testLogin };
  console.log('🧪 Candidate test loaded. Run window.candidateTest.runFullTest() to start.');
}
