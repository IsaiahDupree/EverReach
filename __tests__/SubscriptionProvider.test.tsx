import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubscriptionProvider, useSubscription } from '@/providers/SubscriptionProvider';
import { SubscriptionRepo } from '@/repos/SubscriptionRepo';

// Mock dependencies
jest.mock('@/repos/SubscriptionRepo');
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Create a test QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('SubscriptionProvider', () => {
  const mockEntitlements = {
    tier: 'pro',
    subscription_status: 'active',
    subscription_id: 'sub_123',
    trial_started_at: '2025-11-01T00:00:00Z',
    trial_ends_at: '2025-12-01T00:00:00Z',
    subscription_started_at: '2025-11-15T00:00:00Z',
    current_period_end: '2025-12-15T00:00:00Z',
    payment_platform: 'apple',
  };

  // Helper to create wrapper with QueryClient
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SubscriptionProvider>{children}</SubscriptionProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should load entitlements on mount', async () => {
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(mockEntitlements);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.tier).toBe('paid');
        expect(result.current.isPaid).toBe(true);
        expect(result.current.subscriptionStatus).toBe('active');
      });
    });

    it('should handle free trial state correctly', async () => {
      const trialEntitlements = {
        ...mockEntitlements,
        tier: 'free',
        subscription_status: 'trial',
        subscription_id: null,
      };
      
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(trialEntitlements);

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.tier).toBe('free_trial');
        expect(result.current.isPaid).toBe(false);
        expect(result.current.trialDaysRemaining).toBeGreaterThan(0);
      });
    });

    it('should handle expired trial correctly', async () => {
      const expiredEntitlements = {
        ...mockEntitlements,
        tier: 'free',
        subscription_status: null,
        trial_ends_at: '2025-01-01T00:00:00Z', // Past date
      };
      
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(expiredEntitlements);

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.tier).toBe('expired');
        expect(result.current.trialDaysRemaining).toBe(0);
      });
    });
  });

  describe('Refresh Entitlements', () => {
    it('should refresh entitlements when called', async () => {
      (SubscriptionRepo.getEntitlements as jest.Mock)
        .mockResolvedValueOnce(mockEntitlements)
        .mockResolvedValueOnce({
          ...mockEntitlements,
          subscription_status: 'cancelled',
        });

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.subscriptionStatus).toBe('active');
      });

      act(() => {
        result.current.refreshEntitlements();
      });

      await waitFor(() => {
        expect(result.current.subscriptionStatus).toBe('cancelled');
      });
    });

    it('should handle refresh errors gracefully', async () => {
      (SubscriptionRepo.getEntitlements as jest.Mock)
        .mockResolvedValueOnce(mockEntitlements)
        .mockRejectedValueOnce(new Error('Network error'));

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.tier).toBe('paid');
      });

      await act(async () => {
        await result.current.refreshEntitlements();
      });

      // Should maintain previous state on error
      expect(result.current.tier).toBe('paid');
    });
  });

  describe('Subscription Status Mapping', () => {
    it('should map "canceled" to "cancelled"', async () => {
      const cancelledEntitlements = {
        ...mockEntitlements,
        subscription_status: 'canceled', // American spelling
      };
      
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(cancelledEntitlements);

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.subscriptionStatus).toBe('cancelled'); // British spelling
      });
    });

    it('should detect data inconsistencies', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const inconsistentEntitlements = {
        ...mockEntitlements,
        tier: 'free', // Inconsistent
        subscription_status: 'active', // Says active
      };
      
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(inconsistentEntitlements);

      const wrapper = createWrapper();

      renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Data inconsistency detected')
        );
      });

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Payment Platform Detection', () => {
    it('should detect Apple payment platform', async () => {
      const appleEntitlements = {
        ...mockEntitlements,
        source: 'app_store',
      };
      
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(appleEntitlements);

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.paymentPlatform).toBe('apple');
      });
    });

    it('should detect Google payment platform', async () => {
      const googleEntitlements = {
        ...mockEntitlements,
        source: 'play',
      };
      
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(googleEntitlements);

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.paymentPlatform).toBe('google');
      });
    });

    it('should detect Stripe payment platform', async () => {
      const stripeEntitlements = {
        ...mockEntitlements,
        payment_platform: 'stripe',
      };
      
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(stripeEntitlements);

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.paymentPlatform).toBe('stripe');
      });
    });
  });

  describe('Trial Calculations', () => {
    it('should calculate trial days remaining correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      const trialEntitlements = {
        ...mockEntitlements,
        tier: 'free',
        subscription_status: 'trial',
        trial_ends_at: futureDate.toISOString(),
      };
      
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(trialEntitlements);

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.trialDaysRemaining).toBeGreaterThanOrEqual(9);
        expect(result.current.trialDaysRemaining).toBeLessThanOrEqual(10);
      });
    });

    it('should handle negative trial days as zero', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      const expiredTrialEntitlements = {
        ...mockEntitlements,
        tier: 'free',
        subscription_status: null,
        trial_ends_at: pastDate.toISOString(),
      };
      
      (SubscriptionRepo.getEntitlements as jest.Mock).mockResolvedValue(expiredTrialEntitlements);

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.trialDaysRemaining).toBe(0);
      });
    });
  });
});
