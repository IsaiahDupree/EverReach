/**
 * E2E Tests for Advanced Features
 * Tests: Alerts, Feature Requests/Buckets, Push Tokens, Analysis Endpoints
 */

import { randomUUID } from 'crypto';
import { apiFetch, getAccessToken, getEnv, ensureContact, writeReport } from './_shared.mjs';

const rid = randomUUID();

async function main() {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const token = await getAccessToken();

  const tests = [];
  let exitCode = 0;
  const lines = [
    '# E2E Test: Advanced Features',
    '',
    `- **Run ID**: ${rid}`,
    `- **Timestamp**: ${new Date().toISOString()}`,
    `- **Backend**: ${BASE}`,
    `- **Origin**: ${ORIGIN}`,
    '',
    '## Test Results',
    '',
  ];

  // Setup: Ensure we have a test contact
  let testContactId = null;
  try {
    const { id } = await ensureContact({ name: `E2E Advanced ${rid.slice(0, 8)}`, tags: ['e2e_test'] }, token, BASE, ORIGIN);
    testContactId = id;
  } catch (setupError) {
    lines.push(`- **Setup Error**: ${setupError.message}`);
    lines.push('');
  }

  // === ALERTS TESTS ===
  lines.push('### Alerts');
  lines.push('');

  // Test 1: List alerts
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/alerts', { token, origin: ORIGIN });
    const pass = res.status === 200 && Array.isArray(json?.alerts);
    tests.push({
      name: 'GET /v1/alerts (list)',
      pass,
      status: res.status,
      ms,
      count: json?.alerts?.length || 0,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'GET /v1/alerts (list)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 2: Set watch status on contact
  if (testContactId) {
    try {
      const payload = { watch_status: 'vip' };
      const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${testContactId}/watch`, {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify(payload),
      });
      const pass = res.status === 200 || res.status === 201;
      tests.push({
        name: 'POST /v1/contacts/:id/watch (set watch status)',
        pass,
        status: res.status,
        ms,
      });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'POST /v1/contacts/:id/watch (set watch status)', pass: false, error: e.message });
      exitCode = 1;
    }
  }

  // === PUSH TOKENS TESTS ===
  lines.push('');
  lines.push('### Push Tokens');
  lines.push('');

  // Test 3: Register push token
  try {
    const payload = {
      token: `ExponentPushToken[test-${rid.slice(0, 8)}]`,
      platform: 'ios',
      device_name: 'Test Device',
    };
    const { res, json, ms } = await apiFetch(BASE, '/v1/push-tokens', {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify(payload),
    });
    const pass = res.status === 200 || res.status === 201;
    tests.push({
      name: 'POST /v1/push-tokens (register)',
      pass,
      status: res.status,
      ms,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'POST /v1/push-tokens (register)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 4: List push tokens
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/push-tokens', { token, origin: ORIGIN });
    const pass = res.status === 200 && Array.isArray(json?.tokens);
    tests.push({
      name: 'GET /v1/push-tokens (list)',
      pass,
      status: res.status,
      ms,
      count: json?.tokens?.length || 0,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'GET /v1/push-tokens (list)', pass: false, error: e.message });
    exitCode = 1;
  }

  // === FEATURE REQUESTS TESTS ===
  lines.push('');
  lines.push('### Feature Requests');
  lines.push('');

  let testFeatureRequestId = null;

  // Test 5: Create feature request
  try {
    const payload = {
      title: `Test Feature ${rid.slice(0, 8)}`,
      description: 'This is a test feature request for E2E testing',
      category: 'enhancement',
    };
    const { res, json, ms } = await apiFetch(BASE, '/v1/feature-requests', {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify(payload),
    });
    const pass = (res.status === 200 || res.status === 201) && json?.request?.id;
    if (pass) testFeatureRequestId = json.request.id;
    tests.push({
      name: 'POST /v1/feature-requests (create)',
      pass,
      status: res.status,
      ms,
      request_id: json?.request?.id,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'POST /v1/feature-requests (create)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 6: List feature requests
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/feature-requests', { token, origin: ORIGIN });
    const pass = res.status === 200 && Array.isArray(json?.requests);
    tests.push({
      name: 'GET /v1/feature-requests (list)',
      pass,
      status: res.status,
      ms,
      count: json?.requests?.length || 0,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'GET /v1/feature-requests (list)', pass: false, error: e.message });
    exitCode = 1;
  }

  // Test 7: Vote on feature request
  if (testFeatureRequestId) {
    try {
      const { res, json, ms } = await apiFetch(BASE, `/v1/feature-requests/${testFeatureRequestId}/vote`, {
        method: 'POST',
        token,
        origin: ORIGIN,
      });
      const pass = res.status === 200 || res.status === 201;
      tests.push({
        name: 'POST /v1/feature-requests/:id/vote (vote)',
        pass,
        status: res.status,
        ms,
      });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'POST /v1/feature-requests/:id/vote (vote)', pass: false, error: e.message });
      exitCode = 1;
    }
  }

  // === FEATURE BUCKETS TESTS ===
  lines.push('');
  lines.push('### Feature Buckets');
  lines.push('');

  // Test 8: List feature buckets
  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/feature-buckets?sort=hot', { token, origin: ORIGIN });
    const pass = res.status === 200 && Array.isArray(json?.buckets);
    tests.push({
      name: 'GET /v1/feature-buckets (list)',
      pass,
      status: res.status,
      ms,
      count: json?.buckets?.length || 0,
    });
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'GET /v1/feature-buckets (list)', pass: false, error: e.message });
    exitCode = 1;
  }

  // === ANALYSIS ENDPOINTS TESTS ===
  lines.push('');
  lines.push('### Analysis Endpoints');
  lines.push('');

  // Test 9: Analyze contact
  if (testContactId) {
    try {
      const payload = { mode: 'quick' };
      const { res, json, ms } = await apiFetch(BASE, '/v1/agent/analyze/contact', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify({ contact_id: testContactId, ...payload }),
      });
      const pass = res.status === 200;
      tests.push({
        name: 'POST /v1/agent/analyze/contact (analyze)',
        pass,
        status: res.status,
        ms,
      });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'POST /v1/agent/analyze/contact (analyze)', pass: false, error: e.message });
      exitCode = 1;
    }
  }

  // Test 10: Get context summary
  if (testContactId) {
    try {
      const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${testContactId}/context-summary`, {
        token,
        origin: ORIGIN,
      });
      const pass = res.status === 200;
      tests.push({
        name: 'GET /v1/contacts/:id/context-summary',
        pass,
        status: res.status,
        ms,
      });
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: 'GET /v1/contacts/:id/context-summary', pass: false, error: e.message });
      exitCode = 1;
    }
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
      if (t.count !== undefined) lines.push(`- **Count**: ${t.count}`);
      if (t.request_id) lines.push(`- **Request ID**: ${t.request_id}`);
    }
    lines.push('');
  }

  await writeReport(lines, 'test/agent/reports', 'e2e_advanced_features');
  
  if (exitCode === 0) {
    console.log(`✅ All advanced features tests passed`);
  } else {
    console.error(`❌ Some advanced features tests failed`);
  }

  process.exit(exitCode);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
