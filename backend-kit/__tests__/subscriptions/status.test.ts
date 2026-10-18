/**
 * Backend Subscription Status Endpoint Tests
 * BACK-SUB-001: Subscription Status Endpoint
 *
 * Tests for the GET /api/subscriptions/status endpoint that returns
 * the currently authenticated user's subscription status.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/subscriptions/status/route';
import { SubscriptionTier, SubscriptionStatus } from '@/types/subscription';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('BACK-SUB-001: Subscription Status Endpoint', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Authentication Required', () => {
    it('should return 401 when Authorization header is missing', async () => {
      // Arrange: Request without Authorization header
      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('Authorization');
    });

    it('should return 401 when token is invalid', async () => {
      // Arrange: Mock invalid token response
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when Authorization header format is invalid', async () => {
      // Arrange: Invalid format (missing "Bearer")
      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'invalid-format-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Returns Current Subscription Tier', () => {
    it('should return active subscription with tier and expiry', async () => {
      // Arrange: Mock valid user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        expires_at: '2024-12-31T23:59:59Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.subscription).toBeDefined();
      expect(data.subscription.tier).toBe(SubscriptionTier.PRO);
      expect(data.subscription.status).toBe(SubscriptionStatus.ACTIVE);
      expect(data.subscription.expires_at).toBe('2024-12-31T23:59:59Z');
    });

    it('should return free tier when no subscription exists', async () => {
      // Arrange: Mock user with no subscription
      const mockUser = {
        id: 'user-456',
        email: 'newuser@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.subscription).toBeDefined();
      expect(data.subscription.tier).toBe(SubscriptionTier.FREE);
      expect(data.subscription.status).toBe(SubscriptionStatus.ACTIVE);
      expect(data.subscription.expires_at).toBeNull();
    });

    it('should include is_active flag based on status', async () => {
      // Arrange: Mock active subscription
      const mockUser = {
        id: 'user-789',
        email: 'active@example.com',
      };

      const mockSubscription = {
        id: 'sub-789',
        user_id: 'user-789',
        tier: SubscriptionTier.BASIC,
        status: SubscriptionStatus.ACTIVE,
        expires_at: '2024-12-31T23:59:59Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.subscription.is_active).toBe(true);
    });

    it('should mark inactive subscription correctly', async () => {
      // Arrange: Mock expired subscription
      const mockUser = {
        id: 'user-999',
        email: 'expired@example.com',
      };

      const mockSubscription = {
        id: 'sub-999',
        user_id: 'user-999',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.EXPIRED,
        expires_at: '2023-12-31T23:59:59Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.subscription.is_active).toBe(false);
      expect(data.subscription.status).toBe(SubscriptionStatus.EXPIRED);
    });
  });

  describe('Shows Expiry Date', () => {
    it('should return null expiry for free tier', async () => {
      // Arrange
      const mockUser = {
        id: 'user-free',
        email: 'free@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.subscription.expires_at).toBeNull();
    });

    it('should return valid expiry date for paid subscription', async () => {
      // Arrange
      const expiryDate = '2025-06-15T10:30:00Z';
      const mockUser = {
        id: 'user-paid',
        email: 'paid@example.com',
      };

      const mockSubscription = {
        id: 'sub-paid',
        user_id: 'user-paid',
        tier: SubscriptionTier.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
        expires_at: expiryDate,
        created_at: '2024-06-15T10:30:00Z',
        updated_at: '2024-06-15T10:30:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.subscription.expires_at).toBe(expiryDate);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-error',
        email: 'error@example.com',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'DB_ERROR' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Acceptance Criteria', () => {
    it('Returns current tier - shows user subscription tier', async () => {
      // Arrange
      const mockUser = {
        id: 'acceptance-user-1',
        email: 'acceptance@example.com',
      };

      const mockSubscription = {
        id: 'acceptance-sub-1',
        user_id: 'acceptance-user-1',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        expires_at: '2024-12-31T23:59:59Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.subscription.tier).toBe(SubscriptionTier.PRO);
    });

    it('Shows expiry - displays subscription expiration date', async () => {
      // Arrange
      const expiryDate = '2024-12-31T23:59:59Z';
      const mockUser = {
        id: 'acceptance-user-2',
        email: 'acceptance2@example.com',
      };

      const mockSubscription = {
        id: 'acceptance-sub-2',
        user_id: 'acceptance-user-2',
        tier: SubscriptionTier.BASIC,
        status: SubscriptionStatus.ACTIVE,
        expires_at: expiryDate,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/api/subscriptions/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.subscription.expires_at).toBe(expiryDate);
    });
  });
});
