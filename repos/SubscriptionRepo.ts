import { apiFetch } from '@/lib/api';
import { FLAGS } from '@/constants/flags';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Entitlements {
  tier: 'free' | 'core' | 'pro' | 'enterprise';
  features: string[];
  trial_ends_at?: string;
  trial_started_at?: string;
  trial_duration_days?: number;
  trial_group?: string;
  trial_gate_strategy?: 'calendar_days' | 'screen_time';
  trial_usage_seconds_limit?: number;
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'trial';
  source?: 'app_store' | 'play' | 'stripe' | 'manual';
  plan?: 'free' | 'pro';
  valid_until?: string | null;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: string | null;
  canceled_at?: string | null;
  cancel?: {
    allowed: boolean;
    method: 'server' | 'store' | null;
    manage_url: string | null;
    provider: 'stripe' | 'app_store' | 'play' | 'manual' | null;
  };
  // Billing period information
  product_id?: string | null;
  billing_period?: 'monthly' | 'annual' | null;
}

export interface BillingPortalSession {
  url: string;
}

export interface CheckoutSession {
  url: string;
  session_id: string;
}

const ENTITLEMENTS_KEY = 'subscription/entitlements';

const LocalSubscriptionRepo = {
  async getEntitlements(): Promise<Entitlements> {
    const stored = await AsyncStorage.getItem(ENTITLEMENTS_KEY);
    if (stored) return JSON.parse(stored);

    const defaultEntitlements: Entitlements = {
      tier: 'free',
      features: ['basic_crm', 'local_storage'],
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_status: 'trial',
    };

    await AsyncStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(defaultEntitlements));
    return defaultEntitlements;
  },
};

const BackendSubscriptionRepo = {
  async getEntitlements(): Promise<Entitlements> {
    try {
      const response = await apiFetch('/api/v1/me/entitlements', { requireAuth: true });
      if (!response.ok) {
        return { tier: 'free', features: ['basic_crm'], subscription_status: 'trial' };
      }
      const data = await response.json();
      return data.entitlements || data;
    } catch (error) {
      console.error('[SubscriptionRepo.getEntitlements] failed:', error);
      return { tier: 'free', features: ['basic_crm'], subscription_status: 'trial' };
    }
  },

  async createCheckoutSession(params: {
    price_id: string;
    success_url?: string;
    cancel_url?: string;
  }): Promise<CheckoutSession> {
    const response = await apiFetch('/api/v1/billing/checkout', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error(`Checkout failed: ${response.status}`);
    return await response.json();
  },

  async createPortalSession(params?: { return_url?: string }): Promise<BillingPortalSession> {
    const response = await apiFetch('/api/v1/billing/portal', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify(params || {}),
    });
    if (!response.ok) throw new Error(`Portal failed: ${response.status}`);
    return await response.json();
  },

  async restorePurchases(): Promise<{ success: boolean; entitlements?: Entitlements }> {
    try {
      const response = await apiFetch('/api/v1/billing/restore', {
        method: 'POST',
        requireAuth: true,
      });
      if (!response.ok) return { success: false };
      const data = await response.json();
      return { success: true, entitlements: data.entitlements };
    } catch (error) {
      return { success: false };
    }
  },
};

export const SubscriptionRepo = {
  async getEntitlements(): Promise<Entitlements> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[SubscriptionRepo] Using LOCAL storage');
      return LocalSubscriptionRepo.getEntitlements();
    }
    console.log('[SubscriptionRepo] Using BACKEND');
    return BackendSubscriptionRepo.getEntitlements();
  },

  async createCheckoutSession(params: {
    price_id: string;
    success_url?: string;
    cancel_url?: string;
  }): Promise<CheckoutSession> {
    if (FLAGS.LOCAL_ONLY) {
      throw new Error('Checkout requires backend connection');
    }
    return BackendSubscriptionRepo.createCheckoutSession(params);
  },

  async createPortalSession(params?: { return_url?: string }): Promise<BillingPortalSession> {
    if (FLAGS.LOCAL_ONLY) {
      throw new Error('Billing portal requires backend connection');
    }
    return BackendSubscriptionRepo.createPortalSession(params);
  },

  async restorePurchases(): Promise<{ success: boolean; entitlements?: Entitlements }> {
    if (FLAGS.LOCAL_ONLY) {
      return { success: false };
    }
    return BackendSubscriptionRepo.restorePurchases();
  },
};

export default SubscriptionRepo;
