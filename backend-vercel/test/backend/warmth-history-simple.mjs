/**
 * Simple Warmth History Test - uses existing contact
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = 'https://backend-vercel-frtosu7js-isaiahduprees-projects.vercel.app';
const EXISTING_CONTACT_ID = '37691c10-99f1-47b-8b50-3121bea3df3f'; // From manual insert

async function test() {
  console.log('Getting access token...');
  const token = await getAccessToken();
  console.log('Token acquired');
  
  console.log('\n1. Testing GET /api/v1/contacts/:id/warmth-history...');
  const historyResponse = await fetch(`${API_BASE}/api/v1/contacts/${EXISTING_CONTACT_ID}/warmth-history?window=30d`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  console.log('Status:', historyResponse.status);
  if (historyResponse.ok) {
    const historyData = await historyResponse.json();
    console.log('✅ Primary endpoint works!');
    console.log('  Items:', historyData.items?.length || 0);
    console.log('  Current score:', historyData.current?.score);
  } else {
    console.log('❌ Primary endpoint failed');
    const error = await historyResponse.text();
    console.log('  Error:', error);
  }
  
  console.log('\n2. Testing GET /api/v1/contacts/:id/warmth/history (legacy)...');
  const legacyResponse = await fetch(`${API_BASE}/api/v1/contacts/${EXISTING_CONTACT_ID}/warmth/history?limit=30`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  console.log('Status:', legacyResponse.status);
  if (legacyResponse.ok) {
    const legacyData = await legacyResponse.json();
    console.log('✅ Legacy endpoint works!');
    console.log('  Items:', legacyData.history?.length || 0);
  } else {
    console.log('❌ Legacy endpoint failed');
    const error = await legacyResponse.text();
    console.log('  Error:', error);
  }
  
  console.log('\n3. Testing GET /api/v1/contacts/:id/warmth (current)...');
  const currentResponse = await fetch(`${API_BASE}/api/v1/contacts/${EXISTING_CONTACT_ID}/warmth`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  console.log('Status:', currentResponse.status);
  if (currentResponse.ok) {
    const currentData = await currentResponse.json();
    console.log('✅ Current warmth endpoint works!');
    console.log('  Warmth:', currentData.warmth);
    console.log('  Band:', currentData.warmth_band);
  } else {
    console.log('❌ Current warmth endpoint failed');
    const error = await currentResponse.text();
    console.log('  Error:', error);
  }
}

test().catch(console.error);
