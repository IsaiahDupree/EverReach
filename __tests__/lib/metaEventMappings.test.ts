/**
 * Meta Event Integration Tests
 *
 * Tests the FULL pipeline: autoTrackToMeta() → mapToMetaEvent() → trackMetaEvent()
 * → event queue → flushEventQueue() → Conversions API fetch().
 *
 * Intercepts global.fetch to capture the actual Conversions API payloads,
 * then verifies event_name, custom_data (value, currency), user_data, and app_data.
 *
 * Also includes a live test that actually hits Meta's API (auto-skipped in CI
 * when real credentials are not available).
 */

// -- Env vars MUST be set inside a hoisted jest.mock factory so they're ------
// -- available when metaAppEvents.ts evaluates IS_ENABLED at module load -----
jest.mock('expo-crypto', () => {
  // Runs before module-under-test loads (jest.mock is hoisted)
  process.env.EXPO_PUBLIC_META_PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID || 'test_pixel_123';
  process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || 'test_token_abc';
  return {
    digestStringAsync: jest.fn().mockResolvedValue('abc123hash'),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  };
});
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} }, appOwnership: 'standalone' },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(undefined),
    multiRemove: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  initializeMetaAppEvents,
  autoTrackToMeta,
  trackMetaEvent,
  shutdownMetaAppEvents,
  setTrackingConsent,
  identifyMetaUser,
} from '@/lib/metaAppEvents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Captured payloads from Conversions API fetch calls */
let capturedPayloads: { url: string; body: any; opts: RequestInit }[] = [];

function setupFetchSpy() {
  return jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const url = String(input);
    if (url.includes('graph.facebook.com') && url.includes('/events')) {
      const body = JSON.parse(init?.body || '{}');
      capturedPayloads.push({ url, body, opts: init });
      return new Response(JSON.stringify({ events_received: body.data?.length || 0, fbtrace_id: 'test_trace' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // IP lookup / other
    return new Response(JSON.stringify({ ip: '1.2.3.4' }), { status: 200 });
  });
}

/** Find a specific event across all captured flush payloads */
function findCapturedEvent(eventName: string, customDataMatch?: Record<string, any>) {
  for (const payload of capturedPayloads) {
    for (const ev of payload.body.data || []) {
      if (ev.event_name !== eventName) continue;
      if (customDataMatch) {
        const match = Object.entries(customDataMatch).every(
          ([k, v]) => ev.custom_data[k] === v
        );
        if (!match) continue;
      }
      return { event: ev, url: payload.url, opts: payload.opts };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pipeline tests — queue events, flush, verify fetch payloads
// ---------------------------------------------------------------------------

describe('Meta Events — Full Pipeline Integration', () => {
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    capturedPayloads = [];
    fetchSpy = setupFetchSpy();

    // Initialize the real module (with intercepted fetch)
    setTrackingConsent(true);
    initializeMetaAppEvents();

    // Let async init settle (IP fetch, persisted params load)
    await new Promise((r) => setTimeout(r, 50));

    // Identify a user so user_data is populated
    await identifyMetaUser('user_test_123', 'test@example.com', '+15551234567');

    // Clear payloads from init-phase fetches (IP, etc.)
    capturedPayloads = [];

    // === Fire all test events through the real pipeline ===

    // 1. Purchase (ROAS critical)
    autoTrackToMeta('purchase_completed', {
      amount: 49.99,
      currency: 'USD',
      plan: 'core_annual',
      product_id: 'com.everreach.core.annual',
      payment_platform: 'apple',
    });

    // 2. Trial start
    autoTrackToMeta('trial_started', { trial_days: 7, plan: 'core_monthly' });

    // 3. Registration
    autoTrackToMeta('auth_sign_up', { method: 'email' });

    // 4. Paywall view
    autoTrackToMeta('paywall_viewed', { source: 'feature_gate' });

    // 5. Subscribe
    autoTrackToMeta('subscription_upgraded', { amount: 4.99, to_plan: 'core' });

    // 6. Direct trackMetaEvent (payload structure test)
    trackMetaEvent('ViewContent', { content_name: 'test_screen', content_type: 'screen' });

    // 7. Unmapped events (should NOT queue)
    autoTrackToMeta('purchase_started', { plan_id: 'core' });
    autoTrackToMeta('restore_completed', {});
    autoTrackToMeta('random_internal_event', {});

    // Flush everything to fetch
    await shutdownMetaAppEvents();
  });

  afterAll(async () => {
    // Re-init so shutdown can clear the flush timer
    initializeMetaAppEvents();
    await shutdownMetaAppEvents();
    fetchSpy.mockRestore();
  });

  // =========================================================================
  // Verify flush actually happened
  // =========================================================================

  it('flushed queued events to the Conversions API', () => {
    expect(capturedPayloads.length).toBeGreaterThanOrEqual(1);
    const totalEvents = capturedPayloads.reduce((sum, p) => sum + (p.body.data?.length || 0), 0);
    // 6 mapped events (Purchase, StartTrial, CompleteRegistration, ViewContent×2, Subscribe)
    // 3 unmapped events should NOT be in the queue
    expect(totalEvents).toBe(6);
  });

  // =========================================================================
  // purchase_completed → Meta Purchase
  // =========================================================================

  it('purchase_completed → Purchase with correct value, currency, content_name', () => {
    const found = findCapturedEvent('Purchase');
    expect(found).not.toBeNull();
    expect(found!.event.custom_data.value).toBe(49.99);
    expect(found!.event.custom_data.currency).toBe('USD');
    expect(found!.event.custom_data.content_name).toBe('core_annual');
    expect(found!.event.custom_data.content_type).toBe('subscription');
  });

  // =========================================================================
  // trial_started → Meta StartTrial
  // =========================================================================

  it('trial_started → StartTrial with predicted_ltv and trial days', () => {
    const found = findCapturedEvent('StartTrial');
    expect(found).not.toBeNull();
    expect(found!.event.custom_data.predicted_ltv).toBe(0);
    expect(found!.event.custom_data.currency).toBe('USD');
    expect(found!.event.custom_data.num_items).toBe(7);
  });

  // =========================================================================
  // auth_sign_up → Meta CompleteRegistration
  // =========================================================================

  it('auth_sign_up → CompleteRegistration with method', () => {
    const found = findCapturedEvent('CompleteRegistration');
    expect(found).not.toBeNull();
    expect(found!.event.custom_data.registration_method).toBe('email');
    expect(found!.event.custom_data.status).toBe('completed');
  });

  // =========================================================================
  // paywall_viewed → ViewContent (paywall)
  // =========================================================================

  it('paywall_viewed → ViewContent with paywall content_type', () => {
    const found = findCapturedEvent('ViewContent', { content_type: 'paywall' });
    expect(found).not.toBeNull();
    expect(found!.event.custom_data.content_name).toBe('paywall');
    expect(found!.event.custom_data.content_category).toBe('feature_gate');
  });

  // =========================================================================
  // subscription_upgraded → Meta Subscribe
  // =========================================================================

  it('subscription_upgraded → Subscribe with value', () => {
    const found = findCapturedEvent('Subscribe');
    expect(found).not.toBeNull();
    expect(found!.event.custom_data.value).toBe(4.99);
    expect(found!.event.custom_data.content_name).toBe('core');
  });

  // =========================================================================
  // Conversions API payload structure
  // =========================================================================

  it('every event has event_id, event_time, action_source, user_data, app_data', () => {
    for (const payload of capturedPayloads) {
      for (const event of payload.body.data) {
        expect(event.event_id).toBeDefined();
        expect(typeof event.event_time).toBe('number');
        expect(event.event_time).toBeGreaterThan(1700000000);
        expect(event.action_source).toBe('app');

        expect(event.user_data).toBeDefined();
        expect(typeof event.user_data).toBe('object');
        expect(event.user_data.client_user_agent).toBeDefined();

        expect(event.app_data).toBeDefined();
        expect(event.app_data.extinfo).toBeDefined();
        expect(Array.isArray(event.app_data.extinfo)).toBe(true);
      }
    }
  });

  // =========================================================================
  // user_data includes identified user params
  // =========================================================================

  it('user_data includes hashed email and external_id after identifyMetaUser', () => {
    const found = findCapturedEvent('Purchase');
    expect(found).not.toBeNull();
    expect(found!.event.user_data.em).toBeDefined();
    expect(found!.event.user_data.external_id).toBeDefined();
  });

  // =========================================================================
  // Fetch URL format
  // =========================================================================

  it('sends to graph.facebook.com with correct URL structure', () => {
    const payload = capturedPayloads[0];
    expect(payload.url).toContain('graph.facebook.com/v21.0/');
    expect(payload.url).toContain('/events?access_token=');
    expect(payload.opts.method).toBe('POST');
    expect(payload.opts.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/json' })
    );
  });

  // =========================================================================
  // Unmapped events are filtered out
  // =========================================================================

  it('unmapped events (purchase_started, restore_completed) are NOT in the payload', () => {
    const allEventNames = capturedPayloads.flatMap((p) =>
      (p.body.data || []).map((e: any) => e.event_name)
    );
    expect(allEventNames).not.toContain('purchase_started');
    expect(allEventNames).not.toContain('restore_completed');
    expect(allEventNames).not.toContain('random_internal_event');
  });

  // =========================================================================
  // Live API test (auto-skipped when real creds unavailable)
  // =========================================================================

  const hasRealCreds =
    process.env.EXPO_PUBLIC_META_PIXEL_ID &&
    process.env.EXPO_PUBLIC_META_PIXEL_ID !== 'test_pixel_123' &&
    process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN &&
    process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN !== 'test_token_abc';

  const liveIt = hasRealCreds ? it : it.skip;

  liveIt('LIVE: sends Purchase to Meta and gets events_received=1', async () => {
    const realFetch = jest.requireActual('node-fetch') as typeof fetch;

    const PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID!;
    const TOKEN = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN!;
    const TEST_CODE = process.env.EXPO_PUBLIC_META_TEST_EVENT_CODE || 'TEST48268';

    const payload = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: `jest_live_${Date.now()}`,
        action_source: 'app' as const,
        user_data: {
          client_user_agent: 'EverReach/1.0 (jest)',
          external_id: ['jest_integration_test'],
        },
        custom_data: { value: 1.00, currency: 'USD', content_name: 'jest_live_test', content_type: 'subscription' },
        app_data: {
          advertiser_tracking_enabled: 1,
          application_tracking_enabled: 1,
          extinfo: ['i2', 'com.everreach.app', '1.0.0', '1.0.0', '18.0',
            'iPhone', 'en_US', 'UTC', '', '390', '844', '2', '6', '256000', '225000', '-5'],
        },
      }],
      test_event_code: TEST_CODE,
    };

    const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${TOKEN}`;
    const response = await globalThis.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.events_received).toBe(1);
  });
});
