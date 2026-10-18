/**
 * Debug authentication issue
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = 'https://backend-vercel-frtosu7js-isaiahduprees-projects.vercel.app';

async function test() {
  console.log('Getting access token...');
  const token = await getAccessToken();
  console.log('Token:', token.substring(0, 50) + '...');
  
  console.log('\nTesting GET /api/v1/me...');
  const meResponse = await fetch(`${API_BASE}/api/v1/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  console.log('Status:', meResponse.status);
  const meData = await meResponse.json();
  console.log('Response:', JSON.stringify(meData, null, 2));
  
  console.log('\nTesting POST /api/v1/contacts...');
  const contactResponse = await fetch(`${API_BASE}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      display_name: 'Debug Test Contact',
    }),
  });
  console.log('Status:', contactResponse.status);
  const contactData = await contactResponse.json();
  console.log('Response:', JSON.stringify(contactData, null, 2));
}

test().catch(console.error);
