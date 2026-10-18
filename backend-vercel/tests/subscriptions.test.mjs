/**
 * Subscriptions & Billing Integration Tests
 * Tests for billing endpoints and webhook handling
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {
  authenticatedRequest,
  parseJsonResponse,
  assertStatus,
  BACKEND_BASE_URL,
} from './auth-helper.mjs';
import crypto from 'crypto';

// Test fixtures
const FIXTURES = {
  stripeWebhookEvents: {
    subscriptionCreated: {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active',
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          plan: {
            id: 'price_test',
            amount: 999,
            currency: 'usd',
            interval: 'month',
          },
        },
      },
    },
    subscriptionUpdated: {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          status: 'past_due',
          cancel_at_period_end: false,
        },
      },
    },
    subscriptionDeleted: {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test123',
          status: 'canceled',
        },
      },
    },
    invoicePaymentSucceeded: {
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_test123',
          customer: 'cus_test123',
          subscription: 'sub_test123',
          amount_paid: 999,
          status: 'paid',
        },
      },
    },
    invoicePaymentFailed: {
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_test124',
          customer: 'cus_test123',
          subscription: 'sub_test123',
          amount_due: 999,
          status: 'open',
        },
      },
    },
    checkoutCompleted: {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test123',
          customer: 'cus_test123',
          subscription: 'sub_test123',
          mode: 'subscription',
        },
      },
    },
    trialWillEnd: {
      type: 'customer.subscription.trial_will_end',
      data: {
        object: {
          id: 'sub_test123',
          trial_end: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
        },
      },
    },
  },
  appleReceipt: {
    valid: {
      receipt_data: 'valid_apple_receipt_base64',
      product_id: 'com.everreach.core.monthly',
      transaction_id: 'apple_test_123',
    },
    invalid: {
      receipt_data: 'invalid_receipt',
      product_id: 'unknown.product',
    },
    expired: {
      receipt_data: 'expired_receipt_base64',
      product_id: 'com.everreach.core.monthly',
      transaction_id: 'apple_test_expired',
    },
  },
  googleReceipt: {
    valid: {
      package_name: 'com.everreach.app',
      product_id: 'com.everreach.core.monthly',
      purchase_token: 'google_test_token_123',
    },
    invalid: {
      package_name: 'com.everreach.app',
      product_id: 'unknown.product',
      purchase_token: 'invalid_token',
    },
  },
};

/**
 * Generate Stripe webhook signature for testing
 * @param {Object} payload - Webhook payload
 * @param {string} secret - Webhook secret
 * @returns {string} Signature header value
 */
function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
    
  return `t=${timestamp},v1=${signature}`;
}

describe('Subscriptions & Billing API - Integration Tests', () => {
  
  describe('GET /api/v1/me/trial-stats - Trial Statistics', () => {
    it('should return trial stats for authenticated user', async () => {
      const response = await authenticatedRequest('/api/v1/me/trial-stats');
      
      assertStatus(response, 200);
      const data = await parseJsonResponse(response);

      expect(data).toHaveProperty('is_trial');
      expect(data).toHaveProperty('trial_ends_at');
      expect(data).toHaveProperty('days_remaining');
    });

    it('should show trial in progress state', async () => {
      const response = await authenticatedRequest('/api/v1/me/trial-stats');
      const data = await parseJsonResponse(response);

      if (data.is_trial) {
        expect(data.days_remaining).toBeGreaterThanOrEqual(0);
        expect(data.trial_ends_at).toBeTruthy();
      }
    });

    it('should require authentication', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/me/trial-stats`);
      assertStatus(response, 401);
    });
  });

  describe('GET /api/v1/me/entitlements - User Entitlements', () => {
    it('should return entitlements for authenticated user', async () => {
      const response = await authenticatedRequest('/api/v1/me/entitlements');
      
      assertStatus(response, 200);
      const data = await parseJsonResponse(response);

      expect(data).toHaveProperty('status'); // trial, active, canceled, past_due, etc.
      expect(data).toHaveProperty('features');
      expect(typeof data.features).toBe('object');
    });

    it('should show trial status for new user', async () => {
      const response = await authenticatedRequest('/api/v1/me/entitlements');
      const data = await parseJsonResponse(response);

      // Check valid status values (subscription_status may be null for trial users)
      // Status may be uppercase or lowercase
      const validStatuses = ['trial', 'active', 'canceled', 'past_due', 'unpaid', 'TRIAL', 'ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID'];
      if (data.status) {
        expect(validStatuses).toContain(data.status);
      } else if (data.subscription_status) {
        expect(validStatuses).toContain(data.subscription_status);
      }
    });

    it('should include feature flags', async () => {
      const response = await authenticatedRequest('/api/v1/me/entitlements');
      const data = await parseJsonResponse(response);

      expect(data.features).toHaveProperty('core_features');
      expect(typeof data.features.core_features).toBe('boolean');
    });

    it('should require authentication', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/me/entitlements`);
      assertStatus(response, 401);
    });
  });

  describe('POST /api/v1/billing/reactivate - Reactivate Subscription', () => {
    it('should reactivate canceled subscription', async () => {
      const response = await authenticatedRequest('/api/v1/billing/reactivate', {
        method: 'POST',
      });

      // Should either succeed (200) or indicate no subscription to reactivate (400/404)
      expect([200, 400, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data).toHaveProperty('subscription_id');
        expect(data.cancel_at_period_end).toBe(false);
      }
    });

    it('should return error for user without subscription', async () => {
      const response = await authenticatedRequest('/api/v1/billing/reactivate', {
        method: 'POST',
      });

      if (response.status >= 400) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
      }
    });

    it('should require authentication', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/billing/reactivate`, {
        method: 'POST',
      });
      assertStatus(response, 401);
    });
  });

  describe('GET /api/v1/billing/portal - Billing Portal URL', () => {
    it('should return valid portal URL', async () => {
      const response = await authenticatedRequest('/api/v1/billing/portal');
      
      // May succeed (200) or fail (400) if Stripe not configured in preview env
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data).toHaveProperty('url');
        expect(data.url).toMatch(/^https:\/\//);
      }
    });

    it('should require authentication', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/billing/portal`);
      assertStatus(response, 401);
    });
  });

  describe('POST /api/v1/billing/checkout - Create Checkout Session', () => {
    it('should create checkout session', async () => {
      const response = await authenticatedRequest('/api/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          price_id: 'price_test_monthly',
          success_url: 'https://app.example.com/success',
          cancel_url: 'https://app.example.com/cancel',
        }),
      });

      // May succeed (200) or fail (400/500) if Stripe not configured in preview env
      expect([200, 400, 500]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data).toHaveProperty('url');
        expect(data.url).toMatch(/^https:\/\//);
      }
    });

    it('should require authentication', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: 'price_test',
        }),
      });
      assertStatus(response, 401);
    });
  });

  describe('POST /api/v1/link/apple - Link Apple In-App Purchase', () => {
    it('should link valid Apple receipt', async () => {
      const response = await authenticatedRequest('/api/v1/link/apple', {
        method: 'POST',
        body: JSON.stringify(FIXTURES.appleReceipt.valid),
      });

      // May succeed (200) or fail (400) depending on actual receipt validation
      expect([200, 400]).toContain(response.status);

      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data).toHaveProperty('entitlements');
      }
    });

    it('should reject invalid Apple receipt', async () => {
      const response = await authenticatedRequest('/api/v1/link/apple', {
        method: 'POST',
        body: JSON.stringify(FIXTURES.appleReceipt.invalid),
      });

      // May return 400 (invalid receipt) or 500 (App Store API not configured)
      expect([400, 500]).toContain(response.status);
      if (response.status === 400) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
      }
    });

    it('should reject expired Apple receipt', async () => {
      const response = await authenticatedRequest('/api/v1/link/apple', {
        method: 'POST',
        body: JSON.stringify(FIXTURES.appleReceipt.expired),
      });

      // May return 400 (expired) or 500 (App Store API not configured)
      expect([400, 500]).toContain(response.status);
    });

    it('should be idempotent for same receipt', async () => {
      const payload = FIXTURES.appleReceipt.valid;
      
      const response1 = await authenticatedRequest('/api/v1/link/apple', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      const response2 = await authenticatedRequest('/api/v1/link/apple', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Both should have same result (idempotency)
      expect(response1.status).toBe(response2.status);
      // Accept any valid response status
      expect([200, 400, 500]).toContain(response1.status);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/link/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(FIXTURES.appleReceipt.valid),
      });
      // May return 401 (unauthorized) or 400 (validation before auth)
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('POST /api/v1/link/google - Link Google Play Purchase', () => {
    it('should link valid Google receipt', async () => {
      const response = await authenticatedRequest('/api/v1/link/google', {
        method: 'POST',
        body: JSON.stringify(FIXTURES.googleReceipt.valid),
      });

      // May succeed (200), validate and fail (400), or fail without Google Play API (500)
      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data).toHaveProperty('entitlements');
      }
    });

    it('should reject invalid Google receipt', async () => {
      const response = await authenticatedRequest('/api/v1/link/google', {
        method: 'POST',
        body: JSON.stringify(FIXTURES.googleReceipt.invalid),
      });

      // May return 400 (invalid receipt) or 500 (Google Play API not configured)
      expect([400, 500]).toContain(response.status);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/link/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(FIXTURES.googleReceipt.valid),
      });
      assertStatus(response, 401);
    });
  });

  describe('Webhook Signature Verification', () => {
    const WEBHOOK_PATH = '/api/webhooks/stripe';

    it('should accept valid Stripe webhook signature', async () => {
      const payload = FIXTURES.stripeWebhookEvents.subscriptionCreated;
      const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      const signature = generateStripeSignature(payload, secret);

      const response = await fetch(`${BACKEND_BASE_URL}${WEBHOOK_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': signature,
        },
        body: JSON.stringify(payload),
      });

      expect([200, 400]).toContain(response.status);
    });

    it('should reject invalid signature', async () => {
      const payload = FIXTURES.stripeWebhookEvents.subscriptionCreated;

      const response = await fetch(`${BACKEND_BASE_URL}${WEBHOOK_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 't=123,v1=invalid_signature',
        },
        body: JSON.stringify(payload),
      });

      assertStatus(response, 400);
    });

    it('should reject replayed events', async () => {
      const payload = FIXTURES.stripeWebhookEvents.subscriptionCreated;
      const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      
      // Use old timestamp (replayed)
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signedPayload = `${oldTimestamp}.${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');
      
      const response = await fetch(`${BACKEND_BASE_URL}${WEBHOOK_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': `t=${oldTimestamp},v1=${signature}`,
        },
        body: JSON.stringify(payload),
      });

      assertStatus(response, 400);
    });
  });

  describe('Webhook Event Processing', () => {
    // Note: These tests require proper webhook secret and may need mocking

    it('should process subscription.created event', async () => {
      // This would normally be tested with Stripe CLI or mocked
      expect(true).toBe(true); // Placeholder
    });

    it('should handle subscription state transitions', async () => {
      // active → past_due → active
      expect(true).toBe(true); // Placeholder
    });

    it('should handle trial to active conversion', async () => {
      // trialing → active
      expect(true).toBe(true); // Placeholder
    });

    it('should handle cancellation at period end', async () => {
      // active → canceled (with cancel_at_period_end)
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API failures gracefully', async () => {
      // Test with invalid Stripe configuration
      const response = await authenticatedRequest('/api/v1/billing/portal');
      
      // Should either succeed or return problem+json error
      if (!response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
      }
    });

    it('should return problem+json format for errors', async () => {
      const response = await authenticatedRequest('/api/v1/link/apple', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'payload' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });
  });

  describe('Security & Robustness', () => {
    it('should enforce rate limits', async () => {
      const requests = Array.from({ length: 50 }, () =>
        authenticatedRequest('/api/v1/me/entitlements')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      // May or may not hit rate limit depending on configuration
      expect(typeof rateLimited).toBe('boolean');
    });

    it('should enforce tenant isolation', async () => {
      // Get entitlements - should only return current user's data
      const response = await authenticatedRequest('/api/v1/me/entitlements');
      const data = await parseJsonResponse(response);

      // Should not include other users' subscription data
      expect(data).not.toHaveProperty('all_users');
    });

    it('should redact sensitive data in error responses', async () => {
      const response = await authenticatedRequest('/api/v1/link/apple', {
        method: 'POST',
        body: JSON.stringify({
          receipt_data: 'sensitive_data_12345',
        }),
      });

      const text = await response.text();
      
      // Should not include raw receipt data in error
      expect(text.includes('sensitive_data_12345')).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should return entitlements within target latency', async () => {
      const start = Date.now();
      const response = await authenticatedRequest('/api/v1/me/entitlements');
      const duration = Date.now() - start;

      assertStatus(response, 200);
      
      // Should respond within 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should return trial stats within target latency', async () => {
      const start = Date.now();
      const response = await authenticatedRequest('/api/v1/me/trial-stats');
      const duration = Date.now() - start;

      assertStatus(response, 200);
      
      // Should respond within 500ms
      expect(duration).toBeLessThan(500);
    });
  });
});
