/**
 * Meta Event Mapping Tests
 * 
 * Verifies that all critical internal events map correctly to Meta standard events
 * via mapToMetaEvent() and that the mappers produce correct custom_data.
 */

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('mocked_hash'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} }, appOwnership: 'standalone' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(undefined),
    multiRemove: jest.fn().mockResolvedValue(undefined),
  },
}));

import { mapToMetaEvent } from '@/lib/metaAppEvents';

describe('mapToMetaEvent', () => {
  // =========================================================================
  // Critical ROAS events
  // =========================================================================

  describe('Purchase events (critical for ROAS)', () => {
    it('maps purchase_completed → Purchase with value and currency', () => {
      const mapping = mapToMetaEvent('purchase_completed');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('Purchase');

      const data = mapping!.mapper!({
        amount: 49.99,
        currency: 'USD',
        plan: 'core_annual',
        product_id: 'com.everreach.core.annual',
      });
      expect(data).toEqual({
        value: 49.99,
        currency: 'USD',
        content_name: 'core_annual',
        content_type: 'subscription',
      });
    });

    it('defaults currency to USD when missing', () => {
      const mapping = mapToMetaEvent('purchase_completed');
      const data = mapping!.mapper!({ amount: 4.99, plan: 'core_monthly' });
      expect(data.currency).toBe('USD');
      expect(data.value).toBe(4.99);
    });

    it('falls back to value if amount is missing', () => {
      const mapping = mapToMetaEvent('purchase_completed');
      const data = mapping!.mapper!({ value: 9.99 });
      expect(data.value).toBe(9.99);
    });

    it('falls back to product_id if plan is missing', () => {
      const mapping = mapToMetaEvent('purchase_completed');
      const data = mapping!.mapper!({ amount: 4.99, product_id: '$rc_monthly' });
      expect(data.content_name).toBe('$rc_monthly');
    });
  });

  describe('Trial events', () => {
    it('maps trial_started → StartTrial', () => {
      const mapping = mapToMetaEvent('trial_started');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('StartTrial');

      const data = mapping!.mapper!({ trial_days: 7 });
      expect(data).toEqual({
        predicted_ltv: 0,
        currency: 'USD',
        content_name: 'free_trial',
        num_items: 7,
      });
    });

    it('defaults trial_days to 7', () => {
      const mapping = mapToMetaEvent('trial_started');
      const data = mapping!.mapper!({});
      expect(data.num_items).toBe(7);
    });
  });

  describe('Subscribe events', () => {
    it('maps subscription_upgraded → Subscribe', () => {
      const mapping = mapToMetaEvent('subscription_upgraded');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('Subscribe');

      const data = mapping!.mapper!({ amount: 49.99, to_plan: 'pro' });
      expect(data.value).toBe(49.99);
      expect(data.content_name).toBe('pro');
      expect(data.content_type).toBe('subscription');
    });
  });

  // =========================================================================
  // Registration & Funnel
  // =========================================================================

  describe('Registration events', () => {
    it('maps auth_sign_up → CompleteRegistration', () => {
      const mapping = mapToMetaEvent('auth_sign_up');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('CompleteRegistration');

      const data = mapping!.mapper!({ method: 'apple' });
      expect(data.registration_method).toBe('apple');
      expect(data.status).toBe('completed');
    });

    it('defaults method to email', () => {
      const mapping = mapToMetaEvent('auth_sign_up');
      const data = mapping!.mapper!({});
      expect(data.registration_method).toBe('email');
    });
  });

  describe('Paywall events', () => {
    it('maps paywall_viewed → ViewContent with paywall type', () => {
      const mapping = mapToMetaEvent('paywall_viewed');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('ViewContent');

      const data = mapping!.mapper!({ source: 'settings', trigger: 'feature_gate' });
      expect(data.content_name).toBe('paywall');
      expect(data.content_type).toBe('paywall');
      expect(data.content_category).toBe('settings');
    });
  });

  // =========================================================================
  // Content & Engagement
  // =========================================================================

  describe('Content events', () => {
    it('maps screen_viewed → ViewContent', () => {
      const mapping = mapToMetaEvent('screen_viewed');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('ViewContent');
    });

    it('maps contact_viewed → ViewContent', () => {
      const mapping = mapToMetaEvent('contact_viewed');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('ViewContent');
    });

    it('maps contact_created → AddToWishlist', () => {
      const mapping = mapToMetaEvent('contact_created');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('AddToWishlist');
    });

    it('maps contact_searched → Search', () => {
      const mapping = mapToMetaEvent('contact_searched');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('Search');
    });

    it('maps message_sent → Contact', () => {
      const mapping = mapToMetaEvent('message_sent');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('Contact');
    });
  });

  // =========================================================================
  // Marketing funnel
  // =========================================================================

  describe('Marketing funnel events', () => {
    it('maps lead_captured → Lead', () => {
      const mapping = mapToMetaEvent('lead_captured');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('Lead');
    });

    it('maps install_tracked → AppInstall', () => {
      const mapping = mapToMetaEvent('install_tracked');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('AppInstall');
    });

    it('maps qualified_signup → Lead', () => {
      const mapping = mapToMetaEvent('qualified_signup');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('Lead');
    });

    it('maps payment_info_added → AddPaymentInfo', () => {
      const mapping = mapToMetaEvent('payment_info_added');
      expect(mapping).not.toBeNull();
      expect(mapping!.metaEvent).toBe('AddPaymentInfo');
    });
  });

  // =========================================================================
  // Events that should NOT map to Meta
  // =========================================================================

  describe('Unmapped events', () => {
    const unmappedEvents = [
      'purchase_started',
      'purchase_failed',
      'purchase_cancelled',
      'restore_started',
      'restore_completed',
      'backend_sync_started',
      'backend_sync_completed',
      'feature_locked',
      'paywall_dismissed',
      'random_event',
    ];

    it.each(unmappedEvents)('does not map %s to Meta', (event) => {
      expect(mapToMetaEvent(event)).toBeNull();
    });
  });
});
