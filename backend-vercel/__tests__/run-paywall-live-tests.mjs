/**
 * Simple Test Runner for Live Paywall Configuration API
 * Run: node __tests__/run-paywall-live-tests.mjs
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment
config({ path: join(__dirname, '../.env.test') });

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ever-reach-be.vercel.app';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN;

if (!TEST_TOKEN) {
  console.error('❌ TEST_AUTH_TOKEN not found in .env.test');
  process.exit(1);
}

// Test helpers
let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function request(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BACKEND_URL}${path}`, options);
  const text = await response.text();
  let data;
  
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { error: 'Invalid JSON response', body: text };
  }
  
  return { response, data };
}

// Run tests
console.log('🧪 Running Live Paywall Configuration Tests...\n');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`Token: ${TEST_TOKEN.substring(0, 20)}...\n`);

async function runTests() {
  
  // Test 1: POST - Set live paywall for iOS
  await test('POST - Set live paywall for iOS', async () => {
    const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
      platform: 'ios',
      paywall_id: 'test_ios_paywall',
      provider: 'custom',
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.success === true, 'Expected success: true');
    assert(data.platform === 'ios', 'Expected platform: ios');
    assert(data.paywall_id === 'test_ios_paywall', 'Expected paywall_id: test_ios_paywall');
  });

  // Test 2: GET - Get live paywall for iOS
  await test('GET - Get live paywall for iOS', async () => {
    const { response, data } = await request('GET', '/api/v1/config/paywall-live?platform=ios');

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.platform === 'ios', 'Expected platform: ios');
    assert(data.paywall_id === 'test_ios_paywall', 'Expected paywall_id from previous test');
  });

  // Test 3: POST - Set live paywall for Android
  await test('POST - Set live paywall for Android', async () => {
    const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
      platform: 'android',
      paywall_id: 'test_android_paywall',
      provider: 'superwall',
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.platform === 'android', 'Expected platform: android');
    assert(data.provider === 'superwall', 'Expected provider: superwall');
  });

  // Test 4: GET - Get all live paywalls
  await test('GET - Get all live paywalls', async () => {
    const { response, data } = await request('GET', '/api/v1/config/paywall-live');

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.ios !== undefined, 'Expected ios data');
    assert(data.android !== undefined, 'Expected android data');
    assert(data.ios.paywall_id === 'test_ios_paywall', 'iOS paywall should match');
    assert(data.android.paywall_id === 'test_android_paywall', 'Android paywall should match');
  });

  // Test 5: POST - Update existing live paywall (upsert)
  await test('POST - Update existing live paywall (upsert)', async () => {
    const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
      platform: 'ios',
      paywall_id: 'updated_ios_paywall',
      provider: 'revenuecat',
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.paywall_id === 'updated_ios_paywall', 'Paywall should be updated');
    assert(data.provider === 'revenuecat', 'Provider should be updated');
  });

  // Test 6: GET - Verify update
  await test('GET - Verify update', async () => {
    const { response, data } = await request('GET', '/api/v1/config/paywall-live?platform=ios');

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.paywall_id === 'updated_ios_paywall', 'Should return updated paywall');
  });

  // Test 7: POST - Invalid platform
  await test('POST - Invalid platform (should fail)', async () => {
    const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
      platform: 'invalid',
      paywall_id: 'test',
      provider: 'custom',
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error && data.error.includes('Invalid platform'), 'Should return invalid platform error');
  });

  // Test 8: POST - Invalid provider
  await test('POST - Invalid provider (should fail)', async () => {
    const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
      platform: 'ios',
      paywall_id: 'test',
      provider: 'invalid',
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error && data.error.includes('Invalid provider'), 'Should return invalid provider error');
  });

  // Test 9: POST - Missing required fields
  await test('POST - Missing required fields (should fail)', async () => {
    const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
      platform: 'ios',
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error && data.error.includes('Missing required fields'), 'Should return missing fields error');
  });

  // Test 10: GET - Invalid platform query
  await test('GET - Invalid platform query (should fail)', async () => {
    const { response, data } = await request('GET', '/api/v1/config/paywall-live?platform=invalid');

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error && data.error.includes('Invalid platform'), 'Should return invalid platform error');
  });

  // Test 11: OPTIONS - CORS preflight
  await test('OPTIONS - CORS preflight', async () => {
    const response = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3007',
      },
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
  });

  // Test 12: POST - With configuration object
  await test('POST - With configuration object', async () => {
    const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
      platform: 'web',
      paywall_id: 'web_paywall',
      provider: 'custom',
      configuration: {
        theme: 'dark',
        features: ['trial', 'discount'],
      },
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.configuration.theme === 'dark', 'Configuration should be saved');
    assert(Array.isArray(data.configuration.features), 'Features should be array');
  });

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📝 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n❌ Test runner error:', error);
  process.exit(1);
});
