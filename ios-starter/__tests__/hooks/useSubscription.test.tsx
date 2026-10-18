/**
 * Tests for useSubscription Hook
 * Feature: IOS-DATA-006, IOS-PAY-002
 *
 * Tests the useSubscription hook which provides methods for subscription management:
 * - Get subscription status
 * - Check tier access
 * - Fetch user's current subscription
 * - Purchase subscriptions via RevenueCat
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';
import { SubscriptionTier, SubscriptionStatus } from '../../types/subscription';
import Purchases from 'react-native-purchases';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock RevenueCat Purchases
jest.mock('react-native-purchases', () => ({
  purchasePackage: jest.fn(),
  getCustomerInfo: jest.fn(),
  restorePurchases: jest.fn(),
}));

describe('useSubscription', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchSubscription', () => {
    it('should fetch user subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        provider: 'revenuecat',
        provider_subscription_id: 'rc_sub_123',
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock getUser
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      // Mock from().select().eq().single()
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscription).toEqual(mockSubscription);
      expect(result.current.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('should handle no subscription (free tier)', async () => {
      // Mock getUser
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock from().select().eq().single() returning no data
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // When no subscription exists, should default to free tier
      expect(result.current.subscription).toBeNull();
      expect(result.current.tier).toBe(SubscriptionTier.FREE);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Failed to fetch subscription');

      // Mock getUser
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock from().select().eq().single() with error
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscription).toBeNull();
      expect(result.current.error).not.toBeNull();
    });

    it('should handle unauthenticated user', async () => {
      // Mock getUser returning no user
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscription).toBeNull();
      expect(result.current.tier).toBe(SubscriptionTier.FREE);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('not authenticated');
    });
  });

  describe('tier', () => {
    it('should return subscription tier when active', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe(SubscriptionTier.PREMIUM);
    });

    it('should return FREE tier when no subscription', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe(SubscriptionTier.FREE);
    });
  });

  describe('hasAccess', () => {
    it('should return true when user has required tier or higher', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have access to FREE and BASIC (lower tiers)
      expect(result.current.hasAccess(SubscriptionTier.FREE)).toBe(true);
      expect(result.current.hasAccess(SubscriptionTier.BASIC)).toBe(true);
      expect(result.current.hasAccess(SubscriptionTier.PRO)).toBe(true);
      // Should NOT have access to PREMIUM (higher tier)
      expect(result.current.hasAccess(SubscriptionTier.PREMIUM)).toBe(false);
    });

    it('should return false when subscription is not active', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.EXPIRED,
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Expired subscription should not have access to paid tiers
      expect(result.current.hasAccess(SubscriptionTier.FREE)).toBe(true);
      expect(result.current.hasAccess(SubscriptionTier.BASIC)).toBe(false);
      expect(result.current.hasAccess(SubscriptionTier.PRO)).toBe(false);
    });

    it('should only have access to FREE tier when no subscription', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAccess(SubscriptionTier.FREE)).toBe(true);
      expect(result.current.hasAccess(SubscriptionTier.BASIC)).toBe(false);
      expect(result.current.hasAccess(SubscriptionTier.PRO)).toBe(false);
      expect(result.current.hasAccess(SubscriptionTier.PREMIUM)).toBe(false);
    });
  });

  describe('isActive', () => {
    it('should return true when subscription status is ACTIVE', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isActive).toBe(true);
    });

    it('should return true when subscription status is TRIALING', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.TRIALING,
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isActive).toBe(true);
    });

    it('should return false when subscription status is EXPIRED', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.EXPIRED,
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSubscription,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should return false when no subscription exists', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('refetch', () => {
    it('should refetch subscription data', async () => {
      const mockSubscription1 = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.BASIC,
        status: SubscriptionStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSubscription2 = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // First fetch returns BASIC tier
      const mockSelect = jest.fn()
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSubscription1,
              error: null,
            }),
          }),
        })
        // Second fetch returns PRO tier (after upgrade)
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSubscription2,
              error: null,
            }),
          }),
        });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe(SubscriptionTier.BASIC);

      // Refetch subscription
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.tier).toBe(SubscriptionTier.PRO);
      });
    });
  });

  describe('purchasePackage - Feature IOS-PAY-002', () => {
    beforeEach(() => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
    });

    it('should fail - purchasePackage method does not exist yet', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // This test will fail until we implement purchasePackage
      expect(result.current).toHaveProperty('purchasePackage');
    });

    it('should successfully purchase a package and update entitlements', async () => {
      const mockPackage = {
        identifier: 'pro_monthly',
        product: {
          identifier: 'pro_sub',
          title: 'Pro Subscription',
          description: 'Unlock pro features',
          price: 9.99,
          priceString: '$9.99',
          currencyCode: 'USD',
        },
        packageType: 'MONTHLY',
        offeringIdentifier: 'default',
        presentedOfferingContext: {},
      } as any;

      const mockCustomerInfo = {
        entitlements: {
          active: {
            pro: {
              identifier: 'pro',
              isActive: true,
              productIdentifier: 'pro_sub',
            },
          },
        },
        activeSubscriptions: ['pro_sub'],
      };

      (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
        customerInfo: mockCustomerInfo,
        productIdentifier: 'pro_sub',
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let purchaseResult;
      await act(async () => {
        purchaseResult = await result.current.purchasePackage(mockPackage);
      });

      expect(purchaseResult).toEqual({
        success: true,
        entitlements: mockCustomerInfo.entitlements,
      });
      expect(Purchases.purchasePackage).toHaveBeenCalledWith(mockPackage);
    });

    it('should handle purchase cancellation by user', async () => {
      const mockPackage = {
        identifier: 'pro_monthly',
        product: {
          identifier: 'pro_sub',
          title: 'Pro Subscription',
          description: 'Pro features',
          price: 9.99,
          priceString: '$9.99',
          currencyCode: 'USD',
        },
        packageType: 'MONTHLY',
        offeringIdentifier: 'default',
        presentedOfferingContext: {},
      } as any;

      const mockError = new Error('Purchase was cancelled');
      (mockError as any).userCancelled = true;

      (Purchases.purchasePackage as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let purchaseResult;
      await act(async () => {
        purchaseResult = await result.current.purchasePackage(mockPackage);
      });

      expect(purchaseResult).toEqual({
        success: false,
        error: 'Purchase was cancelled',
      });
    });

    it('should handle purchase errors gracefully', async () => {
      const mockPackage = {
        identifier: 'pro_monthly',
        product: {
          identifier: 'pro_sub',
          title: 'Pro Subscription',
          description: 'Pro features',
          price: 9.99,
          priceString: '$9.99',
          currencyCode: 'USD',
        },
        packageType: 'MONTHLY',
        offeringIdentifier: 'default',
        presentedOfferingContext: {},
      } as any;

      (Purchases.purchasePackage as jest.Mock).mockRejectedValue(
        new Error('Payment method declined')
      );

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let purchaseResult;
      await act(async () => {
        purchaseResult = await result.current.purchasePackage(mockPackage);
      });

      expect(purchaseResult).toEqual({
        success: false,
        error: 'Payment method declined',
      });
    });

    it('should refetch subscription after successful purchase', async () => {
      const mockPackage = {
        identifier: 'pro_monthly',
        product: {
          identifier: 'pro_sub',
          title: 'Pro Subscription',
          description: 'Pro features',
          price: 9.99,
          priceString: '$9.99',
          currencyCode: 'USD',
        },
        packageType: 'MONTHLY',
        offeringIdentifier: 'default',
        presentedOfferingContext: {},
      } as any;

      const mockCustomerInfo = {
        entitlements: {
          active: {
            pro: {
              identifier: 'pro',
              isActive: true,
            },
          },
        },
      };

      (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
        customerInfo: mockCustomerInfo,
      });

      const updatedSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      // Mock initial fetch (no subscription)
      const mockSelect = jest.fn()
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        })
        // After purchase, return PRO subscription
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSubscription,
              error: null,
            }),
          }),
        });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe(SubscriptionTier.FREE);

      // Purchase package
      await act(async () => {
        await result.current.purchasePackage(mockPackage);
      });

      // Should have automatically refetched and updated tier
      await waitFor(() => {
        expect(result.current.tier).toBe(SubscriptionTier.PRO);
      });
    });
  });

  describe('restorePurchases - Feature IOS-PAY-003', () => {
    beforeEach(() => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
    });

    it('should fail - restorePurchases method does not exist yet', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // This test will fail until we implement restorePurchases
      expect(result.current).toHaveProperty('restorePurchases');
    });

    it('should successfully restore purchases and update entitlements', async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {
            pro: {
              identifier: 'pro',
              isActive: true,
              productIdentifier: 'pro_sub',
            },
          },
        },
        activeSubscriptions: ['pro_sub'],
      };

      (Purchases.restorePurchases as jest.Mock).mockResolvedValue(mockCustomerInfo);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let restoreResult;
      await act(async () => {
        restoreResult = await result.current.restorePurchases();
      });

      expect(restoreResult).toEqual({
        success: true,
        entitlements: mockCustomerInfo.entitlements,
      });
      expect(Purchases.restorePurchases).toHaveBeenCalled();
    });

    it('should handle restore with no active subscriptions', async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {},
        },
        activeSubscriptions: [],
      };

      (Purchases.restorePurchases as jest.Mock).mockResolvedValue(mockCustomerInfo);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let restoreResult;
      await act(async () => {
        restoreResult = await result.current.restorePurchases();
      });

      expect(restoreResult).toEqual({
        success: true,
        entitlements: mockCustomerInfo.entitlements,
      });
    });

    it('should handle restore errors gracefully', async () => {
      (Purchases.restorePurchases as jest.Mock).mockRejectedValue(
        new Error('Network connection failed')
      );

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let restoreResult;
      await act(async () => {
        restoreResult = await result.current.restorePurchases();
      });

      expect(restoreResult).toEqual({
        success: false,
        error: 'Network connection failed',
      });
    });

    it('should refetch subscription after successful restore', async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {
            premium: {
              identifier: 'premium',
              isActive: true,
            },
          },
        },
      };

      (Purchases.restorePurchases as jest.Mock).mockResolvedValue(mockCustomerInfo);

      const restoredSubscription = {
        id: 'sub-456',
        user_id: 'user-123',
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      // Mock initial fetch (no subscription)
      const mockSelect = jest.fn()
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        })
        // After restore, return PREMIUM subscription
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: restoredSubscription,
              error: null,
            }),
          }),
        });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe(SubscriptionTier.FREE);

      // Restore purchases
      await act(async () => {
        await result.current.restorePurchases();
      });

      // Should have automatically refetched and updated tier
      await waitFor(() => {
        expect(result.current.tier).toBe(SubscriptionTier.PREMIUM);
      });
    });

    it('should provide feedback for restore operation', async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {
            basic: {
              identifier: 'basic',
              isActive: true,
            },
          },
        },
      };

      (Purchases.restorePurchases as jest.Mock).mockResolvedValue(mockCustomerInfo);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let restoreResult: any;
      await act(async () => {
        restoreResult = await result.current.restorePurchases();
      });

      // Should provide success feedback
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.entitlements).toBeDefined();
    });
  });
});
