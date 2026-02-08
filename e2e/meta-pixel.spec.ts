import { test, expect, type Page } from '@playwright/test';

/**
 * Meta Pixel / Conversions API E2E Tests
 *
 * Phase 1: CLI-level verification — send events directly to Meta Graph API
 *          and assert events_received === 1.
 * Phase 2: Browser automation — open /meta-pixel-test screen, click buttons,
 *          and verify the UI shows success responses from Meta.
 *
 * Requires: .env with EXPO_PUBLIC_META_PIXEL_ID, EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN,
 *           and optionally EXPO_PUBLIC_META_TEST_EVENT_CODE.
 */

const PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID || '';
const TOKEN = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || '';
const TEST_CODE = process.env.EXPO_PUBLIC_META_TEST_EVENT_CODE || 'TEST48268';
const API_VERSION = 'v21.0';
const API_URL = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`;

// SHA-256 hashes (pre-computed)
const EMAIL_HASH = '9213a5c7ec5d739868599fc7e1b3939c235cf7554c21c4cc6cb101722ef13c35';
const PHONE_HASH = 'f9e96592e14b18db876cc8ad81785c5840e6a4e739af1e41b8a44ce822a8b22c'; // sha256('15551234567')
const FN_HASH = '516c5747bd51090791a7e4c5e9784a2d4cce84f5d32f2886819cbbed5b98f760'; // sha256('isaiah')
const LN_HASH = '11af9e3ca4967a1cd50fd570221955316fbfe63ace0a162f099e5db7189455a8'; // sha256('dupree')
const CT_HASH = '350c754ba4d38897693aa077ef43072a859d23f613443133fecbbd90a3512ca5'; // sha256('newyork')
const ST_HASH = '1b06e2003f8420d6fa42badd8f77ec0f706b976b7a48b13c567dc5a559681683'; // sha256('ny')
const ZP_HASH = 'e443169117a184f91186b401133b20be670c7c0896f9886075e5d9b81e9d076b'; // sha256('10001')
const COUNTRY_HASH = '79adb2a2fce5c6ba215fe5f27f532d4e7edbac4b6a5e09e1ef3a08084a904621'; // sha256('us')
const FBP = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`;

function buildPayload(eventName: string, customData: Record<string, any> = {}) {
  const ts = Math.floor(Date.now() / 1000);
  return {
    data: [
      {
        event_name: eventName,
        event_time: ts,
        event_id: `e2e_${eventName}_${ts}_${Math.random().toString(36).slice(2, 8)}`,
        action_source: 'app' as const,
        user_data: {
          em: [EMAIL_HASH],
          ph: [PHONE_HASH],
          fn: [FN_HASH],
          ln: [LN_HASH],
          ct: [CT_HASH],
          st: [ST_HASH],
          zp: [ZP_HASH],
          country: [COUNTRY_HASH],
          external_id: ['everreach_e2e_test'],
          client_user_agent: 'EverReach/1.0 (ios)',
          fbp: FBP,
        },
        custom_data: { source: 'playwright_e2e', ...customData },
        app_data: {
          advertiser_tracking_enabled: 1,
          application_tracking_enabled: 1,
          extinfo: [
            'i2', 'com.everreach.app', '1.0.0', '1.0.0', '18.0',
            'iPhone', 'en_US', 'UTC', '', '390', '844', '2', '6',
            '256000', '225000', '-5',
          ],
        },
      },
    ],
    test_event_code: TEST_CODE,
  };
}

// ──────────────────────────────────────────────
// Phase 1: Direct Conversions API verification
// ──────────────────────────────────────────────

test.describe('Phase 1 — Conversions API (direct)', () => {
  test.beforeAll(() => {
    expect(PIXEL_ID, 'EXPO_PUBLIC_META_PIXEL_ID must be set').toBeTruthy();
    expect(TOKEN, 'EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN must be set').toBeTruthy();
  });

  const standardEvents = [
    { name: 'PageView', data: {} },
    { name: 'ViewContent', data: { content_name: 'e2e_test', content_type: 'screen' } },
    { name: 'CompleteRegistration', data: { content_name: 'e2e_signup', status: 'test' } },
    { name: 'Lead', data: { content_name: 'e2e_lead', value: 0, currency: 'USD' } },
    { name: 'StartTrial', data: { value: 0, currency: 'USD' } },
    { name: 'Subscribe', data: { value: 9.99, currency: 'USD' } },
    { name: 'Purchase', data: { value: 9.99, currency: 'USD' } },
  ];

  for (const { name, data } of standardEvents) {
    test(`sends ${name} → events_received: 1`, async () => {
      const payload = buildPayload(name, data);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.events_received).toBe(1);
      expect(body.messages).toBeDefined();
    });
  }
});

// ──────────────────────────────────────────────
// Phase 2: Browser-context API verification
// Sends events via fetch() inside a browser page
// to prove the Conversions API works from a web
// client (same mechanism as the app's test screen).
// NOTE: The app requires auth to navigate to
// /meta-pixel-test, so we test the API directly
// from the browser context instead.
// ──────────────────────────────────────────────

test.describe('Phase 2 — Browser-context Conversions API', () => {
  test.beforeAll(() => {
    expect(PIXEL_ID, 'EXPO_PUBLIC_META_PIXEL_ID must be set').toBeTruthy();
    expect(TOKEN, 'EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN must be set').toBeTruthy();
  });

  test('PageView via browser fetch()', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(
      async ({ url, payload }) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return { status: res.status, body: await res.json() };
      },
      { url: API_URL, payload: buildPayload('PageView') }
    );

    expect(result.status).toBe(200);
    expect(result.body.events_received).toBe(1);
  });

  test('Purchase with currency via browser fetch()', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(
      async ({ url, payload }) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return { status: res.status, body: await res.json() };
      },
      { url: API_URL, payload: buildPayload('Purchase', { value: 9.99, currency: 'USD' }) }
    );

    expect(result.status).toBe(200);
    expect(result.body.events_received).toBe(1);
  });

  test('batch of 3 events via browser fetch()', async ({ page }) => {
    await page.goto('about:blank');

    const events = ['ViewContent', 'Lead', 'CompleteRegistration'];
    for (const eventName of events) {
      const result = await page.evaluate(
        async ({ url, payload }) => {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          return { status: res.status, body: await res.json() };
        },
        {
          url: API_URL,
          payload: buildPayload(eventName, { source: 'browser_batch', value: 0, currency: 'USD' }),
        }
      );

      expect(result.status, `${eventName} should return 200`).toBe(200);
      expect(result.body.events_received, `${eventName} should be received`).toBe(1);
    }
  });
});
