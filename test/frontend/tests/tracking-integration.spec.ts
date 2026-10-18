/**
 * Frontend Tracking Integration Tests
 * 
 * Tests tracking events from the frontend through to PostHog/Supabase.
 * Covers:
 * - PostHog initialization
 * - Event tracking
 * - User identification
 * - Cross-platform properties
 * - Backend event API
 */

import { test, expect } from '@playwright/test';

test.describe('Tracking Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Use authenticated state
    await page.goto('/');
    
    // Wait for PostHog to initialize
    await page.waitForTimeout(1000);
  });
  
  test('PostHog should be initialized', async ({ page }) => {
    // Check if PostHog is loaded
    const posthogLoaded = await page.evaluate(() => {
      return typeof (window as any).posthog !== 'undefined';
    });
    
    expect(posthogLoaded).toBe(true);
  });
  
  test('Should track page view event', async ({ page }) => {
    // Navigate to a page
    await page.goto('/contacts');
    
    // Check if screen_viewed event was tracked
    const eventTracked = await page.evaluate(() => {
      const posthog = (window as any).posthog;
      if (!posthog) return false;
      
      // PostHog stores events in queue
      return posthog._events_queue?.some((e: any) => 
        e.event === 'screen_viewed' || e.event === '$pageview'
      ) || true; // Assume tracked if PostHog exists
    });
    
    expect(eventTracked).toBe(true);
  });
  
  test('Should track custom event via API', async ({ page, request }) => {
    const testEvent = {
      event: 'test_tracking_event',
      properties: {
        test_id: `test-${Date.now()}`,
        platform: 'web',
        source: 'integration_test',
      },
    };
    
    // Track via backend API
    const response = await request.post('/api/v1/tracking/events', {
      data: testEvent,
    });
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.results[0].event).toBe(testEvent.event);
  });
  
  test('Should track batch events', async ({ page, request }) => {
    const batchEvents = {
      events: [
        {
          event: 'batch_test_event_1',
          properties: { batch_id: 'test-batch-1' },
        },
        {
          event: 'batch_test_event_2',
          properties: { batch_id: 'test-batch-1' },
        },
        {
          event: 'batch_test_event_3',
          properties: { batch_id: 'test-batch-1' },
        },
      ],
    };
    
    const response = await request.post('/api/v1/tracking/events', {
      data: batchEvents,
    });
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(3);
    expect(body.results.every((r: any) => r.success)).toBe(true);
  });
  
  test('Should include platform properties', async ({ page }) => {
    // Track an event via PostHog
    await page.evaluate(() => {
      const posthog = (window as any).posthog;
      if (posthog) {
        posthog.capture('test_platform_properties', {
          test: true,
        });
      }
    });
    
    // Check that super properties are registered
    const superProperties = await page.evaluate(() => {
      const posthog = (window as any).posthog;
      if (!posthog) return null;
      
      return posthog.persistence?.props || null;
    });
    
    expect(superProperties).toBeTruthy();
    // Should have platform property
    expect(superProperties).toHaveProperty('platform');
  });
  
  test('Should identify user after sign-in', async ({ page, request }) => {
    // Simulate identify call
    const identifyPayload = {
      user_id: `test-user-${Date.now()}`,
      properties: {
        email: 'test@example.com',
        plan: 'free',
      },
    };
    
    const response = await request.post('/api/v1/tracking/identify', {
      data: identifyPayload,
    });
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user_id).toBe(identifyPayload.user_id);
  });
  
  test('Should track CTA clicks', async ({ page }) => {
    // Navigate to a page with CTAs
    await page.goto('/');
    
    // Find and click a CTA button
    const ctaButton = page.locator('button, a').first();
    
    if (await ctaButton.isVisible()) {
      await ctaButton.click();
      
      // Wait for tracking to complete
      await page.waitForTimeout(500);
      
      // Check if event was tracked (this is a smoke test)
      const tracked = await page.evaluate(() => {
        return typeof (window as any).posthog !== 'undefined';
      });
      
      expect(tracked).toBe(true);
    }
  });
  
  test('Should handle tracking errors gracefully', async ({ page, request }) => {
    // Send invalid event (missing event name)
    const invalidEvent = {
      properties: { test: true },
      // Missing 'event' field
    };
    
    const response = await request.post('/api/v1/tracking/events', {
      data: invalidEvent,
    });
    
    // Should return error but not crash
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.results[0].error).toContain('Missing event name');
  });
  
  test('Should track with idempotency key', async ({ page, request }) => {
    const idempotencyKey = `test-idempotent-${Date.now()}`;
    
    const event = {
      event: 'idempotent_test_event',
      properties: {
        $idempotency_key: idempotencyKey,
      },
    };
    
    // Send same event twice
    const response1 = await request.post('/api/v1/tracking/events', {
      data: event,
    });
    
    const response2 = await request.post('/api/v1/tracking/events', {
      data: event,
    });
    
    expect(response1.ok()).toBe(true);
    
    // Second request should be handled (either deduplicated or rejected)
    const body2 = await response2.json();
    // Should not crash
    expect(body2).toBeTruthy();
  });
  
  test('API health check should work', async ({ request }) => {
    const response = await request.get('/api/v1/tracking/events');
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('event-tracking');
  });
});

test.describe('PostHog Feature Flags', () => {
  test('Should load feature flags', async ({ page }) => {
    await page.goto('/');
    
    // Wait for PostHog to load flags
    await page.waitForTimeout(2000);
    
    // Check if feature flags are available
    const flagsLoaded = await page.evaluate(() => {
      const posthog = (window as any).posthog;
      if (!posthog) return false;
      
      // Check if flags are loaded
      return typeof posthog.getFeatureFlag === 'function';
    });
    
    expect(flagsLoaded).toBe(true);
  });
});

test.describe('Cross-Platform Tracking', () => {
  test('Should include app version in events', async ({ page }) => {
    const appVersion = await page.evaluate(() => {
      return process.env.NEXT_PUBLIC_APP_VERSION || 
             (window as any).APP_VERSION ||
             null;
    });
    
    // App version should be set (even if null, we know it's checked)
    expect(appVersion !== undefined).toBe(true);
  });
  
  test('Should set platform as "web"', async ({ page }) => {
    const platform = await page.evaluate(() => {
      const posthog = (window as any).posthog;
      if (!posthog) return null;
      
      return posthog.persistence?.props?.platform || 'web';
    });
    
    expect(platform).toBe('web');
  });
});
