/**
 * Billing Portal Endpoint Tests
 * POST /api/subscriptions/portal
 *
 * Tests for creating Stripe customer portal sessions
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/subscriptions/portal/route';

// Mock dependencies
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => handler,
}));

jest.mock('@/lib/stripe/server', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              stripe_customer_id: 'cus_test_123',
            },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

// Import mocked stripe after mock definition
import { stripe } from '@/lib/stripe/server';

describe('POST /api/subscriptions/portal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a Stripe billing portal session and return URL', async () => {
    // Arrange
    const mockPortalUrl = 'https://billing.stripe.com/session_123';
    (stripe.billingPortal.sessions.create as jest.Mock).mockResolvedValue({
      url: mockPortalUrl,
    });

    const request = new NextRequest('http://localhost:3000/api/subscriptions/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    expect(data).toHaveProperty('url', mockPortalUrl);
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_test_123',
      return_url: expect.any(String),
    });
  });

  it('should create a customer if none exists for the user', async () => {
    // Arrange
    const mockPortalUrl = 'https://billing.stripe.com/session_456';

    // Mock Supabase to return no customer ID initially
    const createServerClient = require('@/lib/supabase/server').createServerClient;
    createServerClient.mockReturnValueOnce({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null, // No customer ID
              error: null,
            })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    });

    // Mock Stripe customer creation
    const mockStripe = stripe as any;
    mockStripe.customers = {
      create: jest.fn().mockResolvedValue({
        id: 'cus_new_123',
      }),
    };

    (stripe.billingPortal.sessions.create as jest.Mock).mockResolvedValue({
      url: mockPortalUrl,
    });

    const request = new NextRequest('http://localhost:3000/api/subscriptions/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const context = {
      user: {
        id: 'user-456',
        email: 'newcustomer@example.com',
      },
    };

    // Act
    const response = await POST(request, context);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('url', mockPortalUrl);
    expect(mockStripe.customers.create).toHaveBeenCalledWith({
      email: 'newcustomer@example.com',
      metadata: {
        user_id: 'user-456',
      },
    });
  });

  it('should return 500 if Stripe API fails', async () => {
    // Arrange
    (stripe.billingPortal.sessions.create as jest.Mock).mockRejectedValue(
      new Error('Stripe API error')
    );

    const request = new NextRequest('http://localhost:3000/api/subscriptions/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

  it('should use correct return URL from environment variables', async () => {
    // Arrange
    const mockPortalUrl = 'https://billing.stripe.com/session_789';
    (stripe.billingPortal.sessions.create as jest.Mock).mockResolvedValue({
      url: mockPortalUrl,
    });

    const request = new NextRequest('http://localhost:3000/api/subscriptions/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const context = {
      user: {
        id: 'user-789',
        email: 'test@example.com',
      },
    };

    // Act
    const response = await POST(request, context);

    // Assert
    expect(response.status).toBe(200);
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: expect.stringContaining('/dashboard/settings/billing'),
      })
    );
  });
});
