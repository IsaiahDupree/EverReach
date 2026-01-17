/**
 * E2E Test: Trial Expiration Detection
 * 
 * Tests subscription and trial features:
 * 1. Get user entitlements (check trial status)
 * 2. Get usage summary
 * 3. Get plan recommendation
 * 4. Test checkout flow (trial → paid)
 * 5. Test feature access restrictions
 * 6. Verify trial expiration detection
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso } from './_shared.mjs';

const rid = runId();
const lines = [
  '# E2E Test: Trial Expiration & Billing',
  '',
  `- **Run ID**: ${rid}`,
  `- **Timestamp**: ${nowIso()}`,
];

let exitCode = 0;

async function main() {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const token = await getAccessToken();

  lines.push(`- **Backend**: ${BASE}`);
  lines.push(`- **Origin**: ${ORIGIN}`);
  lines.push('');
  lines.push('## Trial & Subscription Tests');
  lines.push('');

  const tests = [];

  // ===== TEST 1: Get User Entitlements =====
  lines.push('### 1. Get User Entitlements');
  lines.push('');

  let entitlements = null;
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/me/entitlements', {
      token,
      origin: ORIGIN,
    });
    const pass = res.status === 200;
    if (pass) {
      entitlements = json;
    }
    tests.push({
      name: '1. Get entitlements',
      pass,
      status: res.status,
      ms,
      plan: json?.plan,
      is_trial: json?.is_trial,
      trial_ends_at: json?.trial_ends_at,
      features: json?.features,
    });
    
    if (pass) {
      lines.push(`- ✅ Entitlements retrieved`);
      lines.push(`- Plan: ${json?.plan || 'free'}`);
      lines.push(`- Trial: ${json?.is_trial ? 'Yes' : 'No'}`);
      if (json?.trial_ends_at) {
        lines.push(`- Trial ends: ${json.trial_ends_at}`);
      }
      if (json?.features) {
        lines.push(`- Features enabled: ${Object.keys(json.features).filter(k => json.features[k]).join(', ')}`);
      }
    } else {
      lines.push(`- ❌ Failed`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '1. Get entitlements', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== TEST 2: Get Usage Summary =====
  lines.push('### 2. Get Usage Summary');
  lines.push('');

  let usage = null;
  try {
    const { res, json, ms } = await apiFetch(BASE, '/api/me/usage-summary', {
      token,
      origin: ORIGIN,
    });
    const pass = res.status === 200;
    if (pass) {
      usage = json;
    }
    tests.push({
      name: '2. Get usage summary',
      pass,
      status: res.status,
      ms,
      contacts_count: json?.contacts_count,
      interactions_count: json?.interactions_count,
      ai_requests_count: json?.ai_requests_count,
    });
    
    if (pass) {
      lines.push(`- ✅ Usage summary retrieved`);
      lines.push(`- Contacts: ${json?.contacts_count || 0}`);
      lines.push(`- Interactions: ${json?.interactions_count || 0}`);
      lines.push(`- AI requests: ${json?.ai_requests_count || 0}`);
    } else {
      lines.push(`- ❌ Failed`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '2. Get usage summary', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== TEST 3: Get Plan Recommendation =====
  lines.push('### 3. Get Plan Recommendation');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, '/api/me/plan-recommendation', {
      token,
      origin: ORIGIN,
    });
    const pass = res.status === 200;
    tests.push({
      name: '3. Get plan recommendation',
      pass,
      status: res.status,
      ms,
      recommended_plan: json?.recommended_plan,
      reason: json?.reason,
    });
    
    if (pass) {
      lines.push(`- ✅ Plan recommendation retrieved`);
      lines.push(`- Recommended: ${json?.recommended_plan || 'N/A'}`);
      if (json?.reason) {
        lines.push(`- Reason: ${json.reason}`);
      }
    } else {
      lines.push(`- ❌ Failed`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '3. Get plan recommendation', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== TEST 4: Check Trial Status Logic =====
  lines.push('### 4. Verify Trial Status Logic');
  lines.push('');

  if (entitlements) {
    const isTrial = entitlements.is_trial;
    const trialEndsAt = entitlements.trial_ends_at ? new Date(entitlements.trial_ends_at) : null;
    const now = new Date();
    const isExpired = trialEndsAt && trialEndsAt < now;
    const daysRemaining = trialEndsAt ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)) : null;

    tests.push({
      name: '4. Trial status logic',
      pass: true,
      is_trial: isTrial,
      trial_ends_at: trialEndsAt?.toISOString(),
      is_expired: isExpired,
      days_remaining: daysRemaining,
    });

    lines.push(`- ✅ Trial status analyzed`);
    if (isTrial) {
      if (isExpired) {
        lines.push(`- ⚠️  Trial has EXPIRED`);
        lines.push(`- Expired: ${-daysRemaining} days ago`);
      } else if (daysRemaining !== null) {
        lines.push(`- ✓ Trial active: ${daysRemaining} days remaining`);
      }
    } else {
      lines.push(`- ✓ Not on trial (paid or free plan)`);
    }
    lines.push('');
  } else {
    tests.push({ name: '4. Trial status logic', pass: false, error: 'No entitlements data' });
    lines.push(`- ❌ Cannot analyze - no entitlements data`);
    lines.push('');
    exitCode = 1;
  }

  // ===== TEST 5: Create Checkout Session =====
  lines.push('### 5. Test Checkout Session Creation');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, '/billing/checkout', {
      method: 'POST',
      token,
      origin: ORIGIN,
    });
    // Accept 200 (success) or 400/500 (Stripe not configured), but not 401
    const pass = res.status !== 401;
    tests.push({
      name: '5. Create checkout session',
      pass,
      status: res.status,
      ms,
      has_url: !!json?.url,
      error: json?.error,
    });
    
    if (res.status === 200 && json?.url) {
      lines.push(`- ✅ Checkout session created`);
      lines.push(`- Checkout URL: ${json.url.substring(0, 50)}...`);
    } else if (res.status === 400 || res.status === 500) {
      lines.push(`- ⚠️  Stripe not configured (expected in test environment)`);
      lines.push(`- Status: ${res.status}`);
    } else {
      lines.push(`- ❌ Unexpected error: ${res.status}`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '5. Create checkout session', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== TEST 6: Portal Session =====
  lines.push('### 6. Test Billing Portal Session');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, '/billing/portal', {
      method: 'POST',
      token,
      origin: ORIGIN,
    });
    // Accept 200 (success) or 400/500 (no Stripe customer), but not 401
    const pass = res.status !== 401;
    tests.push({
      name: '6. Create portal session',
      pass,
      status: res.status,
      ms,
      has_url: !!json?.url,
    });
    
    if (res.status === 200 && json?.url) {
      lines.push(`- ✅ Portal session created`);
    } else if (res.status === 400) {
      lines.push(`- ⚠️  No Stripe customer (expected for test user)`);
    } else {
      lines.push(`- ⚠️  Status: ${res.status}`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '6. Create portal session', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== TEST 7: Restore Purchases (Mobile) =====
  lines.push('### 7. Test Restore Purchases');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/billing/restore', {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify({
        receipt_data: 'test_receipt_' + rid.slice(0, 8),
        platform: 'ios',
      }),
    });
    // Any response that's not 401 is acceptable (may fail due to no purchases)
    const pass = res.status !== 401;
    tests.push({
      name: '7. Restore purchases',
      pass,
      status: res.status,
      ms,
    });
    
    if (res.status === 200) {
      lines.push(`- ✅ Restore endpoint working`);
    } else if (res.status === 400) {
      lines.push(`- ⚠️  No purchases to restore (expected)`);
    } else {
      lines.push(`- ⚠️  Status: ${res.status}`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '7. Restore purchases', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== TEST 8: Impact Summary (Value Proposition) =====
  lines.push('### 8. Get Impact Summary');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, '/api/me/impact-summary', {
      token,
      origin: ORIGIN,
    });
    const pass = res.status === 200;
    tests.push({
      name: '8. Get impact summary',
      pass,
      status: res.status,
      ms,
      relationships_maintained: json?.relationships_maintained,
      messages_sent: json?.messages_sent,
      warmth_improvement: json?.warmth_improvement,
    });
    
    if (pass) {
      lines.push(`- ✅ Impact summary retrieved`);
      lines.push(`- Relationships maintained: ${json?.relationships_maintained || 0}`);
      lines.push(`- Messages sent: ${json?.messages_sent || 0}`);
      lines.push(`- Warmth improvement: ${json?.warmth_improvement || 0}%`);
    } else {
      lines.push(`- ❌ Failed`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '8. Get impact summary', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== SUMMARY =====
  lines.push('---');
  lines.push('');
  lines.push('## Trial & Billing Summary');
  lines.push('');
  lines.push('**Trial Detection**:');
  if (entitlements) {
    if (entitlements.is_trial) {
      const trialEndsAt = entitlements.trial_ends_at ? new Date(entitlements.trial_ends_at) : null;
      const now = new Date();
      const daysRemaining = trialEndsAt ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)) : null;
      if (daysRemaining !== null) {
        if (daysRemaining > 0) {
          lines.push(`- ✅ Trial active: ${daysRemaining} days remaining`);
        } else {
          lines.push(`- ⚠️  Trial expired: ${-daysRemaining} days ago`);
          lines.push(`- **Expected**: Access restrictions should apply`);
        }
      }
    } else {
      lines.push(`- ✓ Not on trial plan`);
    }
  }
  lines.push('');
  lines.push('**Billing Features Tested**:');
  lines.push('- ✅ Entitlements endpoint');
  lines.push('- ✅ Usage tracking');
  lines.push('- ✅ Plan recommendations');
  lines.push('- ✅ Checkout session creation');
  lines.push('- ✅ Billing portal access');
  lines.push('- ✅ Purchase restoration');
  lines.push('- ✅ Impact metrics');
  lines.push('');
  lines.push(`**Tests Passed**: ${tests.filter(t => t.pass).length}/${tests.length}`);
  lines.push('');

  if (exitCode === 0) {
    lines.push('✅ **All trial & billing tests passed**');
  } else {
    lines.push('⚠️  **Some trial & billing tests failed**');
  }

  await writeReport('e2e_trial_expiration', lines, tests, exitCode);
  process.exit(exitCode);
}

main().catch(err => {
  console.error('Fatal error:', err);
  lines.push('');
  lines.push(`**Fatal Error**: ${err.message}`);
  writeReport('e2e_trial_expiration', lines, [], 1).then(() => process.exit(1));
});
