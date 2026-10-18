/**
 * RevenueCat Webhook Handler Tests
 * POST /api/webhooks/revenuecat
 *
 * Tests for handling RevenueCat webhook events with authorization verification
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/revenuecat/route';

// Mock dependencies
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

import { createAdminClient } from '@/lib/supabase/admin';

describe('POST /api/webhooks/revenuecat', () => {
  const mockWebhookSecret = 'test_revenuecat_webhook_secret';
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      REVENUECAT_WEBHOOK_SECRET: mockWebhookSecret,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Authorization Verification', () => {
    it('should return 400 if authorization header is missing', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE' } }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('authorization');
    });

    it('should return 401 if authorization token is invalid', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong_token',
        },
        body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE' } }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('Unauthorized');
    });

    it('should accept valid authorization token', async () => {
      // Arrange
      const validEvent = {
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-123',
          product_id: 'pro_monthly',
          price_in_purchased_currency: 9.99,
          purchased_at_ms: Date.now(),
          entitlement_ids: ['pro'],
          period_type: 'NORMAL',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockWebhookSecret}`,
        },
        body: JSON.stringify(validEvent),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
    });
  });

  describe('INITIAL_PURCHASE Event', () => {
    it('should create subscription when INITIAL_PURCHASE event is received', async () => {
      // Arrange
      const event = {
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-123',
          product_id: 'pro_monthly',
          price_in_purchased_currency: 9.99,
          purchased_at_ms: Date.now(),
          entitlement_ids: ['pro'],
          period_type: 'NORMAL',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockWebhookSecret}`,
        },
        body: JSON.stringify(event),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
      expect(createAdminClient).toHaveBeenCalled();
    });

    it('should handle basic tier purchase', async () => {
      // Arrange
      const event = {
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-456',
          product_id: 'basic_yearly',
          price_in_purchased_currency: 49.99,
          purchased_at_ms: Date.now(),
          entitlement_ids: ['basic'],
          period_type: 'NORMAL',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockWebhookSecret}`,
        },
        body: JSON.stringify(event),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(createAdminClient).toHaveBeenCalled();
    });
  });

  describe('RENEWAL Event', () => {
    it('should update subscription when RENEWAL event is received', async () => {
      // Arrange
      const event = {
        event: {
          type: 'RENEWAL',
          app_user_id: 'user-123',
          product_id: 'pro_monthly',
          price_in_purchased_currency: 9.99,
          purchased_at_ms: Date.now(),
          entitlement_ids: ['pro'],
          period_type: 'NORMAL',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockWebhookSecret}`,
        },
        body: JSON.stringify(event),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
      expect(createAdminClient).toHaveBeenCalled();
    });
  });

  describe('CANCELLATION Event', () => {
    it('should cancel subscription when CANCELLATION event is received', async () => {
      // Arrange
      const event = {
        event: {
          type: 'CANCELLATION',
          app_user_id: 'user-789',
          product_id: 'pro_monthly',
          cancellation_reason: 'UNSUBSCRIBE',
          cancelled_at_ms: Date.now(),
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockWebhookSecret}`,
        },
        body: JSON.stringify(event),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
      expect(createAdminClient).toHaveBeenCalled();
    });
  });

  describe('EXPIRATION Event', () => {
    it('should expire subscription when EXPIRATION event is received', async () => {
      // Arrange
      const event = {
        event: {
          type: 'EXPIRATION',
          app_user_id: 'user-999',
          product_id: 'pro_monthly',
          expiration_reason: 'UNSUBSCRIBE',
          expired_at_ms: Date.now(),
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockWebhookSecret}`,
        },
        body: JSON.stringify(event),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
      expect(createAdminClient).toHaveBeenCalled();
    });
  });

  describe('Other Event Types', () => {
    it('should acknowledge and ignore unsupported event types', async () => {
      // Arrange
      const event = {
        event: {
          type: 'TEST',
          app_user_id: 'user-test',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockWebhookSecret}`,
        },
        body: JSON.stringify(event),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('received', true);
      expect(createAdminClient).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database update fails', async () => {
      // Arrange
      const event = {
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-error',
          product_id: 'pro_monthly',
          entitlement_ids: ['pro'],
        },
      };

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

      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockWebhookSecret}`,
        },
        body: JSON.stringify(event),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error', 'Internal Server Error');
      expect(data.message).toContain('Database error');
    });

    it('should return 400 if event format is invalid', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockWebhookSecret}`,
        },
        body: JSON.stringify({ invalid: 'data' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('Environment Configuration', () => {
    it('should return 500 if REVENUECAT_WEBHOOK_SECRET is not configured', async () => {
      // Arrange
      delete process.env.REVENUECAT_WEBHOOK_SECRET;

      const request = new NextRequest('http://localhost:3000/api/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer some_token',
        },
        body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE' } }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('REVENUECAT_WEBHOOK_SECRET');
    });
  });
});
