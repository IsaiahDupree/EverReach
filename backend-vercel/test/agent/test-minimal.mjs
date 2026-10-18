/**
 * Minimal test to debug auth issue
 */

import { setupTestUser, API_BASE_URL, makeAuthRequest } from './_shared.mjs';

console.log('Starting minimal test...\n');

try {
  console.log('Step 1: Setting up test user...');
  const { token, userId } = await setupTestUser();
  
  console.log('✅ Authentication successful!');
  console.log(`User ID: ${userId}`);
  console.log(`Token (first 50 chars): ${token.substring(0, 50)}...\n`);
  
  console.log('Step 2: Testing feature requests endpoint...');
  const endpoint = `${API_BASE_URL}/api/v1/feature-requests`;
  console.log(`Endpoint: ${endpoint}`);
  
  const response = await makeAuthRequest(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  console.log('✅ API call successful!');
  console.log(`Response type: ${Array.isArray(response) ? 'Array' : typeof response}`);
  console.log(`Response: ${JSON.stringify(response).substring(0, 200)}...\n`);
  
  console.log('✅ All tests passed!');
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Test failed:');
  console.error(`Error: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
  process.exit(1);
}
