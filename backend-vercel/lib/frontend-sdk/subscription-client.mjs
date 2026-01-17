/**
 * Subscription Client SDK (.mjs)
 * Frontend utility for subscription management
 * 
 * Usage:
 * import { SubscriptionClient } from './subscription-client.mjs';
 * const client = new SubscriptionClient({ apiUrl, getToken });
 */

export class SubscriptionClient {
  constructor({ apiUrl, getToken }) {
    this.apiUrl = apiUrl || 'https://ever-reach-be.vercel.app';
    this.getToken = getToken;
  }

  /**
   * Make authenticated API call
   */
  async #request(endpoint, options = {}) {
    const token = await this.getToken();
    
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  }

  /**
   * Get complete trial/subscription stats
   * @returns {Promise<TrialStats>}
   */
  async getTrialStats() {
    return this.#request('/api/v1/me/trial-stats');
  }

  /**
   * Get simple entitlement check
   * @returns {Promise<{entitled: boolean, reason: string}>}
   */
  async getEntitlements() {
    return this.#request('/api/v1/me/entitlements');
  }

  /**
   * Check if user has premium access
   * @returns {Promise<boolean>}
   */
  async isEntitled() {
    const { entitled } = await this.getEntitlements();
    return entitled;
  }

  /**
   * Cancel subscription
   * @param {Object} options
   * @param {string} options.when - 'period_end' or 'now'
   * @param {string} options.reason - Cancellation reason
   * @returns {Promise<Object>}
   */
  async cancelSubscription({ when = 'period_end', reason } = {}) {
    return this.#request('/api/v1/billing/cancel', {
      method: 'POST',
      body: JSON.stringify({ when, reason }),
    });
  }

  /**
   * Reactivate canceled subscription
   * @returns {Promise<Object>}
   */
  async reactivateSubscription() {
    return this.#request('/api/v1/billing/reactivate', {
      method: 'POST',
    });
  }

  /**
   * Link Apple IAP purchase
   * @param {string} receipt - Base64 App Store receipt
   * @param {string} hintEmail - Optional hint email
   * @returns {Promise<Object>}
   */
  async linkApplePurchase(receipt, hintEmail) {
    return this.#request('/api/v1/link/apple', {
      method: 'POST',
      body: JSON.stringify({ receipt, hint_email: hintEmail }),
    });
  }

  /**
   * Link Google Play purchase
   * @param {Object} params
   * @param {string} params.purchaseToken
   * @param {string} params.packageName
   * @param {string} params.productId
   * @param {string} params.hintEmail
   * @returns {Promise<Object>}
   */
  async linkGooglePurchase({ purchaseToken, packageName, productId, hintEmail }) {
    return this.#request('/api/v1/link/google', {
      method: 'POST',
      body: JSON.stringify({
        purchase_token: purchaseToken,
        package_name: packageName,
        product_id: productId,
        hint_email: hintEmail,
      }),
    });
  }

  /**
   * Get user profile
   * @returns {Promise<Object>}
   */
  async getUserProfile() {
    return this.#request('/api/v1/me');
  }

  /**
   * Get compose settings
   * @returns {Promise<Object>}
   */
  async getComposeSettings() {
    return this.#request('/api/v1/me/compose-settings');
  }
}

/**
 * React hook for subscription management
 * Usage: const subscription = useSubscription();
 */
export function createSubscriptionHook(client) {
  return function useSubscription() {
    const [stats, setStats] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const refresh = React.useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await client.getTrialStats();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, []);

    React.useEffect(() => {
      refresh();
    }, [refresh]);

    const cancel = React.useCallback(async (options) => {
      const result = await client.cancelSubscription(options);
      await refresh();
      return result;
    }, [refresh]);

    const reactivate = React.useCallback(async () => {
      const result = await client.reactivateSubscription();
      await refresh();
      return result;
    }, [refresh]);

    return {
      stats,
      loading,
      error,
      refresh,
      cancel,
      reactivate,
      isEntitled: stats?.entitled ?? false,
      canCancel: stats?.cancel?.allowed ?? false,
      cancelMethod: stats?.cancel?.method,
    };
  };
}

/**
 * Subscription status helpers
 */
export const SubscriptionHelpers = {
  /**
   * Format subscription status message
   */
  getStatusMessage(stats) {
    if (!stats.entitled) {
      return 'No active subscription';
    }

    if (stats.period.cancel_at_period_end) {
      return `Cancels on ${this.formatDate(stats.period.current_period_end)}`;
    }

    switch (stats.entitlement_reason) {
      case 'trial':
        return `Trial: ${stats.trial.days_left} days left`;
      case 'active':
        return `Active until ${this.formatDate(stats.period.current_period_end)}`;
      case 'grace':
        return `Grace period until ${this.formatDate(stats.period.grace_ends_at)}`;
      default:
        return 'Unknown status';
    }
  },

  /**
   * Get subscription badge color
   */
  getBadgeColor(stats) {
    if (!stats.entitled) return 'gray';
    if (stats.period.cancel_at_period_end) return 'orange';
    if (stats.entitlement_reason === 'trial') return 'blue';
    if (stats.entitlement_reason === 'grace') return 'yellow';
    return 'green';
  },

  /**
   * Get subscription badge text
   */
  getBadgeText(stats) {
    if (!stats.entitled) return 'Free';
    if (stats.period.cancel_at_period_end) return 'Canceling';
    if (stats.entitlement_reason === 'trial') return `Trial (${stats.trial.days_left}d)`;
    if (stats.entitlement_reason === 'grace') return 'Grace Period';
    return 'Premium';
  },

  /**
   * Check if trial is ending soon (< 3 days)
   */
  isTrialEndingSoon(stats) {
    return stats.entitlement_reason === 'trial' && stats.trial.days_left <= 3;
  },

  /**
   * Format date
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  /**
   * Get platform-specific cancellation instructions
   */
  getCancelInstructions(stats) {
    if (stats.cancel.method === 'store') {
      const provider = stats.cancel.provider;
      if (provider === 'app_store') {
        return {
          title: 'Cancel via App Store',
          instructions: [
            'Open Settings on your iPhone',
            'Tap your name at the top',
            'Tap Subscriptions',
            'Select this app',
            'Tap Cancel Subscription',
          ],
          helpUrl: 'https://support.apple.com/en-us/HT202039',
        };
      } else if (provider === 'play') {
        return {
          title: 'Cancel via Google Play',
          instructions: [
            'Open Google Play Store app',
            'Tap Menu → Subscriptions',
            'Select this app',
            'Tap Cancel subscription',
          ],
          helpUrl: 'https://support.google.com/googleplay/answer/7018481',
        };
      }
    }
    return {
      title: 'Cancel Subscription',
      instructions: ['Click the cancel button to end your subscription.'],
    };
  },
};

/**
 * Feature gate utility
 */
export class FeatureGate {
  constructor(client) {
    this.client = client;
    this.cache = null;
    this.cacheExpiry = null;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if feature is accessible
   */
  async canAccess(feature) {
    const entitled = await this.isEntitled();
    
    if (entitled) return true;

    // Check feature-specific trial access
    if (this.allowedInTrial(feature)) {
      const stats = await this.getStats();
      return stats.entitlement_reason === 'trial';
    }

    return false;
  }

  /**
   * Get cached or fresh entitlement status
   */
  async isEntitled() {
    if (this.cache && this.cacheExpiry > Date.now()) {
      return this.cache.entitled;
    }

    const stats = await this.client.getTrialStats();
    this.cache = stats;
    this.cacheExpiry = Date.now() + this.cacheTTL;
    
    return stats.entitled;
  }

  /**
   * Get stats with caching
   */
  async getStats() {
    if (this.cache && this.cacheExpiry > Date.now()) {
      return this.cache;
    }

    const stats = await this.client.getTrialStats();
    this.cache = stats;
    this.cacheExpiry = Date.now() + this.cacheTTL;
    
    return stats;
  }

  /**
   * Clear cache (call after subscription changes)
   */
  clearCache() {
    this.cache = null;
    this.cacheExpiry = null;
  }

  /**
   * Check if feature is allowed in trial
   */
  allowedInTrial(feature) {
    const trialFeatures = [
      'basic_messaging',
      'contact_management',
      'simple_analytics',
    ];
    return trialFeatures.includes(feature);
  }
}

export default SubscriptionClient;
