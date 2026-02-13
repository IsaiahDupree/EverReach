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
  subscription_status?: 'active' | 'trial' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
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
      trial_started_at: new Date().toISOString(),
      trial_duration_days: 7,
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      trial_group: 'control',
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
        return { tier: 'free', features: ['basic_crm'], subscription_status: 'trial', trial_duration_days: 7 } as Entitlements;
      }
      const data = await response.json();
      const raw: any = data.entitlements || data;
      const nowIso = new Date().toISOString();
      const startIso: string | undefined = raw.trial_started_at || undefined;
      const durationDays: number | undefined = Number.isFinite(raw.trial_duration_days) ? Number(raw.trial_duration_days) : undefined;
      const endsIso: string | undefined = raw.trial_ends_at || (startIso && durationDays != null
        ? new Date(new Date(startIso).getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined);

      const ent: Entitlements = {
        tier: raw.tier ?? 'free',
        features: Array.isArray(raw.features) ? raw.features : ['basic_crm'],
        subscription_status: raw.subscription_status ?? 'trial',
        source: raw.source as any,
        plan: raw.plan as any,
        valid_until: raw.valid_until ?? null,
        stripe_customer_id: raw.stripe_customer_id,
        stripe_subscription_id: raw.stripe_subscription_id,
        trial_started_at: startIso ?? nowIso,
        trial_duration_days: durationDays ?? 7,
        trial_ends_at: endsIso ?? new Date(new Date(startIso ?? nowIso).getTime() + (durationDays ?? 7) * 24 * 60 * 60 * 1000).toISOString(),
        trial_group: raw.trial_group ?? null,
        trial_gate_strategy: raw.trial_gate_strategy ?? 'calendar_days',
        trial_usage_seconds_limit: Number.isFinite(raw.trial_usage_seconds_limit) ? Number(raw.trial_usage_seconds_limit) : undefined,
      };
      return ent;
    } catch (error) {
      console.error('[SubscriptionRepo.getEntitlements] failed:', error);
      return { tier: 'free', features: ['basic_crm'], subscription_status: 'trial', trial_duration_days: 7 } as Entitlements;
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
    // Backend uses POST /api/billing/portal
    const response = await apiFetch('/api/billing/portal', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({ return_url: params?.return_url }),
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

  async cancelSubscription(params: {
    scope?: 'primary' | 'all';
    when?: 'period_end' | 'immediate';
    reason?: string;
  } = {}): Promise<{
    success: boolean;
    cancel_method?: 'server' | 'store';
    access_until?: string;
    manage_url?: string;
    instructions?: string;
  }> {
    try {
      const response = await apiFetch('/api/v1/billing/cancel', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          scope: params.scope || 'primary',
          when: params.when || 'period_end',
          reason: params.reason || 'user_request',
        }),
      });
      if (!response.ok) return { success: false };
      const data = await response.json();
      return {
        success: true,
        cancel_method: data.cancel_method,
        access_until: data.access_until,
        manage_url: data.manage_url,
        instructions: data.instructions,
      };
    } catch (error) {
      console.error('[SubscriptionRepo.cancelSubscription] failed:', error);
      return { success: false };
    }
  },

  async reactivateSubscription(params?: {
    subscription_id?: string;
  }): Promise<{
    success: boolean;
    subscription_id?: string;
    status?: string;
    current_period_end?: string;
  }> {
    try {
      const response = await apiFetch('/api/v1/billing/reactivate', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(params || {}),
      });
      if (!response.ok) return { success: false };
      const data = await response.json();
      return {
        success: true,
        subscription_id: data.subscription_id,
        status: data.status,
        current_period_end: data.current_period_end,
      };
    } catch (error) {
      console.error('[SubscriptionRepo.reactivateSubscription] failed:', error);
      return { success: false };
    }
  },

  async linkApplePurchase(params: {
    receipt: string;
    hint_email?: string;
  }): Promise<{
    success: boolean;
    subscription_id?: string;
    provider?: string;
    expires_at?: string;
    is_trial?: boolean;
    linked_at?: string;
  }> {
    try {
      const response = await apiFetch('/api/v1/link/apple', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(params),
      });
      if (!response.ok) return { success: false };
      const data = await response.json();
      return {
        success: true,
        subscription_id: data.subscription_id,
        provider: data.provider,
        expires_at: data.expires_at,
        is_trial: data.is_trial,
        linked_at: data.linked_at,
      };
    } catch (error) {
      console.error('[SubscriptionRepo.linkApplePurchase] failed:', error);
      return { success: false };
    }
  },

  async linkGooglePurchase(params: {
    purchase_token: string;
    package_name: string;
    product_id: string;
    hint_email?: string;
  }): Promise<{
    success: boolean;
    subscription_id?: string;
    provider?: string;
    expires_at?: string;
    is_trial?: boolean;
    linked_at?: string;
  }> {
    try {
      const response = await apiFetch('/api/v1/link/google', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(params),
      });
      if (!response.ok) return { success: false };
      const data = await response.json();
      return {
        success: true,
        subscription_id: data.subscription_id,
        provider: data.provider,
        expires_at: data.expires_at,
        is_trial: data.is_trial,
        linked_at: data.linked_at,
      };
    } catch (error) {
      console.error('[SubscriptionRepo.linkGooglePurchase] failed:', error);
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

  async cancelSubscription(params?: {
    scope?: 'primary' | 'all';
    when?: 'period_end' | 'immediate';
    reason?: string;
  }): Promise<{
    success: boolean;
    cancel_method?: 'server' | 'store';
    access_until?: string;
    manage_url?: string;
    instructions?: string;
  }> {
    if (FLAGS.LOCAL_ONLY) {
      return { success: false };
    }
    return BackendSubscriptionRepo.cancelSubscription(params);
  },

  async reactivateSubscription(params?: {
    subscription_id?: string;
  }): Promise<{
    success: boolean;
    subscription_id?: string;
    status?: string;
    current_period_end?: string;
  }> {
    if (FLAGS.LOCAL_ONLY) {
      return { success: false };
    }
    return BackendSubscriptionRepo.reactivateSubscription(params);
  },

  async linkApplePurchase(params: {
    receipt: string;
    hint_email?: string;
  }): Promise<{
    success: boolean;
    subscription_id?: string;
    provider?: string;
    expires_at?: string;
    is_trial?: boolean;
    linked_at?: string;
  }> {
    if (FLAGS.LOCAL_ONLY) {
      throw new Error('Mobile purchase linking requires backend connection');
    }
    return BackendSubscriptionRepo.linkApplePurchase(params);
  },

  async linkGooglePurchase(params: {
    purchase_token: string;
    package_name: string;
    product_id: string;
    hint_email?: string;
  }): Promise<{
    success: boolean;
    subscription_id?: string;
    provider?: string;
    expires_at?: string;
    is_trial?: boolean;
    linked_at?: string;
  }> {
    if (FLAGS.LOCAL_ONLY) {
      throw new Error('Mobile purchase linking requires backend connection');
    }
    return BackendSubscriptionRepo.linkGooglePurchase(params);
  },
};

export default SubscriptionRepo;
