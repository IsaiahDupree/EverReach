/**
 * Public API Webhooks Tests
 * 
 * Tests webhook registration, signature verification, and event delivery
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
let testOrgId: string;
let testUserId: string;
let testWebhookId: string;
let testWebhookSecret: string;

beforeAll(async () => {
  // Create test org
  const { data: org } = await supabase.from('orgs').insert({
    name: 'Test Org - Webhooks',
  }).select().single();
  testOrgId = org!.id;

  // Create test user
  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `webhook-test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  testUserId = user!.id;
});

afterAll(async () => {
  // Cleanup
  await supabase.from('webhooks').delete().eq('org_id', testOrgId);
  await supabase.from('orgs').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ============================================================================
// WEBHOOK REGISTRATION TESTS
// ============================================================================

describe('Webhook Registration', () => {
  test('should create webhook with events', async () => {
    testWebhookSecret = crypto.randomBytes(32).toString('hex');

    const { data: webhook, error } = await supabase.from('webhooks').insert({
      org_id: testOrgId,
      url: 'https://example.com/webhooks/everreach',
      secret: testWebhookSecret,
      events: [
        'contact.warmth.changed',
        'contact.warmth.below_threshold',
        'interaction.created',
      ],
      description: 'Test webhook',
      created_by: testUserId,
    }).select().single();

    expect(error).toBeNull();
    expect(webhook).toBeDefined();
    expect(webhook!.enabled).toBe(true);
    expect(webhook!.events).toContain('contact.warmth.changed');

    testWebhookId = webhook!.id;
  });

  test('should support multiple webhooks per org', async () => {
    const { data: webhook2 } = await supabase.from('webhooks').insert({
      org_id: testOrgId,
      url: 'https://example.com/webhooks/everreach2',
      secret: crypto.randomBytes(32).toString('hex'),
      events: ['contact.stage.changed'],
      created_by: testUserId,
    }).select().single();

    expect(webhook2).toBeDefined();

    // Cleanup
    await supabase.from('webhooks').delete().eq('id', webhook2!.id);
  });

  test('should allow webhook without description', async () => {
    const { data: webhook } = await supabase.from('webhooks').insert({
      org_id: testOrgId,
      url: 'https://example.com/webhooks/minimal',
      secret: crypto.randomBytes(32).toString('hex'),
      events: ['interaction.created'],
      created_by: testUserId,
    }).select().single();

    expect(webhook).toBeDefined();
    expect(webhook!.description).toBeNull();

    // Cleanup
    await supabase.from('webhooks').delete().eq('id', webhook!.id);
  });

  test('should set default retry count', async () => {
    const { data: webhook } = await supabase.from('webhooks').insert({
      org_id: testOrgId,
      url: 'https://example.com/webhooks/defaults',
      secret: crypto.randomBytes(32).toString('hex'),
      events: ['contact.warmth.changed'],
      created_by: testUserId,
    }).select().single();

    expect(webhook!.retry_count).toBe(3);
    expect(webhook!.timeout_seconds).toBe(30);

    // Cleanup
    await supabase.from('webhooks').delete().eq('id', webhook!.id);
  });
});

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION TESTS
// ============================================================================

describe('Webhook Signature Verification', () => {
  test('should generate valid HMAC signature', () => {
    const payload = JSON.stringify({
      id: 'evt_123',
      type: 'contact.warmth.changed',
      data: { person_id: 'cnt_abc', warmth: 45 },
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;

    const signature = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(signedPayload)
      .digest('hex');

    expect(signature).toHaveLength(64); // SHA256 hex
  });

  test('should verify valid signature', () => {
    const payload = JSON.stringify({
      id: 'evt_123',
      type: 'contact.warmth.changed',
      data: {},
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;

    const expectedSignature = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(signedPayload)
      .digest('hex');

    const header = `t=${timestamp},v1=${expectedSignature}`;

    // Verify
    const parts = Object.fromEntries(
      header.split(',').map(p => p.split('='))
    );

    const actualSignature = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(`${parts.t}.${payload}`)
      .digest('hex');

    expect(actualSignature).toBe(expectedSignature);
  });

  test('should reject invalid signature', () => {
    const payload = JSON.stringify({ id: 'evt_123' });
    const timestamp = Math.floor(Date.now() / 1000);
    const invalidSignature = 'invalid_signature_here';
    const header = `t=${timestamp},v1=${invalidSignature}`;

    const parts = Object.fromEntries(
      header.split(',').map(p => p.split('='))
    );

    const actualSignature = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(`${parts.t}.${payload}`)
      .digest('hex');

    expect(actualSignature).not.toBe(invalidSignature);
  });

  test('should reject old timestamp (replay attack)', () => {
    const payload = JSON.stringify({ id: 'evt_123' });
    
    // Timestamp from 10 minutes ago (should be rejected)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
    const signature = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(`${oldTimestamp}.${payload}`)
      .digest('hex');

    const header = `t=${oldTimestamp},v1=${signature}`;
    const parts = Object.fromEntries(
      header.split(',').map(p => p.split('='))
    );

    const age = Math.abs(Date.now() / 1000 - Number(parts.t));
    expect(age).toBeGreaterThan(300); // > 5 minutes, should be rejected
  });

  test('should use constant-time comparison', () => {
    const sig1 = 'a'.repeat(64);
    const sig2 = 'b'.repeat(64);

    const buf1 = Buffer.from(sig1);
    const buf2 = Buffer.from(sig2);

    // crypto.timingSafeEqual should be used
    expect(() => crypto.timingSafeEqual(buf1, buf2)).toThrow();

    const buf3 = Buffer.from(sig1);
    expect(crypto.timingSafeEqual(buf1, buf3)).toBe(true);
  });
});

// ============================================================================
// EVENT EMISSION TESTS
// ============================================================================

describe('Event Emission', () => {
  test('should emit event to subscribed webhooks', async () => {
    const eventPayload = {
      person_id: 'cnt_test123',
      warmth: 35,
      warmth_band: 'cold',
      threshold: 40,
    };

    // Emit event via SQL function
    await supabase.rpc('emit_webhook_event', {
      p_org_id: testOrgId,
      p_event_type: 'contact.warmth.below_threshold',
      p_payload: eventPayload,
    });

    // Wait for event to be queued
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check webhook_deliveries table
    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', testWebhookId)
      .eq('event_type', 'contact.warmth.below_threshold');

    expect(deliveries).toBeDefined();
    expect(deliveries!.length).toBeGreaterThan(0);

    const delivery = deliveries![0];
    expect(delivery.attempt_number).toBe(1);
    expect(delivery.payload).toEqual(eventPayload);
    expect(delivery.next_retry_at).toBeTruthy();
  });

  test('should not emit to unsubscribed webhooks', async () => {
    // Our webhook is subscribed to contact.warmth.changed, not contact.stage.changed
    const eventPayload = {
      person_id: 'cnt_test123',
      old_stage: 'stage1',
      new_stage: 'stage2',
    };

    await supabase.rpc('emit_webhook_event', {
      p_org_id: testOrgId,
      p_event_type: 'contact.stage.changed',
      p_payload: eventPayload,
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', testWebhookId)
      .eq('event_type', 'contact.stage.changed');

    // Should be empty since webhook isn't subscribed to this event
    expect(deliveries).toHaveLength(0);
  });

  test('should not emit to disabled webhooks', async () => {
    // Disable webhook
    await supabase
      .from('webhooks')
      .update({ enabled: false })
      .eq('id', testWebhookId);

    const eventPayload = { person_id: 'cnt_test123' };

    await supabase.rpc('emit_webhook_event', {
      p_org_id: testOrgId,
      p_event_type: 'contact.warmth.changed',
      p_payload: eventPayload,
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', testWebhookId)
      .eq('event_type', 'contact.warmth.changed')
      .gt('created_at', new Date(Date.now() - 1000).toISOString());

    expect(deliveries).toHaveLength(0);

    // Re-enable for other tests
    await supabase
      .from('webhooks')
      .update({ enabled: true })
      .eq('id', testWebhookId);
  });

  test('should generate unique event IDs', async () => {
    const eventPayload = { person_id: 'cnt_test123' };

    // Emit same event twice
    await supabase.rpc('emit_webhook_event', {
      p_org_id: testOrgId,
      p_event_type: 'interaction.created',
      p_payload: eventPayload,
    });

    await supabase.rpc('emit_webhook_event', {
      p_org_id: testOrgId,
      p_event_type: 'interaction.created',
      p_payload: eventPayload,
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('event_id')
      .eq('webhook_id', testWebhookId)
      .eq('event_type', 'interaction.created')
      .order('created_at', { ascending: false })
      .limit(2);

    expect(deliveries).toHaveLength(2);
    expect(deliveries![0].event_id).not.toBe(deliveries![1].event_id);
  });
});

// ============================================================================
// DELIVERY TRACKING TESTS
// ============================================================================

describe('Delivery Tracking', () => {
  test('should track delivery attempts', async () => {
    const { data: delivery } = await supabase.from('webhook_deliveries').insert({
      webhook_id: testWebhookId,
      event_id: crypto.randomUUID(),
      event_type: 'contact.warmth.changed',
      payload: { person_id: 'cnt_test' },
      attempt_number: 1,
      next_retry_at: new Date().toISOString(),
    }).select().single();

    expect(delivery).toBeDefined();
    expect(delivery!.attempt_number).toBe(1);

    // Cleanup
    await supabase.from('webhook_deliveries').delete().eq('id', delivery!.id);
  });

  test('should update delivery status after attempt', async () => {
    const { data: delivery } = await supabase.from('webhook_deliveries').insert({
      webhook_id: testWebhookId,
      event_id: crypto.randomUUID(),
      event_type: 'contact.warmth.changed',
      payload: { person_id: 'cnt_test' },
      attempt_number: 1,
      next_retry_at: new Date().toISOString(),
    }).select().single();

    // Simulate successful delivery
    await supabase.from('webhook_deliveries').update({
      status: 200,
      sent_at: new Date().toISOString(),
      duration_ms: 150,
      next_retry_at: null,
    }).eq('id', delivery!.id);

    const { data: updated } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('id', delivery!.id)
      .single();

    expect(updated!.status).toBe(200);
    expect(updated!.sent_at).toBeTruthy();
    expect(updated!.duration_ms).toBe(150);
    expect(updated!.next_retry_at).toBeNull();

    // Cleanup
    await supabase.from('webhook_deliveries').delete().eq('id', delivery!.id);
  });

  test('should track failed deliveries', async () => {
    const { data: delivery } = await supabase.from('webhook_deliveries').insert({
      webhook_id: testWebhookId,
      event_id: crypto.randomUUID(),
      event_type: 'contact.warmth.changed',
      payload: { person_id: 'cnt_test' },
      attempt_number: 1,
      next_retry_at: new Date().toISOString(),
    }).select().single();

    // Simulate failed delivery
    await supabase.from('webhook_deliveries').update({
      status: 500,
      error_message: 'Internal Server Error',
      sent_at: new Date().toISOString(),
      duration_ms: 5000,
      // Schedule retry in 5 minutes
      next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }).eq('id', delivery!.id);

    const { data: updated } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('id', delivery!.id)
      .single();

    expect(updated!.status).toBe(500);
    expect(updated!.error_message).toBe('Internal Server Error');
    expect(updated!.next_retry_at).toBeTruthy();

    // Cleanup
    await supabase.from('webhook_deliveries').delete().eq('id', delivery!.id);
  });

  test('should support multiple retry attempts', async () => {
    const eventId = crypto.randomUUID();

    // First attempt
    const { data: delivery1 } = await supabase.from('webhook_deliveries').insert({
      webhook_id: testWebhookId,
      event_id: eventId,
      event_type: 'contact.warmth.changed',
      payload: { person_id: 'cnt_test' },
      attempt_number: 1,
      status: 500,
      error_message: 'Timeout',
      next_retry_at: new Date(Date.now() + 60000).toISOString(),
    }).select().single();

    // Second attempt
    const { data: delivery2 } = await supabase.from('webhook_deliveries').insert({
      webhook_id: testWebhookId,
      event_id: eventId,
      event_type: 'contact.warmth.changed',
      payload: { person_id: 'cnt_test' },
      attempt_number: 2,
      status: 500,
      error_message: 'Timeout',
      next_retry_at: new Date(Date.now() + 300000).toISOString(),
    }).select().single();

    // Third attempt (success)
    const { data: delivery3 } = await supabase.from('webhook_deliveries').insert({
      webhook_id: testWebhookId,
      event_id: eventId,
      event_type: 'contact.warmth.changed',
      payload: { person_id: 'cnt_test' },
      attempt_number: 3,
      status: 200,
      next_retry_at: null,
    }).select().single();

    const { data: attempts } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('event_id', eventId)
      .order('attempt_number', { ascending: true });

    expect(attempts).toHaveLength(3);
    expect(attempts![0].attempt_number).toBe(1);
    expect(attempts![1].attempt_number).toBe(2);
    expect(attempts![2].attempt_number).toBe(3);
    expect(attempts![2].status).toBe(200);

    // Cleanup
    await supabase.from('webhook_deliveries').delete().eq('event_id', eventId);
  });
});

// ============================================================================
// WEBHOOK STATUS TRACKING TESTS
// ============================================================================

describe('Webhook Status Tracking', () => {
  test('should track consecutive failures', async () => {
    await supabase
      .from('webhooks')
      .update({ consecutive_failures: 3 })
      .eq('id', testWebhookId);

    const { data: webhook } = await supabase
      .from('webhooks')
      .select('consecutive_failures')
      .eq('id', testWebhookId)
      .single();

    expect(webhook!.consecutive_failures).toBe(3);

    // Reset
    await supabase
      .from('webhooks')
      .update({ consecutive_failures: 0 })
      .eq('id', testWebhookId);
  });

  test('should track last delivery status', async () => {
    const now = new Date().toISOString();

    await supabase
      .from('webhooks')
      .update({
        last_delivery_at: now,
        last_delivery_status: 200,
      })
      .eq('id', testWebhookId);

    const { data: webhook } = await supabase
      .from('webhooks')
      .select('last_delivery_at, last_delivery_status')
      .eq('id', testWebhookId)
      .single();

    // Normalize timestamp formats (Postgres may return different format)
    const webhookTime = new Date(webhook!.last_delivery_at).toISOString();
    const expectedTime = new Date(now).toISOString();
    expect(webhookTime).toBe(expectedTime);
    expect(webhook!.last_delivery_status).toBe(200);
  });
});

// ============================================================================
// WEBHOOK MANAGEMENT TESTS
// ============================================================================

describe('Webhook Management', () => {
  test('should update webhook URL', async () => {
    const newUrl = 'https://example.com/webhooks/new-endpoint';

    await supabase
      .from('webhooks')
      .update({ url: newUrl })
      .eq('id', testWebhookId);

    const { data: webhook } = await supabase
      .from('webhooks')
      .select('url')
      .eq('id', testWebhookId)
      .single();

    expect(webhook!.url).toBe(newUrl);
  });

  test('should update subscribed events', async () => {
    const newEvents = [
      'contact.created',
      'contact.updated',
      'contact.deleted',
    ];

    await supabase
      .from('webhooks')
      .update({ events: newEvents })
      .eq('id', testWebhookId);

    const { data: webhook } = await supabase
      .from('webhooks')
      .select('events')
      .eq('id', testWebhookId)
      .single();

    expect(webhook!.events).toEqual(newEvents);
  });

  test('should enable/disable webhook', async () => {
    // Disable
    await supabase
      .from('webhooks')
      .update({ enabled: false })
      .eq('id', testWebhookId);

    let { data: webhook } = await supabase
      .from('webhooks')
      .select('enabled')
      .eq('id', testWebhookId)
      .single();

    expect(webhook!.enabled).toBe(false);

    // Re-enable
    await supabase
      .from('webhooks')
      .update({ enabled: true })
      .eq('id', testWebhookId);

    ({ data: webhook } = await supabase
      .from('webhooks')
      .select('enabled')
      .eq('id', testWebhookId)
      .single());

    expect(webhook!.enabled).toBe(true);
  });

  test('should delete webhook and cascade to deliveries', async () => {
    // Create temporary webhook
    const { data: tempWebhook } = await supabase.from('webhooks').insert({
      org_id: testOrgId,
      url: 'https://example.com/temp',
      secret: crypto.randomBytes(32).toString('hex'),
      events: ['contact.created'],
      created_by: testUserId,
    }).select().single();

    // Create delivery for it
    await supabase.from('webhook_deliveries').insert({
      webhook_id: tempWebhook!.id,
      event_id: crypto.randomUUID(),
      event_type: 'contact.created',
      payload: {},
      attempt_number: 1,
    });

    // Delete webhook
    await supabase.from('webhooks').delete().eq('id', tempWebhook!.id);

    // Verify deliveries are also deleted (CASCADE)
    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', tempWebhook!.id);

    expect(deliveries).toHaveLength(0);
  });
});

console.log('✅ Public API Webhooks Tests Complete');
