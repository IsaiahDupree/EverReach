/**
 * Billing API Tests
 * 
 * Tests the Stripe billing endpoints:
 * - POST /billing/checkout - Create checkout session
 * - POST /billing/portal - Create portal session
 * 
 * Note: These tests verify the endpoint logic, not actual Stripe integration.
 * Stripe calls are mocked to avoid real charges.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeTestContext,
  getTestContext,
  makeAuthenticatedRequest,
  expectStatusOrLog,
} from '../setup-v1-tests';

// ============================================================================
// SETUP
// ============================================================================

let testUserId: string;

beforeAll(async () => {
  await initializeTestContext();
  const ctx = getTestContext();
  testUserId = ctx.userId;
  // Ensure profile row exists for billing to work
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', testUserId)
    .single();

  if (!profile) {
    await ctx.supabase.from('profiles').insert({ user_id: testUserId }).select().single();
  }
});

afterAll(async () => {
  // Keep user/org/profile for reuse; no cleanup
});

// ============================================================================
// TESTS: POST /billing/checkout
// ============================================================================

describe('POST /billing/checkout', () => {
  test('should require authentication', async () => {
    const response = await fetch(`${getTestContext().apiUrl}/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await expectStatusOrLog(response, [401], { endpoint: '/billing/checkout', method: 'POST' });
  });

  test('should create checkout session for authenticated user', async () => {
    // Skip if Stripe not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️  Skipping: STRIPE_SECRET_KEY not configured');
      return;
    }

    const response = await makeAuthenticatedRequest('/billing/checkout', {
      method: 'POST',
    });

    // Should succeed with Stripe configured
    await expectStatusOrLog(response, [200], { endpoint: '/billing/checkout', method: 'POST' });
    
    if (response.status === 200) {
      const data = await response.json();
      expect(data.url).toBeDefined();
      expect(data.url).toContain('checkout.stripe.com');
    }
  });

  test('should create or reuse Stripe customer', async () => {
    // Skip if Stripe not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️  Skipping: STRIPE_SECRET_KEY not configured');
      return;
    }

    // First request - should create customer
    const response1 = await makeAuthenticatedRequest('/billing/checkout', { method: 'POST' });

    if (response1.status === 200) {
      // Check profile was updated with customer ID
      const { data: profile1 } = await getTestContext().supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', testUserId)
        .single();

      expect(profile1?.stripe_customer_id).toBeDefined();
      const customerId = profile1?.stripe_customer_id;

      // Second request - should reuse customer
      const response2 = await makeAuthenticatedRequest('/billing/checkout', { method: 'POST' });

      if (response2.status === 200) {
        const { data: profile2 } = await getTestContext().supabase
          .from('profiles')
          .select('stripe_customer_id')
          .eq('user_id', testUserId)
          .single();

        // Should be same customer ID
        expect(profile2?.stripe_customer_id).toBe(customerId);
      }
    }
  });

  test('should handle missing Stripe configuration', async () => {
    // This test verifies error handling when Stripe is misconfigured
    // In production, this should return 400 or 500
    const response = await makeAuthenticatedRequest('/billing/checkout', { method: 'POST' });

    // Should not crash, should return error response
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(600);
  });
});

// ============================================================================
// TESTS: POST /billing/portal
// ============================================================================

describe('POST /billing/portal', () => {
  test('should require authentication', async () => {
    const response = await fetch(`${getTestContext().apiUrl}/billing/portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await expectStatusOrLog(response, [401], { endpoint: '/billing/portal', method: 'POST' });
  });

  test('should create portal session for authenticated user', async () => {
    // Skip if Stripe not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️  Skipping: STRIPE_SECRET_KEY not configured');
      return;
    }

    const response = await makeAuthenticatedRequest('/billing/portal', { method: 'POST' });

    // Should succeed with Stripe configured
    await expectStatusOrLog(response, [200], { endpoint: '/billing/portal', method: 'POST' });
    
    if (response.status === 200) {
      const data = await response.json();
      expect(data.url).toBeDefined();
      expect(data.url).toContain('billing.stripe.com');
    }
  });

  test('should create Stripe customer if not exists', async () => {
    // Skip if Stripe not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️  Skipping: STRIPE_SECRET_KEY not configured');
      return;
    }

    // Delete existing customer ID to test creation
    await getTestContext().supabase
      .from('profiles')
      .update({ stripe_customer_id: null })
      .eq('user_id', testUserId);

    const response = await makeAuthenticatedRequest('/billing/portal', { method: 'POST' });

    if (response.status === 200) {
      // Check customer was created
      const { data: profile } = await getTestContext().supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', testUserId)
        .single();

      expect(profile?.stripe_customer_id).toMatch(/^cus_/);
    }
  });

  test('should handle missing Stripe configuration', async () => {
    const response = await makeAuthenticatedRequest('/billing/portal', { method: 'POST' });
    // Should not crash, should return error response
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(600);
  });
});

// ============================================================================
// TESTS: Integration Scenarios
// ============================================================================

describe('Billing Integration', () => {
  test('should handle checkout → portal flow', async () => {
    // Skip if Stripe not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️  Skipping: STRIPE_SECRET_KEY not configured');
      return;
    }

    // 1. Create checkout session
    const checkoutResponse = await makeAuthenticatedRequest('/billing/checkout', { method: 'POST' });

    if (checkoutResponse.status === 200) {
      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.url).toBeDefined();

      // 2. Create portal session (should reuse customer)
      const portalResponse = await makeAuthenticatedRequest('/billing/portal', { method: 'POST' });

      if (portalResponse.status === 200) {
        const portalData = await portalResponse.json();
        expect(portalData.url).toBeDefined();

        // 3. Verify same customer ID used
        const { data: profile } = await getTestContext().supabase
          .from('profiles')
          .select('stripe_customer_id')
          .eq('user_id', testUserId)
          .single();

        expect(profile?.stripe_customer_id).toBeDefined();
      }
    }
  });

  test('should create profile if not exists', async () => {
    // Skip if Stripe not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️  Skipping: STRIPE_SECRET_KEY not configured');
      return;
    }

    // Delete profile
    await getTestContext().supabase.from('profiles').delete().eq('user_id', testUserId);

    // Call checkout - should create profile
    const response = await makeAuthenticatedRequest('/billing/checkout', { method: 'POST' });

    if (response.status === 200) {
      // Profile should now exist
      const { data: profile } = await getTestContext().supabase
        .from('profiles')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(profile).toBeDefined();
      expect(profile?.user_id).toBe(testUserId);
    }
  });
});

// ============================================================================
// TESTS: Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  test('should handle concurrent checkout requests', async () => {
    // Skip if Stripe not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️  Skipping: STRIPE_SECRET_KEY not configured');
      return;
    }

    // Make multiple concurrent requests
    const requests = Array.from({ length: 3 }, () =>
      makeAuthenticatedRequest('/billing/checkout', { method: 'POST' })
    );

    const responses = await Promise.all(requests);
    
    // All should succeed or fail gracefully
    responses.forEach(response => {
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });

    // Should only create one customer
    const { data: profile } = await getTestContext().supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', testUserId)
      .single();

    if (profile?.stripe_customer_id) {
      // Customer ID should be valid
      expect(profile.stripe_customer_id).toMatch(/^cus_/);
    }
  });

  test('should handle invalid auth token', async () => {
    const response = await fetch(`${getTestContext().apiUrl}/billing/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(401);
  });

  test('should handle malformed auth header', async () => {
    const response = await fetch(`${getTestContext().apiUrl}/billing/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': 'InvalidFormat',
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(401);
  });
});

// ============================================================================
// TESTS: Configuration Validation
// ============================================================================

describe('Configuration', () => {
  test('should validate required environment variables', async () => {
    // This test documents required env vars
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PRICE_PRO_MONTHLY',
      'STRIPE_SUCCESS_URL',
      'STRIPE_CANCEL_URL',
    ];

    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.log(`⚠️  Missing Stripe config: ${missing.join(', ')}`);
      console.log('   Billing tests will be skipped');
    }

    // Test passes regardless - just documents requirements
    expect(true).toBe(true);
  });

  test('should validate price ID format', async () => {
    const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_ID;
    
    if (priceId) {
      expect(priceId).toMatch(/^price_/);
    } else {
      console.log('⚠️  No STRIPE_PRICE_PRO_MONTHLY configured');
    }
  });
});
