/**
 * Test User Profile Picture Upload/Removal
 * 
 * Tests:
 * 1. Get current user profile
 * 2. Update avatar_url
 * 3. Verify avatar_url is set
 * 4. Remove avatar_url (set to null)
 * 5. Verify avatar_url is null
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const TEST_TOKEN = process.env.TEST_TOKEN;

if (!TEST_TOKEN) {
  console.error('❌ Missing TEST_TOKEN environment variable');
  console.log('Usage: TEST_TOKEN=your_token node test-user-profile-picture.mjs');
  process.exit(1);
}

console.log('🧪 Testing User Profile Picture API\n');

async function testGetProfile() {
  console.log('1️⃣  GET /v1/me - Get current profile');
  
  const response = await fetch(`${API_BASE}/api/v1/me`, {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get profile: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  console.log(`   ✅ Current avatar_url: ${data.user.avatar_url || '(not set)'}`);
  return data.user;
}

async function testUpdateAvatar(avatarPath) {
  console.log('\n2️⃣  PATCH /v1/me - Set avatar_url');
  
  const response = await fetch(`${API_BASE}/api/v1/me`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ avatar_url: avatarPath }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update avatar: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  
  if (data.user.avatar_url !== avatarPath) {
    throw new Error(`Avatar not updated correctly. Expected: ${avatarPath}, Got: ${data.user.avatar_url}`);
  }
  
  console.log(`   ✅ Avatar set to: ${data.user.avatar_url}`);
  return data.user;
}

async function testRemoveAvatar() {
  console.log('\n3️⃣  PATCH /v1/me - Remove avatar (set to null)');
  
  const response = await fetch(`${API_BASE}/api/v1/me`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ avatar_url: null }),
  });

  if (!response.ok) {
    throw new Error(`Failed to remove avatar: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  
  if (data.user.avatar_url !== null) {
    throw new Error(`Avatar not removed. Expected: null, Got: ${data.user.avatar_url}`);
  }
  
  console.log(`   ✅ Avatar removed (set to null)`);
  return data.user;
}

async function testVerifyRemoval() {
  console.log('\n4️⃣  GET /v1/me - Verify avatar is null');
  
  const response = await fetch(`${API_BASE}/api/v1/me`, {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to verify removal: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  
  if (data.user.avatar_url !== null) {
    throw new Error(`Avatar still set. Expected: null, Got: ${data.user.avatar_url}`);
  }
  
  console.log(`   ✅ Verified: avatar_url is null`);
  return data.user;
}

// Run all tests
(async () => {
  try {
    // Get initial state
    const initialUser = await testGetProfile();
    
    // Test setting avatar
    const testPath = `users/${initialUser.id}/profile/test-avatar-${Date.now()}.png`;
    await testUpdateAvatar(testPath);
    
    // Test removing avatar
    await testRemoveAvatar();
    
    // Verify removal persisted
    await testVerifyRemoval();
    
    console.log('\n✅ All tests passed!\n');
    console.log('📋 Summary:');
    console.log('   - User profile endpoint supports avatar_url ✅');
    console.log('   - Can set avatar_url via PATCH ✅');
    console.log('   - Can remove avatar_url by setting to null ✅');
    console.log('   - Changes persist across GET requests ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
})();
