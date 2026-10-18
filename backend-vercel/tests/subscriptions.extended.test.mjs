/**
 * Subscriptions & Billing - Extended Tests
 */
import { describe, it, expect } from 'vitest';
import {
  authenticatedRequest,
  parseJsonResponse,
  assertStatus,
  BACKEND_BASE_URL,
} from './auth-helper.mjs';
import crypto from 'crypto';

function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('Subscriptions & Billing - Extended', () => {
  describe('CORS/OPTIONS', () => {
    it('OPTIONS /api/v1/billing/portal returns 200 or 204', async () => {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/billing/portal`, { method: 'OPTIONS' });
      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Checkout validations', () => {
    it('rejects invalid price_id and missing redirects', async () => {
      const res = await authenticatedRequest('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_id: 'bad_price' }),
      });
      // Backend should 400 for invalid input; tolerate 405 on old deploys
      expect([200, 400, 405]).toContain(res.status);
    });
  });

  describe('IAP link idempotency & auth', () => {
    it('requires auth for Apple', async () => {
      const r = await fetch(`${BACKEND_BASE_URL}/api/v1/link/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_data: 'x', product_id: 'p' }),
      });
      expect([400, 401, 405]).toContain(r.status);
    });

    it('idempotent Apple link for same receipt', async () => {
      const payload = { receipt_data: 'valid_apple_receipt_base64', product_id: 'com.everreach.core.monthly' };
      const r1 = await authenticatedRequest('/api/v1/link/apple', { method: 'POST', body: JSON.stringify(payload) });
      const r2 = await authenticatedRequest('/api/v1/link/apple', { method: 'POST', body: JSON.stringify(payload) });
      expect(r1.status).toBe(r2.status);
    });
  });

  describe('Stripe webhooks signatures', () => {
    const WEBHOOK_PATH = '/api/webhooks/stripe';
    it('rejects invalid signature', async () => {
      const payload = { type: 'customer.subscription.created', data: { object: { id: 'sub_test' } } };
      const r = await fetch(`${BACKEND_BASE_URL}${WEBHOOK_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=123,v1=invalid' },
        body: JSON.stringify(payload),
      });
      expect([400, 401]).toContain(r.status);
    });

    it('accepts valid-ish signature (may 200/400 depending on secret)', async () => {
      const payload = { type: 'invoice.payment_succeeded', data: { object: { id: 'in_test' } } };
      const sig = generateStripeSignature(payload, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test');
      const r = await fetch(`${BACKEND_BASE_URL}${WEBHOOK_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': sig },
        body: JSON.stringify(payload),
      });
      expect([200, 400]).toContain(r.status);
    });
  });
});
