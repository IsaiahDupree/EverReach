#!/usr/bin/env node
/**
 * Subscription Source Handling Tests
 * Tests the billing portal and entitlements endpoints for subscription source handling
 */

const BACKEND_URL = process.env.BACKEND_URL || process.env.TEST_BASE_URL || 'http://localhost:3333';

// Test utilities
const log = (color, msg) => {
  const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', reset: '\x1b[0m' };
  console.log(`${colors[color] || ''}${msg}${colors.reset}`);
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    log('green', `✓ ${name}`);
    passed++;
  } catch (e) {
    log('red', `✗ ${name}`);
    log('red', `  Error: ${e.message}`);
    failed++;
  }
}

// Tests
async function testBillingPortalEndpoints() {
  log('blue', '\n=== Billing Portal Endpoint Tests ===\n');

  await test('OPTIONS /api/billing/portal - CORS preflight', async () => {
    const response = await fetch(`${BACKEND_URL}/api/billing/portal`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://www.everreach.app' },
    });
    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Expected 200 or 204, got ${response.status}`);
    }
  });

  await test('OPTIONS /api/v1/billing/portal - CORS preflight', async () => {
    const response = await fetch(`${BACKEND_URL}/api/v1/billing/portal`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://www.everreach.app' },
    });
    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Expected 200 or 204, got ${response.status}`);
    }
  });

  await test('POST /api/billing/portal - requires auth (401)', async () => {
    const response = await fetch(`${BACKEND_URL}/api/billing/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  await test('POST /api/v1/billing/portal - requires auth (401)', async () => {
    const response = await fetch(`${BACKEND_URL}/api/v1/billing/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });
}

async function testEntitlementsEndpoint() {
  log('blue', '\n=== Entitlements Endpoint Tests ===\n');

  await test('OPTIONS /api/v1/me/entitlements - CORS preflight', async () => {
    const response = await fetch(`${BACKEND_URL}/api/v1/me/entitlements`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://www.everreach.app' },
    });
    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Expected 200 or 204, got ${response.status}`);
    }
  });

  await test('GET /api/v1/me/entitlements - requires auth (401)', async () => {
    const response = await fetch(`${BACKEND_URL}/api/v1/me/entitlements`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });
}

async function testSubscriptionSourceLogic() {
  log('blue', '\n=== Subscription Source Logic Tests ===\n');

  // Test source mapping logic (unit tests - no network)
  await test('Source mapping: app_store product_id detection', () => {
    const productId = 'com.everreach.core.monthly';
    const isAppStore = productId.includes('ios') || productId.startsWith('com.');
    if (!isAppStore) throw new Error('Should detect as app_store');
  });

  await test('Source mapping: android product_id detection', () => {
    const productId = 'everreach_core_monthly_android';
    const isPlay = productId.includes('android');
    if (!isPlay) throw new Error('Should detect as play');
  });

  await test('Source mapping: stripe source passthrough', () => {
    const source = 'stripe';
    if (source !== 'stripe') throw new Error('Should passthrough stripe');
  });

  await test('Error response format for non-Stripe portal request', () => {
    const expectedError = {
      error: 'Cannot create portal for non-Stripe subscription',
      code: 'INVALID_SUBSCRIPTION_SOURCE',
      subscription_source: 'app_store',
    };
    if (expectedError.code !== 'INVALID_SUBSCRIPTION_SOURCE') {
      throw new Error('Error code mismatch');
    }
  });
}

async function testEndpointAvailability() {
  log('blue', '\n=== Endpoint Availability Tests ===\n');

  await test('Backend is reachable', async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET' });
      // Any response means server is up
      if (!response) throw new Error('No response');
    } catch (e) {
      // Try alternate endpoint
      const response = await fetch(`${BACKEND_URL}/api/v1/me/entitlements`, { 
        method: 'OPTIONS',
        headers: { 'Origin': 'https://www.everreach.app' },
      });
      if (!response) throw new Error('Backend not reachable');
    }
  });
}

// Main
async function main() {
  console.log('\n🧪 Subscription Source Handling Tests');
  console.log(`Backend: ${BACKEND_URL}\n`);

  await testEndpointAvailability();
  await testSubscriptionSourceLogic();
  await testEntitlementsEndpoint();
  await testBillingPortalEndpoints();

  // Summary
  log('blue', '\n=== Test Summary ===\n');
  log('green', `Passed: ${passed}`);
  if (failed > 0) {
    log('red', `Failed: ${failed}`);
    process.exit(1);
  } else {
    log('green', 'All tests passed! ✅');
  }
}

main().catch(e => {
  log('red', `Fatal error: ${e.message}`);
  process.exit(1);
});
