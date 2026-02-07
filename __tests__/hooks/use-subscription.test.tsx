/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSubscription } from '@/hooks/use-subscription';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

// Mock the useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const { useAuth } = require('@/hooks/use-auth');

// Create a persistent mock channel instance
// The subscribe() method should return an object with the channel reference
const mockChannelInstance = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnValue({
    unsubscribe: jest.fn(),
  }),
  unsubscribe: jest.fn(),
};

describe('useSubscription Hook', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
  };

  const mockFreeSubscription: Subscription = {
    id: 'sub-1',
    user_id: 'user-123',
    tier: 'free',
    status: 'active',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_start: null,
    current_period_end: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  const mockProSubscription: Subscription = {
    id: 'sub-2',
    user_id: 'user-123',
    tier: 'pro',
    status: 'active',
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    current_period_start: '2024-01-01T00:00:00.000Z',
    current_period_end: '2024-02-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  const mockBusinessSubscription: Subscription = {
    id: 'sub-3',
    user_id: 'user-123',
    tier: 'business',
    status: 'active',
    stripe_customer_id: 'cus_456',
    stripe_subscription_id: 'sub_456',
    current_period_start: '2024-01-01T00:00:00.000Z',
    current_period_end: '2024-02-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser, loading: false });

    // Reset and setup channel mock to return the same persistent instance
    mockChannelInstance.on.mockReturnThis();
    mockSupabase.channel.mockReturnValue(mockChannelInstance as any);
  });

  describe('useSubscription - fetch subscription status', () => {
    it('should fetch user subscription successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result.current.subscription).toEqual(mockProSubscription);
    });

    it('should create free tier subscription when none exists', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const mockInsert = jest.fn().mockReturnThis();
      const mockInsertSelect = jest.fn().mockReturnThis();
      const mockInsertSingle = jest.fn().mockResolvedValue({
        data: mockFreeSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any).mockReturnValueOnce({
        insert: mockInsert,
        select: mockInsertSelect,
        single: mockInsertSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        tier: 'free',
        status: 'active',
      });
      expect(result.current.subscription).toEqual(mockFreeSubscription);
    });

    it('should not fetch when user is not logged in', () => {
      useAuth.mockReturnValue({ user: null, loading: false });

      const { result } = renderHook(() => useSubscription());

      expect(result.current.loading).toBe(false);
      expect(result.current.subscription).toBeNull();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockError = { message: 'Database connection failed', code: 'DB_ERROR' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Database connection failed');
      expect(result.current.subscription).toBeNull();
    });

    it('should expose subscription tier', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockBusinessSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscription?.tier).toBe('business');
    });

    it('should expose subscription status', async () => {
      const cancelledSubscription = { ...mockProSubscription, status: 'cancelled' as const };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: cancelledSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscription?.status).toBe('cancelled');
    });

    it('should set up realtime subscription', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      // Track the unsubscribe mock from the subscription object
      const mockUnsubscribe = jest.fn();
      mockChannelInstance.subscribe.mockReturnValueOnce({
        unsubscribe: mockUnsubscribe,
      });

      const { unmount } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('subscription-changes');
      });

      expect(mockChannelInstance.on).toHaveBeenCalled();
      expect(mockChannelInstance.subscribe).toHaveBeenCalled();

      unmount();

      // The unsubscribe on the subscription object should be called, not the channel
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('hasAccess - check tier access', () => {
    it('should allow access for free tier users to free features', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockFreeSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAccess('free')).toBe(true);
    });

    it('should deny access for free tier users to pro features', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockFreeSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAccess('pro')).toBe(false);
    });

    it('should allow access for pro tier users to free and pro features', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAccess('free')).toBe(true);
      expect(result.current.hasAccess('pro')).toBe(true);
    });

    it('should deny access for pro tier users to business features', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAccess('business')).toBe(false);
    });

    it('should allow access for business tier users to all features', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockBusinessSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAccess('free')).toBe(true);
      expect(result.current.hasAccess('pro')).toBe(true);
      expect(result.current.hasAccess('business')).toBe(true);
    });

    it('should deny access when subscription is cancelled', async () => {
      const cancelledSubscription = { ...mockProSubscription, status: 'cancelled' as const };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: cancelledSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAccess('pro')).toBe(false);
    });

    it('should deny access when subscription is expired', async () => {
      const expiredSubscription = { ...mockProSubscription, status: 'expired' as const };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: expiredSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAccess('pro')).toBe(false);
    });

    it('should deny access when not logged in', () => {
      useAuth.mockReturnValue({ user: null, loading: false });

      const { result } = renderHook(() => useSubscription());

      expect(result.current.hasAccess('pro')).toBe(false);
      expect(result.current.hasAccess('free')).toBe(true);
    });
  });

  describe('Helper methods', () => {
    it('should return correct tier name', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getTierName()).toBe('Pro');
    });

    it('should check if subscription is active', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isActive()).toBe(true);
    });

    it('should check if user is a paid subscriber', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isPaidSubscriber()).toBe(true);
    });

    it('should return false for free tier on isPaidSubscriber', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockFreeSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isPaidSubscriber()).toBe(false);
    });
  });

  describe('Return value structure', () => {
    it('should return all required properties and methods', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProSubscription,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Check required properties
      expect(result.current).toHaveProperty('subscription');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');

      // Check required methods
      expect(result.current).toHaveProperty('hasAccess');
      expect(result.current).toHaveProperty('createPortalSession');
      expect(result.current).toHaveProperty('getTierName');
      expect(result.current).toHaveProperty('isActive');
      expect(result.current).toHaveProperty('isPaidSubscriber');

      // Verify methods are functions
      expect(typeof result.current.hasAccess).toBe('function');
      expect(typeof result.current.createPortalSession).toBe('function');
      expect(typeof result.current.getTierName).toBe('function');
      expect(typeof result.current.isActive).toBe('function');
      expect(typeof result.current.isPaidSubscriber).toBe('function');
    });
  });
});
