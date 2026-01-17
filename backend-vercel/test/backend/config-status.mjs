/**
 * Ops Config Status E2E (no mocks)
 * Verifies the endpoint returns booleans for core + analytics + RevenueCat env keys.
 */
import { getAccessToken, apiFetch, writeReport, nowIso, logOk, logFail, assert } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const tests = [];
const reportLines = [];

function t(name, fn) {
  const t0 = Date.now();
  return fn().then(() => {
    const dt = Date.now() - t0; tests.push({ name, passed: true, duration: dt }); logOk(name);
  }).catch((e) => {
    const dt = Date.now() - t0; tests.push({ name, passed: false, duration: dt, error: e?.message || String(e) });
    logFail(`${name}: ${e?.message || e}`);
    reportLines.push(`### ❌ ${name}`, '', `**Error**: ${e?.message || e}`, '');
  });
}

async function main() {
  reportLines.push('# E2E Test: Ops Config Status', '', `**Started**: ${nowIso()}`, `**API Base**: ${API_BASE}`, '');
  let exitCode = 0;
  try {
    const token = await getAccessToken();

    await t('GET /ops/config-status', async () => {
      const { res, json } = await apiFetch(API_BASE, '/api/v1/ops/config-status', { token });
      assert(res.status === 200, `expected 200, got ${res.status}`);
      assert(json?.envs && typeof json.envs === 'object', 'missing envs object');

      const mustHaveKeys = [
        // Core
        'SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_JWT_SECRET',
        // Email/Stripe
        'RESEND_API_KEY','EMAIL_FROM','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET',
        // Analytics flags + PostHog
        'POSTHOG_PROJECT_KEY','POSTHOG_HOST','ANALYTICS_ENABLE_META','ANALYTICS_ENABLE_GA4','ANALYTICS_ENABLE_TIKTOK',
        // Meta / GA4 / TikTok
        'META_PIXEL_ID','META_CAPI_TOKEN','META_PIXEL_ID_SANDBOX','META_CAPI_TOKEN_SANDBOX','META_USE_SANDBOX',
        'GA4_MEASUREMENT_ID','GA4_API_SECRET','GA4_DEBUG',
        'TIKTOK_PIXEL_ID','TIKTOK_ACCESS_TOKEN','TIKTOK_PIXEL_ID_SANDBOX','TIKTOK_ACCESS_TOKEN_SANDBOX','TIKTOK_USE_SANDBOX',
        // RevenueCat
        'REVENUECAT_WEBHOOK_SECRET','REVENUECAT_WEBHOOK_AUTH_TOKEN',
      ];
      for (const k of mustHaveKeys) {
        assert(Object.prototype.hasOwnProperty.call(json.envs, k), `missing key ${k}`);
        assert(typeof json.envs[k] === 'boolean', `key ${k} must be boolean`);
      }
    });
  } catch (e) {
    exitCode = 1;
    logFail(e?.message || String(e));
  }
  await writeReport('config-status', reportLines, tests, exitCode);
  if (exitCode !== 0) process.exit(exitCode);
}

main().catch((e) => { console.error('Fatal', e); process.exit(1); });
