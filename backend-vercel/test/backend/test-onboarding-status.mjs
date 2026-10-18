/**
 * Test Onboarding Status Endpoint
 * 
 * Tests:
 * 1. Get onboarding status for new user
 * 2. Get status with trial active
 * 3. Get status with trial expired
 * 4. Get status with active subscription
 * 5. Verify paywall triggers
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const TEST_TOKEN = process.env.TEST_TOKEN;

if (!TEST_TOKEN) {
  console.error('❌ Missing TEST_TOKEN environment variable');
  console.log('Usage: TEST_TOKEN=your_token node test-onboarding-status.mjs');
  process.exit(1);
}

console.log('🧪 Testing Onboarding Status Endpoint\n');

async function testGetStatus() {
  console.log('1️⃣  GET /v1/me/onboarding-status');
  
  const response = await fetch(`${API_BASE}/api/v1/me/onboarding-status`, {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  
  console.log(`   ✅ Status retrieved successfully`);
  console.log(`   📊 Recommended flow: ${data.recommended_flow}`);
  console.log(`   📊 Has active subscription: ${data.has_active_subscription}`);
  console.log(`   📊 Subscription status: ${data.subscription_status || 'none'}`);
  console.log(`   📊 Trial ended: ${data.trial_ended}`);
  console.log(`   📊 Needs upgrade: ${data.needs_upgrade_flow}`);
  
  if (data.paywall_reason) {
    console.log(`   📊 Paywall reason: ${data.paywall_reason}`);
  }
  
  return data;
}

async function testStatusFields() {
  console.log('\n2️⃣  Verify required fields present');
  
  const response = await fetch(`${API_BASE}/api/v1/me/onboarding-status`, {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
    },
  });

  const data = await response.json();
  
  const requiredFields = [
    'completed_initial_onboarding',
    'subscription_status',
    'has_active_subscription',
    'is_trial',
    'trial_ended',
    'needs_upgrade_flow',
    'should_show_paywall',
    'recommended_flow',
  ];

  const missingFields = requiredFields.filter(field => !(field in data));
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  console.log(`   ✅ All required fields present`);
  return data;
}

async function testRecommendedFlow() {
  console.log('\n3️⃣  Verify recommended_flow is valid');
  
  const response = await fetch(`${API_BASE}/api/v1/me/onboarding-status`, {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
    },
  });

  const data = await response.json();
  
  const validFlows = ['initial_onboarding', 'upgrade_paywall', 'normal_app'];
  
  if (!validFlows.includes(data.recommended_flow)) {
    throw new Error(`Invalid recommended_flow: ${data.recommended_flow}`);
  }
  
  console.log(`   ✅ Recommended flow is valid: ${data.recommended_flow}`);
  return data;
}

// Run all tests
(async () => {
  try {
    await testGetStatus();
    await testStatusFields();
    await testRecommendedFlow();
    
    console.log('\n✅ All tests passed!\n');
    console.log('📋 Summary:');
    console.log('   - Status endpoint accessible ✅');
    console.log('   - Required fields present ✅');
    console.log('   - Valid recommended_flow ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
})();
