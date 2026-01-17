/**
 * Test script for warmth time advance endpoint
 * Simulates passage of time for all contacts
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';

async function main() {
  console.log('\n🕐 Warmth Time Advance Test');
  console.log('==========================================\n');

  const token = await getAccessToken();

  // Test 1: Advance by 1 day
  console.log('📊 TEST 1: Advance time by 1 day');
  console.log('------------------------------------------');
  
  const res1 = await fetch(`${API_BASE}/api/v1/ops/warmth/advance-time`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ days: 1 }),
  });

  const result1 = await res1.json();
  
  if (res1.ok && result1.success) {
    console.log('✅ Time advanced successfully');
    console.log(`   Days advanced: ${result1.days_advanced}`);
    console.log(`   Contacts updated: ${result1.contacts_updated}`);
    console.log(`   Warmth scores recomputed: ${result1.warmth_recomputed}`);
    console.log(`   ${result1.message}`);
  } else {
    console.log('❌ Failed to advance time');
    console.log('   Response:', result1);
  }

  console.log('\n📊 TEST 2: Advance by 7 days');
  console.log('------------------------------------------');
  console.log('⚠️  To run this test, uncomment the code below');
  console.log('⚠️  WARNING: This will age all contacts by 7 days!');
  
  /*
  const res2 = await fetch(`${API_BASE}/api/v1/ops/warmth/advance-time`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ days: 7 }),
  });

  const result2 = await res2.json();
  console.log('Result:', result2);
  */

  console.log('\n📋 USAGE EXAMPLES');
  console.log('==========================================');
  console.log('# Advance by 1 day (default):');
  console.log('POST /api/v1/ops/warmth/advance-time');
  console.log('Body: { "days": 1 }');
  console.log('');
  console.log('# Advance by 30 days:');
  console.log('POST /api/v1/ops/warmth/advance-time');
  console.log('Body: { "days": 30 }');
  console.log('');
  console.log('# Using curl:');
  console.log(`curl -X POST ${API_BASE}/api/v1/ops/warmth/advance-time \\`);
  console.log(`  -H "Authorization: Bearer YOUR_TOKEN" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"days": 1}'`);

  console.log('\n✅ Test complete!\n');
}

main().catch(err => {
  console.error('❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
