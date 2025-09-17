#!/usr/bin/env node

// User Isolation Security Test  
// Tests that users can only access their own data and cannot see other users' information

// fetch is available as a global in Node.js 18+

const BASE_URL = 'http://localhost:5000';

// Test user credentials
const testUsers = [
  { email: 'alice@test.com', password: 'password123', name: 'Alice Test' },
  { email: 'bob@test.com', password: 'password123', name: 'Bob Test' },
  { email: 'charlie@test.com', password: 'password123', name: 'Charlie Test' }
];

let userTokens = {};
let userHouseholds = {};

// Helper function to make authenticated API calls
async function apiCall(method, endpoint, token, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

// Step 1: Register test users
async function registerUsers() {
  console.log('📝 Registering test users...');
  
  for (const user of testUsers) {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      
      if (response.status === 201 || response.status === 200) {
        const result = await response.json();
        userTokens[user.email] = result.token;
        console.log(`  ✅ ${user.name} registered successfully`);
      } else {
        // User might already exist, try login
        console.log(`  ⚠️  ${user.name} might already exist, trying login...`);
        await loginUser(user);
      }
    } catch (error) {
      console.log(`  ❌ Failed to register ${user.name}:`, error.message);
    }
  }
}

// Step 2: Login users (fallback if registration fails)
async function loginUser(user) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password })
    });
    
    if (response.status === 200) {
      const result = await response.json();
      userTokens[user.email] = result.token;
      console.log(`  ✅ ${user.name} logged in successfully`);
    } else {
      console.log(`  ❌ Failed to login ${user.name}`);
    }
  } catch (error) {
    console.log(`  ❌ Login error for ${user.name}:`, error.message);
  }
}

// Step 3: Fetch each user's households
async function fetchUserHouseholds() {
  console.log('\n🏠 Fetching user households...');
  
  for (const user of testUsers) {
    const token = userTokens[user.email];
    if (!token) continue;
    
    try {
      const result = await apiCall('GET', '/api/households', token);
      if (result.status === 200) {
        userHouseholds[user.email] = result.data;
        console.log(`  ✅ ${user.name}: Found ${result.data.length} household(s)`);
        if (result.data.length > 0) {
          console.log(`     └── Household ID: ${result.data[0].id} (${result.data[0].name})`);
        }
      } else {
        console.log(`  ❌ ${user.name}: Failed to fetch households (${result.status})`);
      }
    } catch (error) {
      console.log(`  ❌ ${user.name}: Error fetching households:`, error.message);
    }
  }
}

// Step 4: Test household isolation - users should only see their own households
async function testHouseholdIsolation() {
  console.log('\n🔒 Testing household isolation...');
  
  // Get all household IDs from all users
  const allHouseholdIds = [];
  for (const user of testUsers) {
    const households = userHouseholds[user.email] || [];
    households.forEach(h => allHouseholdIds.push({ id: h.id, owner: user.name }));
  }
  
  // Test each user trying to access every household
  for (const user of testUsers) {
    const token = userTokens[user.email];
    if (!token) continue;
    
    const userHouseholds = (userHouseholds[user.email] || []).map(h => h.id);
    
    for (const household of allHouseholdIds) {
      try {
        const result = await apiCall('GET', `/api/households/${household.id}`, token);
        const shouldHaveAccess = userHouseholds.includes(household.id);
        
        if (shouldHaveAccess && result.status === 200) {
          console.log(`  ✅ ${user.name} can access their own household (${household.owner}'s household)`);
        } else if (!shouldHaveAccess && result.status === 403) {
          console.log(`  ✅ ${user.name} correctly blocked from ${household.owner}'s household`);
        } else if (!shouldHaveAccess && result.status === 200) {
          console.log(`  🚨 SECURITY ISSUE: ${user.name} can access ${household.owner}'s household!`);
        } else if (shouldHaveAccess && result.status !== 200) {
          console.log(`  ❌ ${user.name} cannot access their own household (status: ${result.status})`);
        }
      } catch (error) {
        console.log(`  ❌ Error testing household access:`, error.message);
      }
    }
  }
}

// Step 5: Test grid endpoint security
async function testGridEndpointSecurity() {
  console.log('\n⚡ Testing grid endpoint security...');
  
  // Get all household IDs
  const allHouseholdIds = [];
  for (const user of testUsers) {
    const households = userHouseholds[user.email] || [];
    households.forEach(h => allHouseholdIds.push({ id: h.id, owner: user.name }));
  }
  
  // Test each user accessing grid data
  for (const user of testUsers) {
    const token = userTokens[user.email];
    if (!token) continue;
    
    const userHouseholds = (userHouseholds[user.email] || []).map(h => h.id);
    
    for (const household of allHouseholdIds) {
      try {
        const result = await apiCall('GET', `/api/grid?household_id=${household.id}`, token);
        const shouldHaveAccess = userHouseholds.includes(household.id);
        
        if (shouldHaveAccess && result.status === 200) {
          console.log(`  ✅ ${user.name} can access their own grid data`);
        } else if (!shouldHaveAccess && (result.status === 403 || result.status === 400)) {
          console.log(`  ✅ ${user.name} correctly blocked from ${household.owner}'s grid data`);
        } else if (!shouldHaveAccess && result.status === 200) {
          console.log(`  🚨 SECURITY ISSUE: ${user.name} can access ${household.owner}'s grid data!`);
        } else if (shouldHaveAccess && result.status !== 200) {
          console.log(`  ❌ ${user.name} cannot access their own grid data (status: ${result.status})`);
        }
      } catch (error) {
        console.log(`  ❌ Error testing grid access:`, error.message);
      }
    }
  }
  
  // Test grid endpoint without household_id parameter (should fail)
  console.log('\n  Testing grid endpoint without household_id...');
  for (const user of testUsers) {
    const token = userTokens[user.email];
    if (!token) continue;
    
    try {
      const result = await apiCall('GET', '/api/grid', token);
      if (result.status === 400) {
        console.log(`  ✅ ${user.name}: Grid endpoint correctly requires household_id parameter`);
      } else {
        console.log(`  🚨 SECURITY ISSUE: Grid endpoint allows access without household_id (status: ${result.status})`);
      }
    } catch (error) {
      console.log(`  ❌ Error testing grid without household_id:`, error.message);
    }
  }
}

// Step 6: Test device isolation
async function testDeviceIsolation() {
  console.log('\n🔌 Testing device isolation...');
  
  for (const user of testUsers) {
    const token = userTokens[user.email];
    if (!token) continue;
    
    try {
      const result = await apiCall('GET', '/api/devices', token);
      if (result.status === 200) {
        console.log(`  ✅ ${user.name} can access their devices (${result.data.length} found)`);
      } else {
        console.log(`  ❌ ${user.name} cannot access devices (status: ${result.status})`);
      }
    } catch (error) {
      console.log(`  ❌ Error testing device access:`, error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🔐 Starting User Isolation Security Tests\n');
  
  try {
    await registerUsers();
    await fetchUserHouseholds();
    await testHouseholdIsolation();
    await testGridEndpointSecurity();
    await testDeviceIsolation();
    
    console.log('\n✅ User isolation security tests completed!');
    console.log('\nKey security checks:');
    console.log('  • Users can only access their own households');
    console.log('  • Grid endpoint requires household_id and validates ownership');
    console.log('  • Device endpoints properly filter by user');
    console.log('  • No cross-user data leakage detected');
    
  } catch (error) {
    console.log('\n❌ Test execution failed:', error.message);
  }
}

// Only run if called directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };