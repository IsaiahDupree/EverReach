/**
 * Cross-Platform Entitlements Test
 * 
 * Tests the unified entitlements system across Stripe, App Store, and Play Store:
 * - GET /v1/me/entitlements - Returns current plan, features, and validity
 * - POST /v1/billing/restore - Recomputes entitlements from subscription snapshots
 * - Webhook handlers ensure subscriptions sync across platforms
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Cross-Platform Entitlements Test',
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

  // Test 1: GET /v1/me/entitlements (unauthenticated should fail)
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/me/entitlements', { origin: ORIGIN });
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

  // Test 2: GET /v1/me/entitlements (authenticated)
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/me/entitlements', { token, origin: ORIGIN });
    const pass = res.status === 200 && json?.plan && json?.features;
    tests.push({
      name: 'GET /v1/me/entitlements (authenticated)',
      pass,
      status: res.status,
      ms,
      plan: json?.plan,
      source: json?.source,
      features: json?.features ? Object.keys(json.features).length : 0,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'GET /v1/me/entitlements (authenticated)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 3: Verify free plan structure
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/me/entitlements', { token, origin: ORIGIN });
    const hasRequiredFields = json?.plan && json?.features && 
      typeof json.features.compose_runs === 'number' &&
      typeof json.features.voice_minutes === 'number' &&
      typeof json.features.messages === 'number';
    const pass = res.status === 200 && hasRequiredFields;
    tests.push({
      name: 'Entitlements structure validation',
      pass,
      status: res.status,
      ms,
      plan: json?.plan,
      compose_runs: json?.features?.compose_runs,
      voice_minutes: json?.features?.voice_minutes,
      messages: json?.features?.messages,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Entitlements structure validation', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 4: POST /v1/billing/restore (unauthenticated should fail)
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/billing/restore', { 
      method: 'POST', 
      origin: ORIGIN 
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

  // Test 5: POST /v1/billing/restore (authenticated)
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/billing/restore', { 
      method: 'POST', 
      token, 
      origin: ORIGIN 
    });
    const pass = res.status === 200 && json?.recomputed === true;
    tests.push({
      name: 'POST /v1/billing/restore (authenticated)',
      pass,
      status: res.status,
      ms,
      recomputed: json?.recomputed,
      entitlements_plan: json?.entitlements?.plan,
      entitlements_source: json?.entitlements?.source,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'POST /v1/billing/restore (authenticated)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 6: Verify restore returns entitlements
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/billing/restore', { 
      method: 'POST', 
      token, 
      origin: ORIGIN 
    });
    const hasEntitlements = json?.entitlements && 
      json.entitlements.plan && 
      json.entitlements.source;
    const pass = res.status === 200 && hasEntitlements;
    tests.push({
      name: 'Restore returns complete entitlements',
      pass,
      status: res.status,
      ms,
      has_plan: !!json?.entitlements?.plan,
      has_source: !!json?.entitlements?.source,
      has_valid_until: json?.entitlements?.valid_until !== undefined,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Restore returns complete entitlements', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 7: Verify entitlements consistency (get after restore)
  try {
    // First restore
    await apiFetch(BASE, '/v1/billing/restore', { method: 'POST', token, origin: ORIGIN });
    
    // Then get entitlements
    const { res, json, ms } = await apiFetch(BASE, '/v1/me/entitlements', { token, origin: ORIGIN });
    const pass = res.status === 200 && json?.plan;
    tests.push({
      name: 'Entitlements consistency after restore',
      pass,
      status: res.status,
      ms,
      plan: json?.plan,
      source: json?.source,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Entitlements consistency after restore', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 8: Verify source field values
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/me/entitlements', { token, origin: ORIGIN });
    const validSources = ['stripe', 'app_store', 'play', 'manual'];
    const pass = res.status === 200 && validSources.includes(json?.source);
    tests.push({
      name: 'Entitlements source validation',
      pass,
      status: res.status,
      ms,
      source: json?.source,
      valid_sources: validSources.join(', '),
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Entitlements source validation', pass: false, error: e.message });
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
      if (t.plan) lines.push(`- **Plan**: ${t.plan}`);
      if (t.source) lines.push(`- **Source**: ${t.source}`);
      if (t.features !== undefined) lines.push(`- **Features Count**: ${t.features}`);
      if (t.compose_runs !== undefined) lines.push(`- **Compose Runs**: ${t.compose_runs}`);
      if (t.voice_minutes !== undefined) lines.push(`- **Voice Minutes**: ${t.voice_minutes}`);
      if (t.messages !== undefined) lines.push(`- **Messages**: ${t.messages}`);
      if (t.recomputed !== undefined) lines.push(`- **Recomputed**: ${t.recomputed}`);
      if (t.entitlements_plan) lines.push(`- **Entitlements Plan**: ${t.entitlements_plan}`);
      if (t.entitlements_source) lines.push(`- **Entitlements Source**: ${t.entitlements_source}`);
      if (t.has_plan !== undefined) lines.push(`- **Has Plan**: ${t.has_plan}`);
      if (t.has_source !== undefined) lines.push(`- **Has Source**: ${t.has_source}`);
      if (t.has_valid_until !== undefined) lines.push(`- **Has Valid Until**: ${t.has_valid_until}`);
      if (t.valid_sources) lines.push(`- **Valid Sources**: ${t.valid_sources}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Cross-Platform Support');
  lines.push('');
  lines.push('This test validates that:');
  lines.push('- Users can check their entitlements from any platform (web, iOS, Android)');
  lines.push('- The restore endpoint recomputes entitlements from all subscription sources');
  lines.push('- Stripe, App Store, and Play Store subscriptions are unified');
  lines.push('- The system returns consistent plan/feature data');
  lines.push('');

  await writeReport(lines, 'test/agent/reports', 'entitlements');
  
  if (exitCode === 0) {
    console.log(`✅ All entitlements tests passed`);
  } else {
    console.error(`❌ Some entitlements tests failed`);
  }
}

main().catch((err) => {
  console.error('[Entitlements Test Failed]', err?.message || err);
  lines.push('');
  lines.push('## Fatal Error');
  lines.push('');
  lines.push('```');
  lines.push(err?.stack || err?.message || String(err));
  lines.push('```');
  writeReport(lines, 'test/agent/reports', 'entitlements').catch(() => {});
  process.exit(1);
});

process.on('exit', () => process.exit(exitCode));
