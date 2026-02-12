/**
 * Meta CAPI Server-Side Emitter — Integration Tests
 *
 * Tests the full emitter pipeline: NormalizedRcEvent → mapToMetaEvent() →
 * buildUserData() → sendToMeta() → fetch() with correct CAPI payload.
 *
 * Intercepts global.fetch to capture the actual Conversions API payloads.
 */

// Set env before import
process.env.META_PIXEL_ID = 'test_server_pixel_123';
process.env.META_CONVERSIONS_API_TOKEN = 'test_server_token_abc';

import type { NormalizedRcEvent } from '../../../backend-vercel/lib/analytics/emitters/base';

// We need to dynamically import the emitter after setting env
let metaCAPIEmitter: any;
let emitAll: any;

/** Captured CAPI fetch payloads */
let capturedCalls: { url: string; body: any }[] = [];

describe('Meta CAPI Server-Side Emitter', () => {
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    capturedCalls = [];
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
      const url = String(input);
      if (url.includes('graph.facebook.com') && url.includes('/events')) {
        const body = JSON.parse(init?.body || '{}');
        capturedCalls.push({ url, body });
        return new Response(
          JSON.stringify({ events_received: body.data?.length || 0 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    });

    // Dynamic import after env and fetch mock are set
    const mod = await import('../../../backend-vercel/lib/analytics/emitters/meta-capi');
    metaCAPIEmitter = mod.metaCAPIEmitter;
    const indexMod = await import('../../../backend-vercel/lib/analytics/emitters/index');
    emitAll = indexMod.emitAll;
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  beforeEach(() => {
    capturedCalls = [];
    fetchSpy.mockClear();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function makeEvent(overrides: Partial<NormalizedRcEvent> = {}): NormalizedRcEvent {
    return {
      kind: 'initial_purchase',
      event_id: 'evt_test_123',
      user_id: 'user_abc',
      product_id: 'com.everreach.core.annual',
      entitlements: ['core'],
      environment: 'PRODUCTION',
      platform: 'app_store',
      period_type: 'NORMAL',
      status: 'active',
      purchased_at_ms: Date.now(),
      expiration_at_ms: Date.now() + 365 * 24 * 60 * 60 * 1000,
      country_code: 'US',
      ...overrides,
    };
  }

  function findEvent(eventName: string) {
    for (const call of capturedCalls) {
      for (const ev of call.body.data || []) {
        if (ev.event_name === eventName) return ev;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Event mapping tests
  // ---------------------------------------------------------------------------

  it('INITIAL_PURCHASE → Purchase', async () => {
    await metaCAPIEmitter.emit(makeEvent({ kind: 'initial_purchase' }));

    expect(capturedCalls.length).toBe(1);
    const ev = findEvent('Purchase');
    expect(ev).not.toBeNull();
    expect(ev.custom_data.content_type).toBe('subscription');
    expect(ev.custom_data.currency).toBe('USD');
    expect(ev.custom_data.content_name).toBe('com.everreach.core.annual');
    expect(ev.custom_data.source).toBe('revenuecat_webhook');
    expect(ev.action_source).toBe('app');
  });

  it('trial_started → StartTrial', async () => {
    await metaCAPIEmitter.emit(makeEvent({ kind: 'trial_started', period_type: 'TRIAL' }));

    const ev = findEvent('StartTrial');
    expect(ev).not.toBeNull();
    expect(ev.custom_data.predicted_ltv).toBe(0);
    expect(ev.custom_data.currency).toBe('USD');
  });

  it('RENEWAL → Purchase (renewal)', async () => {
    await metaCAPIEmitter.emit(makeEvent({ kind: 'renewal' }));

    const ev = findEvent('Purchase');
    expect(ev).not.toBeNull();
    expect(ev.custom_data.content_type).toBe('subscription_renewal');
  });

  it('CANCELLATION → Cancel', async () => {
    await metaCAPIEmitter.emit(makeEvent({ kind: 'cancellation' }));

    const ev = findEvent('Cancel');
    expect(ev).not.toBeNull();
    expect(ev.custom_data.content_name).toBe('com.everreach.core.annual');
  });

  it('EXPIRATION → Churn', async () => {
    await metaCAPIEmitter.emit(makeEvent({ kind: 'expiration' }));

    const ev = findEvent('Churn');
    expect(ev).not.toBeNull();
  });

  it('BILLING_ISSUE → BillingIssue', async () => {
    await metaCAPIEmitter.emit(makeEvent({ kind: 'billing_issue' }));

    const ev = findEvent('BillingIssue');
    expect(ev).not.toBeNull();
  });

  it('PRODUCT_CHANGE → Subscribe', async () => {
    await metaCAPIEmitter.emit(makeEvent({ kind: 'product_change' }));

    const ev = findEvent('Subscribe');
    expect(ev).not.toBeNull();
    expect(ev.custom_data.content_type).toBe('subscription_change');
  });

  it('UNCANCELLATION → Reactivate', async () => {
    await metaCAPIEmitter.emit(makeEvent({ kind: 'uncancellation' }));

    const ev = findEvent('Reactivate');
    expect(ev).not.toBeNull();
  });

  it('REFUND → Refund', async () => {
    await metaCAPIEmitter.emit(makeEvent({ kind: 'refund' }));

    const ev = findEvent('Refund');
    expect(ev).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Payload structure
  // ---------------------------------------------------------------------------

  it('event_id is prefixed with rc_ to avoid client-side dedup', async () => {
    await metaCAPIEmitter.emit(makeEvent({ event_id: 'my_event_42' }));

    const ev = capturedCalls[0].body.data[0];
    expect(ev.event_id).toBe('rc_my_event_42');
  });

  it('user_data includes hashed external_id and user_agent', async () => {
    await metaCAPIEmitter.emit(makeEvent({ user_id: 'user_xyz' }));

    const ev = capturedCalls[0].body.data[0];
    expect(ev.user_data.external_id).toBeDefined();
    expect(ev.user_data.external_id[0]).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(ev.user_data.client_user_agent).toBe('EverReach-Server/1.0');
  });

  it('custom_data includes platform, period_type, country_code', async () => {
    await metaCAPIEmitter.emit(makeEvent({
      platform: 'app_store',
      period_type: 'NORMAL',
      country_code: 'US',
    }));

    const ev = capturedCalls[0].body.data[0];
    expect(ev.custom_data.platform).toBe('app_store');
    expect(ev.custom_data.period_type).toBe('NORMAL');
    expect(ev.custom_data.country_code).toBe('US');
  });

  it('sends to correct Graph API URL', async () => {
    await metaCAPIEmitter.emit(makeEvent());

    const url = capturedCalls[0].url;
    expect(url).toContain('graph.facebook.com/v21.0/');
    expect(url).toContain('test_server_pixel_123');
    expect(url).toContain('access_token=test_server_token_abc');
  });

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  it('skips SANDBOX events', async () => {
    await metaCAPIEmitter.emit(makeEvent({ environment: 'SANDBOX' }));

    expect(capturedCalls.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // emitAll fan-out
  // ---------------------------------------------------------------------------

  it('emitAll forwards event to Meta CAPI emitter', async () => {
    await emitAll(makeEvent({ kind: 'renewal' }));

    expect(capturedCalls.length).toBe(1);
    const ev = findEvent('Purchase');
    expect(ev).not.toBeNull();
    expect(ev.custom_data.content_type).toBe('subscription_renewal');
  });
});
