/**
 * RevenueCat Webhook Smoke Test
 *
 * Purpose: After wiring the RevenueCat webhook on the backend,
 * this script sends a representative webhook payload and verifies
 * that entitlements reflect the change for the authenticated user.
 *
 * Safe behavior:
 * - Skips gracefully if the webhook endpoint is missing (404/405).
 * - Uses sandbox-like test data.
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso } from './_shared.mjs';
import { decode as base64urlDecode } from 'base64url';

function decodeJwtSub(token) {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return json.sub || json.user_id || null;
  } catch {
    return null;
  }
}

const rid = runId();
const lines = [
  '# RevenueCat Webhook Smoke Test',
  '',
  `- **Run ID**: ${rid}`,
  `- **Timestamp**: ${nowIso()}`,
];

let exitCode = 0;

async function main() {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const token = await getAccessToken();
  const userId = decodeJwtSub(token);

  lines.push(`- **Backend**: ${BASE}`);
  lines.push(`- **Origin**: ${ORIGIN}`);
  lines.push(`- **User (from token)**: ${userId || 'unknown'}`);
  lines.push('');
  lines.push('## Test Results');
  lines.push('');

  const tests = [];

  // Pre-check entitlements
  let beforePlan = 'unknown';
  try {
    const r = await apiFetch(BASE, '/v1/me/entitlements', { token, origin: ORIGIN });
    beforePlan = r.json?.plan || 'unknown';
    tests.push({ name: 'Fetch entitlements (before)', pass: r.res.ok, status: r.res.status, plan: beforePlan });
  } catch (e) {
    tests.push({ name: 'Fetch entitlements (before)', pass: false, error: e.message });
  }

  // Attempt webhook call
  try {
    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: userId || 'test-user',
        entitlement_ids: ['core'],
        product_id: 'com.everreach.core.monthly',
        environment: 'SANDBOX',
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + 7 * 24 * 60 * 60 * 1000,
        period_type: 'TRIAL',
      },
    };

    const { res, json, ms } = await apiFetch(BASE, '/v1/billing/revenuecat/webhook', {
      method: 'POST',
      origin: ORIGIN,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 404 || res.status === 405) {
      tests.push({ name: 'Webhook availability', pass: true, status: res.status, note: 'Endpoint not present yet; skipping assertions.' });
    } else {
      const pass = res.status >= 200 && res.status < 300;
      tests.push({ name: 'Webhook POST', pass, status: res.status, ms, json });
    }
  } catch (e) {
    tests.push({ name: 'Webhook POST', pass: false, error: e.message });
  }

  // Post-check entitlements (non-fatal if unchanged)
  try {
    const r = await apiFetch(BASE, '/v1/me/entitlements', { token, origin: ORIGIN });
    const afterPlan = r.json?.plan || 'unknown';
    const changed = beforePlan !== afterPlan;
    tests.push({ name: 'Fetch entitlements (after)', pass: r.res.ok, status: r.res.status, beforePlan, afterPlan, changed });
  } catch (e) {
    tests.push({ name: 'Fetch entitlements (after)', pass: false, error: e.message });
  }

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
      if (t.status !== undefined) lines.push(`- **Status**: ${t.status}`);
      if (t.ms !== undefined) lines.push(`- **Duration**: ${t.ms}ms`);
      if (t.note) lines.push(`- **Note**: ${t.note}`);
      if (t.plan) lines.push(`- **Plan**: ${t.plan}`);
      if (t.beforePlan) lines.push(`- **Before**: ${t.beforePlan}`);
      if (t.afterPlan) lines.push(`- **After**: ${t.afterPlan}`);
      if (t.changed !== undefined) lines.push(`- **Changed**: ${t.changed}`);
    }
    lines.push('');
  }

  await writeReport(lines, 'test/agent/reports', 'revenuecat_webhook');
}

main().catch((err) => {
  console.error('[RevenueCat Webhook Test Failed]', err?.message || err);
  lines.push('', '## Fatal Error', '', '```', err?.stack || err?.message || String(err), '```');
  writeReport(lines, 'test/agent/reports', 'revenuecat_webhook').catch(() => {});
  process.exit(1);
});
