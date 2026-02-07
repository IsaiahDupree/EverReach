/**
 * Stripe Webhook Handler Tests
 * POST /api/webhooks/stripe
 *
 * Tests for handling Stripe webhook events with signature verification
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/stripe/route';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('@/lib/stripe/server', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase/admin', () => {
  const mockUpsert = jest.fn(() => ({
    data: null,
    error: null,
  }));

  const mockUpdate = jest.fn(() => ({
    eq: jest.fn(() => ({
      data: null,
      error: null,
    })),
  }));

  const mockFrom = jest.fn((table: string) => ({
    upsert: mockUpsert,
    update: mockUpdate,
  }));

  return {
    createAdminClient: jest.fn(() => ({
      from: mockFrom,
    })),
  };
});

// Import mocked stripe after mock definition
import { stripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/supabase/admin';

describe('POST /api/webhooks/stripe', () => {
  const mockWebhookSecret = 'whsec_test_secret';
  const originalEnv = process.env;

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

  describe('Signature Verification', () => {
    it('should return 400 if stripe-signature header is missing', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('signature');
    });

    it('should return 400 if webhook signature verification fails', async () => {
      // Arrange
      (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
        throw new Error('Webhook signature verification failed');
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid_signature',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('Webhook signature verification failed');
    });

    it('should verify webhook signature using Stripe SDK', async () => {
      // Arrange
      const mockEvent: Stripe.Event = {
        id: 'evt_test_123',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: {
            id: 'cs_test_123',
            object: 'checkout.session',
            customer: 'cus_test_123',
            metadata: {
              user_id: 'user-123',
              tier: 'basic',
              billing_period: 'monthly',
            },
            subscription: 'sub_test_123',
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const rawBody = JSON.stringify({ type: 'checkout.session.completed' });
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: rawBody,
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        't=1234567890,v1=signature_hash',
        mockWebhookSecret
      );
      expect(response.status).toBe(200);
    });
  });

  describe('checkout.session.completed Event', () => {
    it('should update subscription when checkout.session.completed event is received', async () => {
      // Arrange
      const mockEvent: Stripe.Event = {
        id: 'evt_test_123',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: {
            id: 'cs_test_123',
            object: 'checkout.session',
            customer: 'cus_test_123',
            metadata: {
              user_id: 'user-123',
              tier: 'basic',
              billing_period: 'monthly',
            },
            subscription: 'sub_test_123',
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
      expect(createAdminClient).toHaveBeenCalled();
    });

    it('should update subscription for PRO tier with yearly billing', async () => {
      // Arrange
      const mockEvent: Stripe.Event = {
        id: 'evt_test_456',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: {
            id: 'cs_test_456',
            object: 'checkout.session',
            customer: 'cus_test_456',
            metadata: {
              user_id: 'user-456',
              tier: 'pro',
              billing_period: 'yearly',
            },
            subscription: 'sub_test_456',
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(createAdminClient).toHaveBeenCalled();
    });

    it('should return 400 if user_id is missing from metadata', async () => {
      // Arrange
      const mockEvent: Stripe.Event = {
        id: 'evt_test_789',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: {
            id: 'cs_test_789',
            object: 'checkout.session',
            customer: 'cus_test_789',
            metadata: {
              tier: 'basic',
            },
            subscription: 'sub_test_789',
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('user_id');
    });

    it('should return 400 if tier is missing from metadata', async () => {
      // Arrange
      const mockEvent: Stripe.Event = {
        id: 'evt_test_890',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: {
            id: 'cs_test_890',
            object: 'checkout.session',
            customer: 'cus_test_890',
            metadata: {
              user_id: 'user-890',
            },
            subscription: 'sub_test_890',
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('tier');
    });

    it('should return 500 if database update fails', async () => {
      // Arrange
      const mockEvent: Stripe.Event = {
        id: 'evt_test_error',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: {
            id: 'cs_test_error',
            object: 'checkout.session',
            customer: 'cus_test_error',
            metadata: {
              user_id: 'user-error',
              tier: 'basic',
            },
            subscription: 'sub_test_error',
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      // Mock a database error
      const mockUpsert = jest.fn(() => ({
        data: null,
        error: { message: 'Database error' },
      }));

      const mockFrom = jest.fn(() => ({
        upsert: mockUpsert,
      }));

      (createAdminClient as jest.Mock).mockReturnValueOnce({
        from: mockFrom,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error', 'Internal Server Error');
      expect(data.message).toContain('Database error');
    });
  });

  describe('Other Event Types', () => {
    it('should acknowledge and ignore unsupported event types', async () => {
      // Arrange
      const mockEvent: Stripe.Event = {
        id: 'evt_unsupported',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: {} as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'customer.created',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: JSON.stringify({ type: 'customer.created' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
      expect(createAdminClient).not.toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated event', async () => {
      // Arrange
      const mockEvent: Stripe.Event = {
        id: 'evt_sub_updated',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: {
            id: 'sub_test_123',
            object: 'subscription',
            customer: 'cus_test_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // +30 days
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'customer.subscription.updated',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: JSON.stringify({ type: 'customer.subscription.updated' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
    });

    it('should handle customer.subscription.deleted event', async () => {
      // Arrange
      const mockEvent: Stripe.Event = {
        id: 'evt_sub_deleted',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: {
            id: 'sub_test_123',
            object: 'subscription',
            customer: 'cus_test_123',
            status: 'canceled',
          } as any,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'customer.subscription.deleted',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: JSON.stringify({ type: 'customer.subscription.deleted' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
    });
  });

  describe('Environment Configuration', () => {
    it('should return 500 if STRIPE_WEBHOOK_SECRET is not configured', async () => {
      // Arrange
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=signature_hash',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('STRIPE_WEBHOOK_SECRET');
    });
  });
});
