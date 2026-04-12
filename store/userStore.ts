/**
 * SunTrace - User Store
 *
 * Zustand store for user profile and subscription state.
 * Updated after auth, profile fetch, and subscription events.
 * Components that need subscription-gating should read subscriptionTier from here.
 */
import { create } from 'zustand';
import type { Profile } from '@/types/models';

// ============================================
// Types
// ============================================

export type SubscriptionTier = 'free' | 'pro' | 'family';

interface UserStore {
  profile: Profile | null;
  subscriptionTier: SubscriptionTier;
  isLoading: boolean;
  setProfile: (profile: Profile) => void;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  setIsLoading: (loading: boolean) => void;
  clearUser: () => void;
}

// ============================================
// Store
// ============================================

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  subscriptionTier: 'free',
  isLoading: false,

  setProfile: (profile) => {
    set({ profile });
  },

  setSubscriptionTier: (tier) => {
    set({ subscriptionTier: tier });
  },

  setIsLoading: (loading) => {
    set({ isLoading: loading });
  },

  clearUser: () => {
    set({
      profile: null,
      subscriptionTier: 'free',
      isLoading: false,
    });
  },
}));

export default useUserStore;
