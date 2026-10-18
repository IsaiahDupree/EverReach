/**
 * PostHog Webhook Tests
 * Tests the PostHog webhook that mirrors privacy-safe analytics to Supabase
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const WEBHOOK_SECRET = process.env.POSTHOG_WEBHOOK_SECRET || 'test-secret';

describe('PostHog Webhook', () => {
  const testEvents: any[] = [];

  afterAll(async () => {
    // Cleanup test events
    if (testEvents.length > 0) {
      const eventIds = testEvents.map(e => e.id);
      await supabase
        .from('analytics_events')
        .delete()
        .in('event_id', eventIds);
    }
  });

  test('Rejects requests without webhook secret', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'test',
          properties: {},
        }),
      }
    );

    expect(response.status).toBe(401);
  });

  test('Rejects requests with invalid webhook secret', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostHog-Webhook-Secret': 'wrong-secret',
        },
        body: JSON.stringify({
          event: 'test',
          properties: {},
        }),
      }
    );

    expect(response.status).toBe(401);
  });

  test('Accepts valid webhook requests', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostHog-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          event: 'test_event',
          properties: {
            test_property: 'test_value',
          },
          timestamp: new Date().toISOString(),
          distinct_id: 'test-user-123',
        }),
      }
    );

    expect(response.ok).toBe(true);
  });

  test('Filters out PII properties', async () => {
    const eventId = `test-event-${Date.now()}`;
    testEvents.push({ id: eventId });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostHog-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          event: 'User Signed Up',
          properties: {
            // Allowed properties
            platform: 'web',
            method: 'google',
            // PII that should be filtered
            email: 'test@example.com',
            name: 'John Doe',
            phone_number: '555-1234',
            message_content: 'Secret message',
          },
          timestamp: new Date().toISOString(),
          distinct_id: eventId,
        }),
      }
    );

    expect(response.ok).toBe(true);

    // Wait for insertion
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check what was stored in Supabase
    const { data: events } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('anon_user_id', eventId)
      .limit(1);

    if (events && events.length > 0) {
      const event = events[0];
      
      // Allowed properties should be present
      expect(event.props).toHaveProperty('platform', 'web');
      expect(event.props).toHaveProperty('method', 'google');
      
      // PII should be filtered out
      expect(event.props).not.toHaveProperty('email');
      expect(event.props).not.toHaveProperty('name');
      expect(event.props).not.toHaveProperty('phone_number');
      expect(event.props).not.toHaveProperty('message_content');
    }
  });

  test('Stores message generation events in typed table', async () => {
    const eventId = `msg-gen-${Date.now()}`;
    testEvents.push({ id: eventId });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostHog-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          event: 'Message Generated',
          properties: {
            contact_id: 'test-contact-123',
            channel: 'email',
            goal: 'follow_up',
            latency_ms: 1500,
            token_count: 250,
            from_screenshot: false,
          },
          timestamp: new Date().toISOString(),
          distinct_id: eventId,
        }),
      }
    );

    expect(response.ok).toBe(true);

    // Wait for domain event processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if stored in message_generation_events table
    const { data: msgEvents } = await supabase
      .from('message_generation_events')
      .select('*')
      .eq('anon_user_id', eventId)
      .limit(1);

    if (msgEvents && msgEvents.length > 0) {
      const event = msgEvents[0];
      expect(event.contact_id).toBe('test-contact-123');
      expect(event.channel).toBe('email');
      expect(event.goal).toBe('follow_up');
      expect(event.latency_ms).toBe(1500);
      expect(event.token_count).toBe(250);
      expect(event.from_screenshot).toBe(false);
    }
  });

  test('Stores warmth score changes in typed table', async () => {
    const eventId = `warmth-${Date.now()}`;
    testEvents.push({ id: eventId });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostHog-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          event: 'Warmth Score Changed',
          properties: {
            contact_id: 'test-contact-456',
            from_score: 45,
            to_score: 72,
            delta: 27,
            trigger: 'message_sent',
          },
          timestamp: new Date().toISOString(),
          distinct_id: eventId,
        }),
      }
    );

    expect(response.ok).toBe(true);

    // Wait for domain event processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if stored in warmth_score_history table
    const { data: warmthEvents } = await supabase
      .from('warmth_score_history')
      .select('*')
      .eq('contact_id', 'test-contact-456')
      .order('occurred_at', { ascending: false })
      .limit(1);

    if (warmthEvents && warmthEvents.length > 0) {
      const event = warmthEvents[0];
      expect(event.from_score).toBe(45);
      expect(event.to_score).toBe(72);
      expect(event.delta).toBe(27);
      expect(event.reason).toBe('message_sent');
    }
  });

  test('Handles batch events correctly', async () => {
    const batchEventIds = [];
    const events = [];

    for (let i = 0; i < 3; i++) {
      const eventId = `batch-${Date.now()}-${i}`;
      batchEventIds.push(eventId);
      testEvents.push({ id: eventId });

      events.push({
        event: 'Contact Viewed',
        properties: {
          contact_id: `contact-${i}`,
          source: 'list',
        },
        timestamp: new Date().toISOString(),
        distinct_id: eventId,
      });
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostHog-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          batch: events,
        }),
      }
    );

    expect(response.ok).toBe(true);

    // Wait for insertion
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check all events were stored
    const { data: storedEvents } = await supabase
      .from('analytics_events')
      .select('*')
      .in('anon_user_id', batchEventIds);

    expect(storedEvents?.length).toBeGreaterThanOrEqual(3);
  });

  test('Returns correct response format', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostHog-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          event: 'test_response_format',
          properties: {},
          timestamp: new Date().toISOString(),
          distinct_id: `test-${Date.now()}`,
        }),
      }
    );

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result).toHaveProperty('ok', true);
    expect(result).toHaveProperty('inserted');
    expect(typeof result.inserted).toBe('number');
  });

  test('Handles empty batch gracefully', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostHog-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          batch: [],
        }),
      }
    );

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result).toHaveProperty('ok', true);
    expect(result.inserted).toBe(0);
  });

  test('Handles malformed JSON gracefully', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/posthog-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostHog-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: 'not valid json{',
      }
    );

    expect(response.status).toBe(400);
  });
});
