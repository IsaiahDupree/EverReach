/**
 * Enhanced Subscription Status Tests
 * 
 * Tests the 9-state subscription system with fine-grained status discernment.
 * 
 * Run with:
 * node test/backend/subscription-enhanced-statuses.mjs
 * 
 * Requires:
 * - ADMIN_TEST_TOKEN environment variable
 * - Valid test user authentication
 */

import { getEnv, getAccessToken, apiFetch } from './_shared.mjs';

// Colors for test output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

let passedTests = 0;
let failedTests = 0;

/**
 * Test helper
 */
function test(description, testFn) {
  return async () => {
    try {
      await testFn();
      passedTests++;
      console.log(`${colors.green}✓${colors.reset} ${description}`);
    } catch (error) {
      failedTests++;
      console.log(`${colors.red}✗${colors.reset} ${description}`);
      console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
      if (error.details) {
        console.log(`  ${colors.yellow}Details: ${JSON.stringify(error.details, null, 2)}${colors.reset}`);
      }
    }
  };
}

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

/**
 * Set subscription state helper
 */
async function setSubscriptionState(apiBase, adminToken, userId, state) {
  const { res, json, ms } = await apiFetch(apiBase, '/api/v1/testing/subscription/set', {
    method: 'POST',
    headers: { 'X-Admin-Token': adminToken },
    body: JSON.stringify(state),
  });

  assert(res.ok, `Failed to set subscription state: ${res.status}`, json);
  assert(json.success, 'Set subscription did not return success', json);
  
  return json;
}

/**
 * Get entitlements helper
 */
async function getEntitlements(apiBase, token) {
  const { res, json, ms } = await apiFetch(apiBase, '/api/v1/me/entitlements', {
    method: 'GET',
    token,
  });

  assert(res.ok, `Failed to get entitlements: ${res.status}`, json);
  
  return json;
}

/**
 * Test Suite
 */
const tests = [
  // ============================================================================
  // State 1: TRIAL_ACTIVE
  // ============================================================================
  test('State: TRIAL_ACTIVE - Trial in progress', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    // Set to TRIAL_ACTIVE
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'TRIAL_ACTIVE',
      tier: 'pro',
      trialEndsAt: futureDate,
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.subscription_status === 'TRIAL_ACTIVE', 'Status should be TRIAL_ACTIVE', entitlements);
    assert(entitlements.tier === 'pro', 'Tier should be pro', entitlements);
    assert(entitlements.trial_ends_at !== null, 'Trial end date should be set', entitlements);
    assert(entitlements.features.compose_runs === 1000, 'Should have pro features', entitlements);
  }),

  // ============================================================================
  // State 2: TRIAL_EXPIRED
  // ============================================================================
  test('State: TRIAL_EXPIRED - Trial ended, no payment', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    // Set to TRIAL_EXPIRED
    const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'TRIAL_EXPIRED',
      tier: 'free',
      trialEndsAt: pastDate,
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.subscription_status === 'TRIAL_EXPIRED', 'Status should be TRIAL_EXPIRED', entitlements);
    assert(entitlements.tier === 'free', 'Tier should be free', entitlements);
    assert(entitlements.features.compose_runs === 50, 'Should have free tier limits', entitlements);
  }),

  // ============================================================================
  // State 3: ACTIVE
  // ============================================================================
  test('State: ACTIVE - Paid subscription active', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    // Set to ACTIVE
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'ACTIVE',
      tier: 'pro',
      currentPeriodEnd: futureDate,
      billingSource: 'app_store',
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.subscription_status === 'ACTIVE', 'Status should be ACTIVE', entitlements);
    assert(entitlements.tier === 'pro', 'Tier should be pro', entitlements);
    assert(entitlements.payment_platform === 'apple', 'Platform should be apple', entitlements);
    assert(entitlements.features.contacts === -1, 'Should have unlimited contacts', entitlements);
  }),

  // ============================================================================
  // State 4: ACTIVE_CANCELED
  // ============================================================================
  test('State: ACTIVE_CANCELED - Canceled but access until period end', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    // Set to ACTIVE_CANCELED
    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    const canceledDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    
    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'ACTIVE_CANCELED',
      tier: 'pro',
      currentPeriodEnd: futureDate,
      canceledAt: canceledDate,
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.subscription_status === 'ACTIVE_CANCELED', 'Status should be ACTIVE_CANCELED', entitlements);
    assert(entitlements.tier === 'pro', 'Tier should still be pro', entitlements);
    assert(entitlements.current_period_end !== null, 'Period end should be set', entitlements);
  }),

  // ============================================================================
  // State 5: GRACE
  // ============================================================================
  test('State: GRACE - Billing issue, grace period active', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    // Set to GRACE
    const graceEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    
    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'GRACE',
      tier: 'pro',
      currentPeriodEnd: periodEnd,
      graceEndsAt: graceEnd,
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.subscription_status === 'GRACE', 'Status should be GRACE', entitlements);
    assert(entitlements.tier === 'pro', 'Tier should still be pro', entitlements);
  }),

  // ============================================================================
  // State 6: PAUSED
  // ============================================================================
  test('State: PAUSED - Google Play pause', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    // Set to PAUSED
    const pausedDate = new Date().toISOString();
    
    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'PAUSED',
      tier: 'pro',
      pausedAt: pausedDate,
      billingSource: 'play',
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.subscription_status === 'PAUSED', 'Status should be PAUSED', entitlements);
    assert(entitlements.payment_platform === 'google', 'Platform should be google', entitlements);
  }),

  // ============================================================================
  // State 7: EXPIRED
  // ============================================================================
  test('State: EXPIRED - No access', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    // Set to EXPIRED
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    
    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'EXPIRED',
      tier: 'free',
      currentPeriodEnd: pastDate,
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.subscription_status === 'EXPIRED', 'Status should be EXPIRED', entitlements);
    assert(entitlements.tier === 'free', 'Tier should be free', entitlements);
    assert(entitlements.features.compose_runs === 50, 'Should have free tier limits', entitlements);
  }),

  // ============================================================================
  // State 8: LIFETIME
  // ============================================================================
  test('State: LIFETIME - Lifetime access', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    // Set to LIFETIME
    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'LIFETIME',
      tier: 'lifetime',
      productId: 'com.everreach.lifetime',
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.subscription_status === 'LIFETIME', 'Status should be LIFETIME', entitlements);
    assert(entitlements.tier === 'lifetime', 'Tier should be lifetime', entitlements);
  }),

  // ============================================================================
  // State 9: NO_SUBSCRIPTION
  // ============================================================================
  test('State: NO_SUBSCRIPTION - Reset to free', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    // Reset to free
    const { res, json } = await apiFetch(apiBase, '/api/v1/testing/subscription/reset', {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken },
      body: JSON.stringify({ userId }),
    });

    assert(res.ok, `Failed to reset subscription: ${res.status}`, json);
    assert(json.success, 'Reset did not return success', json);

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.tier === 'free', 'Tier should be free', entitlements);
    assert(entitlements.features.compose_runs === 50, 'Should have free tier limits', entitlements);
  }),

  // ============================================================================
  // Tier Feature Mapping
  // ============================================================================
  test('Tier: Free - Correct feature limits', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'ACTIVE',
      tier: 'free',
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.features.compose_runs === 50, 'Free: compose runs', entitlements);
    assert(entitlements.features.voice_minutes === 30, 'Free: voice minutes', entitlements);
    assert(entitlements.features.messages === 200, 'Free: messages', entitlements);
    assert(entitlements.features.contacts === 100, 'Free: contacts', entitlements);
  }),

  test('Tier: Core - Correct feature limits', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'ACTIVE',
      tier: 'core',
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.features.compose_runs === 500, 'Core: compose runs', entitlements);
    assert(entitlements.features.voice_minutes === 120, 'Core: voice minutes', entitlements);
    assert(entitlements.features.messages === 1000, 'Core: messages', entitlements);
    assert(entitlements.features.contacts === 500, 'Core: contacts', entitlements);
  }),

  test('Tier: Pro - Correct feature limits', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'ACTIVE',
      tier: 'pro',
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.features.compose_runs === 1000, 'Pro: compose runs', entitlements);
    assert(entitlements.features.voice_minutes === 300, 'Pro: voice minutes', entitlements);
    assert(entitlements.features.messages === 2000, 'Pro: messages', entitlements);
    assert(entitlements.features.contacts === -1, 'Pro: unlimited contacts', entitlements);
  }),

  test('Tier: Team - Correct feature limits', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');
    const token = await getAccessToken();
    const userId = 'test-user-' + Date.now();

    await setSubscriptionState(apiBase, adminToken, userId, {
      userId,
      subscriptionStatus: 'ACTIVE',
      tier: 'team',
    });

    const entitlements = await getEntitlements(apiBase, token);
    
    assert(entitlements.features.compose_runs === -1, 'Team: unlimited compose', entitlements);
    assert(entitlements.features.voice_minutes === -1, 'Team: unlimited voice', entitlements);
    assert(entitlements.features.messages === -1, 'Team: unlimited messages', entitlements);
    assert(entitlements.features.contacts === -1, 'Team: unlimited contacts', entitlements);
    assert(entitlements.features.team_members === 10, 'Team: 10 team members', entitlements);
  }),

  // ============================================================================
  // Edge Cases
  // ============================================================================
  test('Edge: Missing admin token returns 401', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const userId = 'test-user-' + Date.now();

    const { res } = await apiFetch(apiBase, '/api/v1/testing/subscription/set', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        subscriptionStatus: 'ACTIVE',
        tier: 'pro',
      }),
    });

    assert(res.status === 401, 'Should return 401 without admin token', { status: res.status });
  }),

  test('Edge: Invalid admin token returns 401', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const userId = 'test-user-' + Date.now();

    const { res } = await apiFetch(apiBase, '/api/v1/testing/subscription/set', {
      method: 'POST',
      headers: { 'X-Admin-Token': 'invalid-token' },
      body: JSON.stringify({
        userId,
        subscriptionStatus: 'ACTIVE',
        tier: 'pro',
      }),
    });

    assert(res.status === 401, 'Should return 401 with invalid token', { status: res.status });
  }),

  test('Edge: Missing userId returns 400', async () => {
    const apiBase = await getEnv('API_BASE_URL', false, 'https://ever-reach-be.vercel.app');
    const adminToken = await getEnv('ADMIN_TEST_TOKEN');

    const { res } = await apiFetch(apiBase, '/api/v1/testing/subscription/set', {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken },
      body: JSON.stringify({
        subscriptionStatus: 'ACTIVE',
        tier: 'pro',
      }),
    });

    assert(res.status === 400, 'Should return 400 without userId', { status: res.status });
  }),
];

/**
 * Run all tests
 */
async function runTests() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Enhanced Subscription Status Tests${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  for (const testFn of tests) {
    await testFn();
  }

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}  Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}  Failed: ${failedTests}${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
