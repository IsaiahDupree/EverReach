/**
 * Tests for Stripe Webhook Handler (WEB-PAY-004)
 *
 * This test suite ensures:
 * - Webhook signature verification works correctly
 * - checkout.session.completed events update subscription data
 * - customer.subscription.updated events update subscription status
 * - customer.subscription.deleted events cancel subscriptions
 * - Error handling is robust
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// Mock Stripe server - must be before the import
const mockConstructEvent = jest.fn();
jest.mock('@/lib/stripe/server', () => ({
  stripe: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  },
}));

// Mock Supabase admin client
const mockUpsert = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn(() => ({
  upsert: mockUpsert,
  update: mockUpdate.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// Now import the POST handler after all mocks are set up
import { POST } from '@/app/api/stripe/webhook/route';

describe('Stripe Webhook Handler (WEB-PAY-004)', () => {
  const originalEnv = process.env;
  const mockWebhookSecret = 'whsec_test_secret';
  const mockSignature = 't=123456789,v1=signature_hash';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      STRIPE_WEBHOOK_SECRET: mockWebhookSecret,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Webhook Signature Verification', () => {
    it('should reject requests without STRIPE_WEBHOOK_SECRET configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toContain('STRIPE_WEBHOOK_SECRET');
    });

    it('should reject requests without stripe-signature header', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('stripe-signature');
    });

    it('should reject requests with invalid signature', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('signature verification failed');
    });

    it('should accept requests with valid signature', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {
              user_id: 'user_123',
              tier: 'pro',
              billing_period: 'monthly',
            },
          },
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);
      mockUpsert.mockResolvedValue({ data: null, error: null });

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockConstructEvent).toHaveBeenCalled();
    });
  });

  describe('checkout.session.completed Event', () => {
    it('should create subscription for new customer', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {
              user_id: 'user_123',
              tier: 'pro',
              billing_period: 'monthly',
            },
          },
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);
      mockUpsert.mockResolvedValue({ data: null, error: null });

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_123',
          tier: 'pro',
          status: 'active',
          stripe_customer_id: 'cus_test123',
          stripe_subscription_id: 'sub_test123',
          metadata: {
            billing_period: 'monthly',
          },
        }),
        { onConflict: 'user_id' }
      );
    });

    it('should reject checkout events without user_id', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {
              tier: 'pro',
            },
          },
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('user_id');
    });

    it('should reject checkout events without tier', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {
              user_id: 'user_123',
            },
          },
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('tier');
    });

    it('should use default billing_period if not provided', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {
              user_id: 'user_123',
              tier: 'pro',
            },
          },
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);
      mockUpsert.mockResolvedValue({ data: null, error: null });

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      await POST(mockRequest);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            billing_period: 'monthly',
          },
        }),
        { onConflict: 'user_id' }
      );
    });
  });

  describe('customer.subscription.updated Event', () => {
    it('should update subscription status', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            current_period_start: 1704067200, // 2024-01-01
            current_period_end: 1706745600, // 2024-02-01
          },
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          current_period_start: expect.any(String),
          current_period_end: expect.any(String),
        })
      );
    });

    it('should map Stripe status to database status correctly', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'trialing',
            current_period_start: 1704067200,
            current_period_end: 1706745600,
          },
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      await POST(mockRequest);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'trialing',
        })
      );
    });
  });

  describe('customer.subscription.deleted Event', () => {
    it('should cancel subscription and downgrade to free tier', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test123',
          },
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'canceled',
          tier: 'free',
          canceled_at: expect.any(String),
        })
      );
    });
  });

  describe('Unhandled Events', () => {
    it('should acknowledge unhandled event types without error', async () => {
      const mockEvent = {
        type: 'customer.created',
        data: {
          object: {},
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {
              user_id: 'user_123',
              tier: 'pro',
            },
          },
        },
      } as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);
      mockUpsert.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': mockSignature,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });
});
