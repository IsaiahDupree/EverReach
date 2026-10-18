/**
 * Checkout Session Endpoint Tests
 * POST /api/subscriptions/checkout
 *
 * Tests for creating Stripe checkout sessions
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/subscriptions/checkout/route';
import { SubscriptionTier } from '@/types/subscription';

// Mock dependencies
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => handler,
}));

jest.mock('@/lib/stripe/server', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
  getStripePriceId: jest.fn((tier: string, period: string) => `price_${tier}_${period}`),
}));

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

// Import mocked stripe after mock definition
import { stripe } from '@/lib/stripe/server';

describe('POST /api/subscriptions/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a Stripe checkout session and return URL for BASIC tier', async () => {
    // Arrange
    const mockCheckoutUrl = 'https://checkout.stripe.com/session_123';
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: 'cs_test_123',
      url: mockCheckoutUrl,
    });

    const request = new NextRequest('http://localhost:3000/api/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier: SubscriptionTier.BASIC,
        billing_period: 'monthly',
      }),
    });

    const context = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };

    // Act
    const response = await POST(request, context);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('url', mockCheckoutUrl);
    expect(data).toHaveProperty('session_id', 'cs_test_123');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: 'test@example.com',
        mode: 'subscription',
        success_url: expect.any(String),
        cancel_url: expect.any(String),
        metadata: expect.objectContaining({
          user_id: 'user-123',
          tier: SubscriptionTier.BASIC,
        }),
      })
    );
  });

  it('should create a Stripe checkout session for PRO tier with yearly billing', async () => {
    // Arrange
    const mockCheckoutUrl = 'https://checkout.stripe.com/session_456';
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: 'cs_test_456',
      url: mockCheckoutUrl,
    });

    const request = new NextRequest('http://localhost:3000/api/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier: SubscriptionTier.PRO,
        billing_period: 'yearly',
      }),
    });

    const context = {
      user: {
        id: 'user-456',
        email: 'pro@example.com',
      },
    };

    // Act
    const response = await POST(request, context);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('url', mockCheckoutUrl);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          tier: SubscriptionTier.PRO,
          billing_period: 'yearly',
        }),
      })
    );
  });

  it('should return 400 if tier is missing', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billing_period: 'monthly',
      }),
    });

    const context = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };

    // Act
    const response = await POST(request, context);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid tier', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier: 'invalid-tier',
        billing_period: 'monthly',
      }),
    });

    const context = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };

    // Act
    const response = await POST(request, context);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 400 if trying to checkout FREE tier', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier: SubscriptionTier.FREE,
        billing_period: 'monthly',
      }),
    });

    const context = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };

    // Act
    const response = await POST(request, context);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(data.message).toContain('FREE');
  });

  it('should return 500 if Stripe API fails', async () => {
    // Arrange
    (stripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
      new Error('Stripe API error')
    );

    const request = new NextRequest('http://localhost:3000/api/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier: SubscriptionTier.BASIC,
        billing_period: 'monthly',
      }),
    });

    const context = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };

    // Act
    const response = await POST(request, context);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'Internal Server Error');
  });

  it('should default to monthly billing if billing_period is not specified', async () => {
    // Arrange
    const mockCheckoutUrl = 'https://checkout.stripe.com/session_789';
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: 'cs_test_789',
      url: mockCheckoutUrl,
    });

    const request = new NextRequest('http://localhost:3000/api/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier: SubscriptionTier.BASIC,
      }),
    });

    const context = {
      user: {
        id: 'user-789',
        email: 'default@example.com',
      },
    };

    // Act
    const response = await POST(request, context);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          billing_period: 'monthly',
        }),
      })
    );
  });
});
