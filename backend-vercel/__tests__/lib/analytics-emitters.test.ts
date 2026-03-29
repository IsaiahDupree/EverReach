/**
 * Tests for analytics emitter fan-out system
 * Covers: emitAll behavior, zero-destination warning, per-emitter error isolation,
 *         Meta CAPI event mapping, user data hashing
 */

import type { NormalizedRcEvent } from '@/lib/analytics/emitters/base';

// Mock fetch before any imports that use it
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeEvent(overrides: Partial<NormalizedRcEvent> = {}): NormalizedRcEvent {
  return {
    kind: 'initial_purchase',
    event_id: 'evt_test_001',
    user_id: 'user_abc123',
    product_id: 'com.everreach.pro.monthly',
    entitlements: ['pro'],
    environment: 'PRODUCTION',
    platform: 'app_store',
    period_type: 'NORMAL',
    status: 'active',
    purchased_at_ms: 1_700_000_000_000,
    country_code: 'US',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetModules();
  mockFetch.mockReset();
  delete process.env.ANALYTICS_ENABLE_META;
  delete process.env.ANALYTICS_ENABLE_GA4;
  delete process.env.ANALYTICS_ENABLE_TIKTOK;
  delete process.env.META_PIXEL_ID;
  delete process.env.META_CONVERSIONS_API_TOKEN;
});

// ── Zero destinations ────────────────────────────────────────────────────

describe('emitAll — zero destinations', () => {
  it('warns and returns early when no env flags are set', async () => {
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await emitAll(makeEvent());

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no destinations are enabled'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('initial_purchase'));
    expect(mockFetch).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('includes user_id in the warning message', async () => {
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await emitAll(makeEvent({ user_id: 'u_specific_user' }));

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('u_specific_user'));
    warnSpy.mockRestore();
  });

  it('does not throw when no destinations configured', async () => {
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(emitAll(makeEvent())).resolves.not.toThrow();
  });
});

// ── Meta emitter enabled ─────────────────────────────────────────────────

describe('emitAll — Meta CAPI', () => {
  beforeEach(() => {
    process.env.ANALYTICS_ENABLE_META = 'true';
    process.env.META_PIXEL_ID = 'px_test_123';
    process.env.META_CONVERSIONS_API_TOKEN = 'tok_test_abc';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ events_received: 1 }),
    });
  });

  it('calls Meta CAPI for INITIAL_PURCHASE in production', async () => {
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('graph.facebook.com');
    expect(url).toContain('px_test_123');
    const body = JSON.parse(opts.body);
    expect(body.data[0].event_name).toBe('Purchase');
  });

  it('sends access_token in the URL', async () => {
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent());

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('access_token=tok_test_abc');
  });

  it('skips SANDBOX events — no fetch call', async () => {
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent({ environment: 'SANDBOX' }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not throw when CAPI returns HTTP error — logs instead', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, text: async () => 'Bad request' });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await expect(emitAll(makeEvent())).resolves.not.toThrow();
    expect(errSpy).toHaveBeenCalledWith('[AnalyticsEmitter] destination failed:', expect.stringContaining('Meta CAPI'));
    errSpy.mockRestore();
  });

  it('does not throw when fetch itself throws — logs instead', async () => {
    mockFetch.mockRejectedValue(new Error('network timeout'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await expect(emitAll(makeEvent())).resolves.not.toThrow();
    errSpy.mockRestore();
  });

  it('silently returns when META_PIXEL_ID is missing', async () => {
    delete process.env.META_PIXEL_ID;
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('silently returns when both META_CONVERSIONS_API_TOKEN and META_CAPI_TOKEN are missing', async () => {
    delete process.env.META_CONVERSIONS_API_TOKEN;
    delete process.env.META_CAPI_TOKEN; // emitter falls back to META_CAPI_TOKEN too
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('includes hashed email in user_data when email is present', async () => {
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent({ email: 'test@example.com' }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const ud = body.data[0].user_data;
    expect(ud.em).toBeDefined();
    expect(ud.em[0]).toHaveLength(64);  // SHA-256 hex
    expect(ud.em[0]).not.toContain('@'); // must not be plaintext
  });

  it('includes fbc wrapped in fb. format when raw fbclid present', async () => {
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent({ fbc: 'raw_click_id_abc' }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data[0].user_data.fbc).toMatch(/^fb\./);
  });

  it('passes fbc through unchanged when already in fb. format', async () => {
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent({ fbc: 'fb.1.1700000000.click123' }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data[0].user_data.fbc).toBe('fb.1.1700000000.click123');
  });

  it('sends test_event_code when META_TEST_EVENT_CODE is set', async () => {
    process.env.META_TEST_EVENT_CODE = 'TEST12345';
    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.test_event_code).toBe('TEST12345');
    delete process.env.META_TEST_EVENT_CODE;
  });
});

// ── Event kind → Meta event name mapping ────────────────────────────────

describe('emitAll — event kind mapping', () => {
  const mappings: Array<[NormalizedRcEvent['kind'], string]> = [
    ['initial_purchase', 'Purchase'],
    ['trial_started', 'StartTrial'],
    ['renewal', 'Purchase'],
    ['cancellation', 'Cancel'],
    ['expiration', 'Churn'],
    ['refund', 'Refund'],
    ['billing_issue', 'BillingIssue'],
    ['uncancellation', 'Reactivate'],
    ['product_change', 'Subscribe'],
    ['non_subscription_purchase', 'Purchase'],
  ];

  test.each(mappings)('kind=%s → Meta event_name=%s', async (kind, expectedMetaEvent) => {
    jest.resetModules();
    process.env.ANALYTICS_ENABLE_META = 'true';
    process.env.META_PIXEL_ID = 'px_map';
    process.env.META_CONVERSIONS_API_TOKEN = 'tok_map';
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events_received: 1 }) });

    const { emitAll } = await import('@/lib/analytics/emitters/index');
    await emitAll(makeEvent({ kind, environment: 'PRODUCTION' }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data[0].event_name).toBe(expectedMetaEvent);
    mockFetch.mockReset();
  });
});
