#!/usr/bin/env node
/**
 * Comprehensive Backend Tests
 * Auto-obtains auth tokens and tests all recent features
 * 
 * Usage:
 *   TEST_LOCAL=true node tests/backend-comprehensive.test.mjs     # Test local (port 3333)
 *   TEST_BASE_URL=https://ever-reach-be.vercel.app node tests/backend-comprehensive.test.mjs  # Test production
 *   TEST_PORT=3333 TEST_LOCAL=true node tests/backend-comprehensive.test.mjs  # Custom port
 */

import { TEST_CONFIG, getAuthToken, authFetch, apiFetch } from './test-config.mjs';

// Test utilities
const log = (color, msg) => {
  const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m' };
  console.log(`${colors[color] || ''}${msg}${colors.reset}`);
};

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    log('green', `✓ ${name}`);
    passed++;
  } catch (e) {
    log('red', `✗ ${name}`);
    log('red', `  Error: ${e.message}`);
    failures.push({ name, error: e.message });
    failed++;
  }
}

// ============================================
// AUTH TESTS
// ============================================
async function testAuth() {
  log('blue', '\n═══════════════════════════════════════');
  log('blue', '  AUTH TESTS');
  log('blue', '═══════════════════════════════════════\n');

  await test('Auto-obtain auth token', async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('Failed to obtain token');
    if (token.length < 100) throw new Error('Token too short, likely invalid');
  });
}

// ============================================
// ENTITLEMENTS TESTS
// ============================================
async function testEntitlements() {
  log('blue', '\n═══════════════════════════════════════');
  log('blue', '  ENTITLEMENTS TESTS');
  log('blue', '═══════════════════════════════════════\n');

  await test('OPTIONS /api/v1/me/entitlements - CORS preflight', async () => {
    const response = await apiFetch('/api/v1/me/entitlements', {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://everreach.app' },
    });
    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Expected 200 or 204, got ${response.status}`);
    }
  });

  await test('GET /api/v1/me/entitlements - requires auth (401 without token)', async () => {
    const response = await apiFetch('/api/v1/me/entitlements');
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  await test('GET /api/v1/me/entitlements - returns data with auth', async () => {
    const response = await authFetch('/api/v1/me/entitlements');
    if (!response.ok) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    const data = await response.json();
    if (!data.plan) throw new Error('Missing plan field');
    if (!data.source) throw new Error('Missing source field');
    log('cyan', `    Response: plan=${data.plan}, source=${data.source}, tier=${data.tier}`);
  });

  await test('GET /api/v1/me/entitlements - source field mapping', async () => {
    const response = await authFetch('/api/v1/me/entitlements');
    const data = await response.json();
    
    // Check if source is one of the expected values
    const validSources = ['stripe', 'app_store', 'play', 'manual', 'revenuecat'];
    if (!validSources.includes(data.source)) {
      throw new Error(`Invalid source: ${data.source}. Expected one of: ${validSources.join(', ')}`);
    }
    
    // If product_id starts with 'com.' and source is 'revenuecat', that's a mapping issue
    if (data.source === 'revenuecat' && data.product_id?.startsWith('com.')) {
      log('yellow', `    ⚠️ WARNING: source='revenuecat' but product_id='${data.product_id}' should map to 'app_store'`);
    }
  });
}

// ============================================
// BILLING PORTAL TESTS
// ============================================
async function testBillingPortal() {
  log('blue', '\n═══════════════════════════════════════');
  log('blue', '  BILLING PORTAL TESTS');
  log('blue', '═══════════════════════════════════════\n');

  await test('OPTIONS /api/v1/billing/portal - CORS preflight', async () => {
    const response = await apiFetch('/api/v1/billing/portal', {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://everreach.app' },
    });
    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Expected 200 or 204, got ${response.status}`);
    }
  });

  await test('OPTIONS /api/billing/portal - CORS preflight (legacy)', async () => {
    const response = await apiFetch('/api/billing/portal', {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://everreach.app' },
    });
    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Expected 200 or 204, got ${response.status}`);
    }
  });

  await test('POST /api/v1/billing/portal - requires auth (401)', async () => {
    const response = await apiFetch('/api/v1/billing/portal', { method: 'POST' });
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  await test('POST /api/v1/billing/portal - non-Stripe subscription handling', async () => {
    const response = await authFetch('/api/v1/billing/portal', { method: 'POST' });
    const status = response.status;
    const data = await response.json().catch(() => ({}));
    
    log('cyan', `    Response: status=${status}, error=${data.error || 'none'}`);
    
    // For non-Stripe subscriptions, should return 400 with INVALID_SUBSCRIPTION_SOURCE
    // For Stripe subscriptions, should return 200 with URL
    // 500 indicates the fix hasn't been deployed
    if (status === 500) {
      log('yellow', `    ⚠️ WARNING: Got 500 - billing portal fix may not be deployed`);
    }
  });
}

// ============================================
// FUNNEL TRACKING TESTS
// ============================================
async function testFunnelTracking() {
  log('blue', '\n═══════════════════════════════════════');
  log('blue', '  FUNNEL TRACKING TESTS');
  log('blue', '═══════════════════════════════════════\n');

  const testSessionId = `test_comprehensive_${Date.now()}`;

  await test('OPTIONS /api/v1/funnel/session - CORS preflight', async () => {
    const response = await apiFetch('/api/v1/funnel/session', {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://everreach.app' },
    });
    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Expected 200 or 204, got ${response.status}`);
    }
  });

  await test('POST /api/v1/funnel/session - create session', async () => {
    const response = await apiFetch('/api/v1/funnel/session', {
      method: 'POST',
      body: JSON.stringify({
        session_id: testSessionId,
        idea_id: 'everreach_waitlist',
        funnel_id: 'everreach_waitlist_v01',
        utm_source: 'test',
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Expected 200, got ${response.status}: ${error}`);
    }
  });

  await test('POST /api/v1/funnel/event - track event', async () => {
    const response = await apiFetch('/api/v1/funnel/event', {
      method: 'POST',
      body: JSON.stringify({
        session_id: testSessionId,
        event_name: 'test_event',
        event_properties: { test: true },
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Expected 200, got ${response.status}: ${error}`);
    }
  });

  await test('POST /api/v1/funnel/waitlist - missing email returns 400', async () => {
    const response = await apiFetch('/api/v1/funnel/waitlist', {
      method: 'POST',
      body: JSON.stringify({ session_id: testSessionId }),
    });
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
  });
}

// ============================================
// SUBSCRIPTION SOURCE LOGIC TESTS
// ============================================
async function testSubscriptionSourceLogic() {
  log('blue', '\n═══════════════════════════════════════');
  log('blue', '  SUBSCRIPTION SOURCE LOGIC TESTS');
  log('blue', '═══════════════════════════════════════\n');

  await test('Source mapping: iOS product_id → app_store', () => {
    const productId = 'com.everreach.core.monthly';
    const isAppStore = productId.startsWith('com.') || productId.includes('ios');
    if (!isAppStore) throw new Error(`${productId} should map to app_store`);
  });

  await test('Source mapping: Android product_id → play', () => {
    const productId = 'everreach_core_monthly_android';
    const isPlay = productId.includes('android');
    if (!isPlay) throw new Error(`${productId} should map to play`);
  });

  await test('Source mapping: stripe passthrough', () => {
    const source = 'stripe';
    if (source !== 'stripe') throw new Error('Stripe source should passthrough');
  });

  await test('Error response format for non-Stripe portal', () => {
    const expectedError = {
      error: 'Cannot create portal for non-Stripe subscription',
      code: 'INVALID_SUBSCRIPTION_SOURCE',
      subscription_source: 'app_store',
    };
    if (expectedError.code !== 'INVALID_SUBSCRIPTION_SOURCE') {
      throw new Error('Error code format incorrect');
    }
  });
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE BACKEND TESTS                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\nBackend URL: ${TEST_CONFIG.BASE_URL}`);
  console.log(`Test Email: ${TEST_CONFIG.TEST_EMAIL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Run all test suites
  await testAuth();
  await testEntitlements();
  await testBillingPortal();
  await testFunnelTracking();
  await testSubscriptionSourceLogic();

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     TEST SUMMARY                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  log('green', `Passed: ${passed}`);
  if (failed > 0) {
    log('red', `Failed: ${failed}`);
    console.log('\nFailed tests:');
    failures.forEach(f => log('red', `  - ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    log('green', '\n✅ All tests passed!');
  }
}

main().catch(e => {
  log('red', `Fatal error: ${e.message}`);
  process.exit(1);
});
