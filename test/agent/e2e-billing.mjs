/**
 * E2E Test: Billing Endpoints
 * 
 * Tests billing-related endpoints:
 * - POST /billing/checkout - Create Stripe checkout session
 * - POST /billing/portal - Create Stripe portal session
 * - POST /v1/billing/restore - Restore purchases
 * - GET /v1/me/entitlements - Get entitlements
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso } from './_shared.mjs';

const rid = runId();
const lines = [
  '# E2E Test: Billing',
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
  lines.push('## Test Results');
  lines.push('');

  const tests = [];

  // Test 1: Checkout requires auth
  try {
    const { res, json, ms } = await apiFetch(BASE, '/billing/checkout', {
      method: 'POST',
      origin: ORIGIN,
    });
    const pass = res.status === 401;
    tests.push({
      name: 'POST /billing/checkout (no auth)',
      pass,
      status: res.status,
      ms,
      expected: 401,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'POST /billing/checkout (no auth)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 2: Portal requires auth
  try {
    const { res, json, ms } = await apiFetch(BASE, '/billing/portal', {
      method: 'POST',
      origin: ORIGIN,
    });
    const pass = res.status === 401;
    tests.push({
      name: 'POST /billing/portal (no auth)',
      pass,
      status: res.status,
      ms,
      expected: 401,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'POST /billing/portal (no auth)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 3: Checkout with auth (may fail if Stripe not configured, but should not 401)
  try {
    const { res, json, ms } = await apiFetch(BASE, '/billing/checkout', {
      method: 'POST',
      token,
      origin: ORIGIN,
    });
    // Accept 200 (success), 400/500 (config error), but not 401
    const pass = res.status !== 401;
    tests.push({
      name: 'POST /billing/checkout (authenticated)',
      pass,
      status: res.status,
      ms,
      has_url: !!json?.url,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'POST /billing/checkout (authenticated)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 4: Portal with auth
  try {
    const { res, json, ms } = await apiFetch(BASE, '/billing/portal', {
      method: 'POST',
      token,
      origin: ORIGIN,
    });
    // Accept 200 (success), 400/500 (config error), but not 401
    const pass = res.status !== 401;
    tests.push({
      name: 'POST /billing/portal (authenticated)',
      pass,
      status: res.status,
      ms,
      has_url: !!json?.url,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'POST /billing/portal (authenticated)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 5: Restore purchases requires auth
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/billing/restore', {
      method: 'POST',
      origin: ORIGIN,
    });
    const pass = res.status === 401;
    tests.push({
      name: 'POST /v1/billing/restore (no auth)',
      pass,
      status: res.status,
      ms,
      expected: 401,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'POST /v1/billing/restore (no auth)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 6: Restore purchases with auth
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/billing/restore', {
      method: 'POST',
      token,
      origin: ORIGIN,
    });
    const pass = res.status === 200 && json?.recomputed === true;
    tests.push({
      name: 'POST /v1/billing/restore (authenticated)',
      pass,
      status: res.status,
      ms,
      recomputed: json?.recomputed,
      plan: json?.entitlements?.plan,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'POST /v1/billing/restore (authenticated)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 7: Get entitlements requires auth
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/me/entitlements', {
      origin: ORIGIN,
    });
    const pass = res.status === 401;
    tests.push({
      name: 'GET /v1/me/entitlements (no auth)',
      pass,
      status: res.status,
      ms,
      expected: 401,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'GET /v1/me/entitlements (no auth)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 8: Get entitlements with auth
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/me/entitlements', {
      token,
      origin: ORIGIN,
    });
    const pass = res.status === 200 && json?.plan && json?.features;
    tests.push({
      name: 'GET /v1/me/entitlements (authenticated)',
      pass,
      status: res.status,
      ms,
      plan: json?.plan,
      source: json?.source,
      features_count: json?.features ? Object.keys(json.features).length : 0,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'GET /v1/me/entitlements (authenticated)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Generate report
  const passed = tests.filter(t => t.pass).length;
  const failed = tests.filter(t => !t.pass).length;

  lines.push(`**Summary**: ${passed} passed, ${failed} failed`);
  lines.push('');

  for (const t of tests) {
    const icon = t.pass ? '✅' : '❌';
    lines.push(`### ${icon} ${t.name}`);
    lines.push('');
    if (t.error) {
      lines.push(`- **Error**: ${t.error}`);
    } else {
      lines.push(`- **Status**: ${t.status}`);
      lines.push(`- **Duration**: ${t.ms}ms`);
      if (t.expected) lines.push(`- **Expected**: ${t.expected}`);
      if (t.has_url !== undefined) lines.push(`- **Has URL**: ${t.has_url}`);
      if (t.recomputed !== undefined) lines.push(`- **Recomputed**: ${t.recomputed}`);
      if (t.plan) lines.push(`- **Plan**: ${t.plan}`);
      if (t.source) lines.push(`- **Source**: ${t.source}`);
      if (t.features_count !== undefined) lines.push(`- **Features Count**: ${t.features_count}`);
    }
    lines.push('');
  }

  await writeReport(lines, 'test/agent/reports', 'e2e_billing');
  
  if (exitCode === 0) {
    console.log(`✅ All billing tests passed`);
  } else {
    console.error(`❌ Some billing tests failed`);
  }
}

main().catch((err) => {
  console.error('[Billing Test Failed]', err?.message || err);
  lines.push('');
  lines.push('## Fatal Error');
  lines.push('');
  lines.push('```');
  lines.push(err?.stack || err?.message || String(err));
  lines.push('```');
  writeReport(lines, 'test/agent/reports', 'e2e_billing').catch(() => {});
  process.exit(1);
});

process.on('exit', () => process.exit(exitCode));
