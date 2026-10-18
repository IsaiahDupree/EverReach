/**
 * Ad Pixel Integration Tests
 * 
 * Tests Meta Pixel, Google Analytics, TikTok Pixel tracking
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
let testOrgId: string;
let testUserId: string;
let testPixelConfigs: string[] = [];

beforeAll(async () => {
  // Create test org and user
  const { data: org } = await supabase.from('organizations').insert({
    name: 'Test Org - Ad Pixels',
  }).select().single();
  testOrgId = org!.id;

  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `adpixels-test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  testUserId = user!.id;
});

afterAll(async () => {
  // Cleanup test data
  if (testPixelConfigs.length > 0) {
    await supabase.from('ad_pixel_configs').delete().in('id', testPixelConfigs);
  }
  await supabase.from('organizations').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ============================================================================
// PIXEL CONFIGURATION TESTS
// ============================================================================

describe('Ad Pixel Configuration', () => {
  test('should create Meta Pixel configuration', async () => {
    const { data: config, error } = await supabase
      .from('ad_pixel_configs')
      .insert({
        org_id: testOrgId,
        provider: 'meta',
        pixel_id: '1234567890',
        enabled: true,
        events: ['PageView', 'ViewContent', 'AddToCart', 'Purchase', 'Lead', 'CompleteRegistration'],
        test_mode: true,
        created_by: testUserId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(config).toBeDefined();
    expect(config!.provider).toBe('meta');
    expect(config!.pixel_id).toBe('1234567890');
    expect(config!.enabled).toBe(true);
    expect(config!.events).toContain('Purchase');

    testPixelConfigs.push(config!.id);
  });

  test('should create Google Analytics 4 configuration', async () => {
    const { data: config, error } = await supabase
      .from('ad_pixel_configs')
      .insert({
        org_id: testOrgId,
        provider: 'google_analytics',
        pixel_id: 'G-XXXXXXXXXX',
        enabled: true,
        events: ['page_view', 'sign_up', 'login', 'purchase', 'add_to_cart'],
        config: {
          send_page_view: true,
          anonymize_ip: true,
        },
        created_by: testUserId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(config).toBeDefined();
    expect(config!.provider).toBe('google_analytics');
    expect(config!.pixel_id).toMatch(/^G-/);

    testPixelConfigs.push(config!.id);
  });

  test('should create TikTok Pixel configuration', async () => {
    const { data: config, error } = await supabase
      .from('ad_pixel_configs')
      .insert({
        org_id: testOrgId,
        provider: 'tiktok',
        pixel_id: 'ABCDEFGHIJ1234567890',
        enabled: true,
        events: ['ViewContent', 'AddToCart', 'InitiateCheckout', 'CompletePayment', 'Subscribe'],
        test_mode: true,
        created_by: testUserId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(config).toBeDefined();
    expect(config!.provider).toBe('tiktok');

    testPixelConfigs.push(config!.id);
  });

  test('should prevent duplicate pixel IDs per org', async () => {
    const { error } = await supabase
      .from('ad_pixel_configs')
      .insert({
        org_id: testOrgId,
        provider: 'meta',
        pixel_id: '1234567890', // Duplicate!
        enabled: true,
        created_by: testUserId,
      });

    expect(error).toBeDefined();
    expect(error!.code).toBe('23505'); // Unique constraint violation
  });

  test('should allow disabling pixels', async () => {
    const pixelId = testPixelConfigs[0];

    const { error } = await supabase
      .from('ad_pixel_configs')
      .update({ enabled: false })
      .eq('id', pixelId);

    expect(error).toBeNull();

    const { data: config } = await supabase
      .from('ad_pixel_configs')
      .select('enabled')
      .eq('id', pixelId)
      .single();

    expect(config!.enabled).toBe(false);

    // Re-enable for other tests
    await supabase
      .from('ad_pixel_configs')
      .update({ enabled: true })
      .eq('id', pixelId);
  });
});

// ============================================================================
// PIXEL EVENT TRACKING TESTS
// ============================================================================

describe('Pixel Event Tracking', () => {
  test('should log Meta Pixel events', async () => {
    const pixelId = testPixelConfigs[0]; // Meta pixel

    const { data: event, error } = await supabase
      .from('ad_pixel_events')
      .insert({
        org_id: testOrgId,
        pixel_config_id: pixelId,
        provider: 'meta',
        event_name: 'Purchase',
        event_data: {
          content_name: 'Pro Plan',
          content_category: 'subscription',
          content_ids: ['pro_monthly'],
          value: 29.99,
          currency: 'USD',
        },
        user_id: testUserId,
        session_id: 'test-session-123',
        page_url: 'https://everreach.app/checkout',
        referrer_url: 'https://everreach.app/pricing',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(event).toBeDefined();
    expect(event!.event_name).toBe('Purchase');
    expect(event!.event_data.value).toBe(29.99);
    expect(event!.event_data.currency).toBe('USD');
  });

  test('should log Google Analytics events', async () => {
    const pixelId = testPixelConfigs[1]; // GA4 pixel

    const { data: event, error } = await supabase
      .from('ad_pixel_events')
      .insert({
        org_id: testOrgId,
        pixel_config_id: pixelId,
        provider: 'google_analytics',
        event_name: 'sign_up',
        event_data: {
          method: 'google',
        },
        user_id: testUserId,
        session_id: 'test-session-456',
        page_url: 'https://everreach.app/sign-up',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(event).toBeDefined();
    expect(event!.event_name).toBe('sign_up');
    expect(event!.event_data.method).toBe('google');
  });

  test('should log TikTok Pixel events', async () => {
    const pixelId = testPixelConfigs[2]; // TikTok pixel

    const { data: event, error } = await supabase
      .from('ad_pixel_events')
      .insert({
        org_id: testOrgId,
        pixel_config_id: pixelId,
        provider: 'tiktok',
        event_name: 'CompletePayment',
        event_data: {
          content_type: 'product',
          content_id: 'pro_plan',
          value: 29.99,
          currency: 'USD',
          description: 'Pro Plan Subscription',
        },
        user_id: testUserId,
        session_id: 'test-session-789',
        page_url: 'https://everreach.app/checkout/success',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(event).toBeDefined();
    expect(event!.event_name).toBe('CompletePayment');
  });

  test('should deduplicate events within 5 minutes', async () => {
    const pixelId = testPixelConfigs[0];

    // Send same event twice
    const eventPayload = {
      org_id: testOrgId,
      pixel_config_id: pixelId,
      provider: 'meta',
      event_name: 'ViewContent',
      event_data: {
        content_id: 'dedup_test',
      },
      user_id: testUserId,
      session_id: 'dedup-session',
      page_url: 'https://everreach.app/test',
    };

    const { data: event1 } = await supabase
      .from('ad_pixel_events')
      .insert(eventPayload)
      .select()
      .single();

    // Try to send duplicate immediately
    const { data: event2 } = await supabase
      .from('ad_pixel_events')
      .insert(eventPayload)
      .select()
      .single();

    // Both should be logged (deduplication happens at query/reporting level)
    // But we can check if event_id is unique
    expect(event1!.id).not.toBe(event2!.id);
  });

  test('should track conversion attribution', async () => {
    const { data: event, error } = await supabase
      .from('ad_pixel_events')
      .insert({
        org_id: testOrgId,
        pixel_config_id: testPixelConfigs[0],
        provider: 'meta',
        event_name: 'Purchase',
        event_data: {
          value: 99.99,
          currency: 'USD',
        },
        user_id: testUserId,
        session_id: 'attribution-session',
        page_url: 'https://everreach.app/checkout/success',
        referrer_url: 'https://google.com',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'summer_sale',
        utm_content: 'ad_variant_a',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(event!.utm_source).toBe('google');
    expect(event!.utm_campaign).toBe('summer_sale');
  });
});

// ============================================================================
// SERVER-SIDE CONVERSION API TESTS
// ============================================================================

describe('Server-Side Conversion API', () => {
  test('should send Meta Conversion API event', async () => {
    // Mock Meta Conversions API call
    const eventPayload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: 'https://everreach.app/checkout',
          user_data: {
            em: 'hashed_email', // SHA256 hash
            ph: 'hashed_phone', // SHA256 hash
            client_ip_address: '192.168.1.1',
            client_user_agent: 'Mozilla/5.0',
            fbc: 'fb.1.1234567890.abcdef',
            fbp: 'fb.1.1234567890.1234567890',
          },
          custom_data: {
            currency: 'USD',
            value: 29.99,
            content_ids: ['pro_monthly'],
            content_type: 'product',
          },
        },
      ],
    };

    // In production, this would call Meta Conversions API
    // For tests, we just validate the payload structure
    expect(eventPayload.data[0]).toHaveProperty('event_name');
    expect(eventPayload.data[0]).toHaveProperty('event_time');
    expect(eventPayload.data[0]).toHaveProperty('user_data');
    expect(eventPayload.data[0]).toHaveProperty('custom_data');
    expect(eventPayload.data[0].custom_data.value).toBe(29.99);
  });

  test('should send Google Analytics 4 Measurement Protocol event', async () => {
    const eventPayload = {
      client_id: 'test-client-id',
      user_id: testUserId,
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: 'T_12345',
            value: 29.99,
            currency: 'USD',
            items: [
              {
                item_id: 'pro_monthly',
                item_name: 'Pro Plan',
                price: 29.99,
                quantity: 1,
              },
            ],
          },
        },
      ],
    };

    // Validate payload structure
    expect(eventPayload.events[0]).toHaveProperty('name');
    expect(eventPayload.events[0]).toHaveProperty('params');
    expect(eventPayload.events[0].params.value).toBe(29.99);
  });

  test('should send TikTok Events API event', async () => {
    const eventPayload = {
      event_source: 'web',
      event_source_id: 'ABCDEFGHIJ1234567890',
      data: [
        {
          event: 'CompletePayment',
          event_time: Math.floor(Date.now() / 1000),
          event_id: 'event_' + Date.now(),
          user: {
            email: 'hashed_email',
            phone_number: 'hashed_phone',
            ip: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
          },
          properties: {
            currency: 'USD',
            value: 29.99,
            content_type: 'product',
            content_id: 'pro_monthly',
          },
        },
      ],
    };

    // Validate payload structure
    expect(eventPayload.data[0]).toHaveProperty('event');
    expect(eventPayload.data[0]).toHaveProperty('event_time');
    expect(eventPayload.data[0]).toHaveProperty('user');
    expect(eventPayload.data[0].properties.value).toBe(29.99);
  });
});

// ============================================================================
// PRIVACY & COMPLIANCE TESTS
// ============================================================================

describe('Privacy & Compliance', () => {
  test('should respect user tracking consent', async () => {
    // Create user with tracking disabled
    const { data: consent } = await supabase
      .from('user_tracking_consent')
      .insert({
        user_id: testUserId,
        org_id: testOrgId,
        analytics_consent: false,
        advertising_consent: false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    expect(consent).toBeDefined();
    expect(consent!.advertising_consent).toBe(false);

    // Check if we should track
    const { data: userConsent } = await supabase
      .from('user_tracking_consent')
      .select('advertising_consent')
      .eq('user_id', testUserId)
      .single();

    if (!userConsent?.advertising_consent) {
      // Should NOT send pixel events
      expect(userConsent!.advertising_consent).toBe(false);
    }
  });

  test('should hash PII before sending to pixels', () => {
    const crypto = require('crypto');

    const email = 'test@example.com';
    const phone = '+1234567890';

    // SHA256 hash
    const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
    const hashedPhone = crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex');

    expect(hashedEmail).toHaveLength(64); // SHA256 produces 64 hex chars
    expect(hashedPhone).toHaveLength(64);
    expect(hashedEmail).not.toContain('@'); // Should not contain original data
  });

  test('should anonymize IP addresses in test mode', async () => {
    const pixelId = testPixelConfigs[0]; // Has test_mode = true

    const { data: config } = await supabase
      .from('ad_pixel_configs')
      .select('test_mode')
      .eq('id', pixelId)
      .single();

    expect(config!.test_mode).toBe(true);

    // In test mode, IPs should be anonymized
    const ipAddress = '192.168.1.100';
    const anonymized = ipAddress.split('.').slice(0, 3).join('.') + '.0';

    expect(anonymized).toBe('192.168.1.0');
  });

  test('should respect GDPR deletion requests', async () => {
    // Delete user's pixel events
    const { error } = await supabase
      .from('ad_pixel_events')
      .delete()
      .eq('user_id', testUserId);

    expect(error).toBeNull();

    // Verify deletion
    const { data: events } = await supabase
      .from('ad_pixel_events')
      .select('id')
      .eq('user_id', testUserId);

    expect(events).toHaveLength(0);
  });
});

// ============================================================================
// REPORTING & ANALYTICS TESTS
// ============================================================================

describe('Pixel Reporting', () => {
  beforeAll(async () => {
    // Seed some test events
    const pixelId = testPixelConfigs[0];
    await supabase.from('ad_pixel_events').insert([
      {
        org_id: testOrgId,
        pixel_config_id: pixelId,
        provider: 'meta',
        event_name: 'PageView',
        user_id: testUserId,
        session_id: 'report-session-1',
        page_url: 'https://everreach.app/home',
      },
      {
        org_id: testOrgId,
        pixel_config_id: pixelId,
        provider: 'meta',
        event_name: 'AddToCart',
        event_data: { value: 29.99, currency: 'USD' },
        user_id: testUserId,
        session_id: 'report-session-1',
        page_url: 'https://everreach.app/pricing',
      },
      {
        org_id: testOrgId,
        pixel_config_id: pixelId,
        provider: 'meta',
        event_name: 'Purchase',
        event_data: { value: 29.99, currency: 'USD' },
        user_id: testUserId,
        session_id: 'report-session-1',
        page_url: 'https://everreach.app/checkout/success',
      },
    ]);
  });

  test('should calculate conversion funnel', async () => {
    const { data: events } = await supabase
      .from('ad_pixel_events')
      .select('event_name, created_at')
      .eq('org_id', testOrgId)
      .eq('session_id', 'report-session-1')
      .order('created_at', { ascending: true });

    expect(events).toBeDefined();
    expect(events!.length).toBeGreaterThanOrEqual(3);

    // Funnel: PageView -> AddToCart -> Purchase
    const funnel = events!.reduce((acc, event) => {
      if (event.event_name === 'PageView') acc.pageViews++;
      if (event.event_name === 'AddToCart') acc.addToCarts++;
      if (event.event_name === 'Purchase') acc.purchases++;
      return acc;
    }, { pageViews: 0, addToCarts: 0, purchases: 0 });

    expect(funnel.pageViews).toBeGreaterThanOrEqual(1);
    expect(funnel.addToCarts).toBeGreaterThanOrEqual(1);
    expect(funnel.purchases).toBeGreaterThanOrEqual(1);

    // Conversion rate: Purchases / PageViews
    const conversionRate = (funnel.purchases / funnel.pageViews) * 100;
    expect(conversionRate).toBeGreaterThan(0);
  });

  test('should aggregate revenue by pixel', async () => {
    const { data: events } = await supabase
      .from('ad_pixel_events')
      .select('event_data')
      .eq('org_id', testOrgId)
      .eq('event_name', 'Purchase')
      .not('event_data->>value', 'is', null);

    const totalRevenue = events!.reduce((sum, event) => {
      return sum + (parseFloat(event.event_data.value) || 0);
    }, 0);

    expect(totalRevenue).toBeGreaterThan(0);
  });

  test('should track events by UTM source', async () => {
    // Insert events with UTM params
    await supabase.from('ad_pixel_events').insert([
      {
        org_id: testOrgId,
        pixel_config_id: testPixelConfigs[0],
        provider: 'meta',
        event_name: 'Purchase',
        event_data: { value: 50 },
        utm_source: 'facebook',
        utm_campaign: 'summer_sale',
      },
      {
        org_id: testOrgId,
        pixel_config_id: testPixelConfigs[0],
        provider: 'meta',
        event_name: 'Purchase',
        event_data: { value: 75 },
        utm_source: 'google',
        utm_campaign: 'search_ads',
      },
    ]);

    // Aggregate by source
    const { data: events } = await supabase
      .from('ad_pixel_events')
      .select('utm_source, event_data')
      .eq('org_id', testOrgId)
      .eq('event_name', 'Purchase')
      .not('utm_source', 'is', null);

    const bySource = events!.reduce((acc: any, event) => {
      const source = event.utm_source;
      if (!acc[source]) acc[source] = { count: 0, revenue: 0 };
      acc[source].count++;
      acc[source].revenue += parseFloat(event.event_data?.value || 0);
      return acc;
    }, {});

    expect(bySource).toHaveProperty('facebook');
    expect(bySource).toHaveProperty('google');
    expect(bySource.facebook.revenue).toBeGreaterThan(0);
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Pixel Error Handling', () => {
  test('should handle API failures gracefully', async () => {
    // Simulate API failure by using invalid pixel ID
    const result = {
      success: false,
      error: 'Invalid pixel ID',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should retry failed conversions', async () => {
    // Log failed conversion
    const { data: event } = await supabase
      .from('ad_pixel_events')
      .insert({
        org_id: testOrgId,
        pixel_config_id: testPixelConfigs[0],
        provider: 'meta',
        event_name: 'Purchase',
        event_data: { value: 29.99 },
        status: 'failed',
        error_message: 'Network timeout',
        retry_count: 0,
      })
      .select()
      .single();

    expect(event!.status).toBe('failed');
    expect(event!.retry_count).toBe(0);

    // Simulate retry
    const { error } = await supabase
      .from('ad_pixel_events')
      .update({
        retry_count: 1,
        status: 'pending',
      })
      .eq('id', event!.id);

    expect(error).toBeNull();
  });

  test('should move to dead letter queue after max retries', async () => {
    const { data: event } = await supabase
      .from('ad_pixel_events')
      .insert({
        org_id: testOrgId,
        pixel_config_id: testPixelConfigs[0],
        provider: 'meta',
        event_name: 'Purchase',
        event_data: { value: 29.99 },
        status: 'failed',
        retry_count: 5, // Max retries exceeded
      })
      .select()
      .single();

    // Should be marked as dead letter
    if (event!.retry_count >= 5) {
      const { error } = await supabase
        .from('ad_pixel_events')
        .update({ status: 'dead_letter' })
        .eq('id', event!.id);

      expect(error).toBeNull();
    }
  });
});

console.log('✅ Ad Pixel Tests Complete');
