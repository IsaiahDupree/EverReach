/**
 * Superwall Paywall Helper
 *
 * Wraps Superwall SDK with type-safe placement triggers.
 *
 * Setup:
 * 1. Install expo-superwall: npx expo install expo-superwall
 * 2. Set EXPO_PUBLIC_SUPERWALL_API_KEY in .env
 * 3. Configure placements in Superwall Dashboard
 * 4. Update PLACEMENTS constant below with your app-specific placements
 *
 * Usage:
 * ```tsx
 * import { triggerPaywall, PLACEMENTS } from '@/lib/paywall';
 *
 * // Trigger a paywall
 * await triggerPaywall(PLACEMENTS.CONTACTS_LIMIT);
 *
 * // Register placement (app startup)
 * Superwall.shared.register(PLACEMENTS.ONBOARDING);
 * ```
 */

import { Superwall } from 'expo-superwall';

/**
 * Placement IDs configured in Superwall Dashboard
 *
 * TODO: Replace these with your app-specific placements
 *
 * Common placement patterns:
 * - onboarding: Show during user onboarding flow
 * - feature_limit: Soft paywall when user hits usage limit
 * - premium_feature: Hard paywall for premium-only features
 * - trial_expired: Show when free trial expires
 * - settings: User-initiated upgrade from settings screen
 */
export const PLACEMENTS = {
  // TODO: Replace with your app's placement IDs
  ONBOARDING: 'onboarding',
  CONTACTS_LIMIT: 'contacts_limit',
  MESSAGES_LIMIT: 'messages_limit',
  PREMIUM_FEATURE: 'premium_feature',
  TRIAL_EXPIRED: 'trial_expired',
  SETTINGS_UPGRADE: 'settings_upgrade',
  VOICE_NOTES: 'voice_notes',
  AI_FEATURES: 'ai_features',
} as const;

export type PlacementId = typeof PLACEMENTS[keyof typeof PLACEMENTS];

/**
 * Trigger a Superwall paywall by placement ID.
 *
 * @param placement - Placement ID from PLACEMENTS constant
 * @param params - Optional parameters to pass to the paywall
 * @returns Promise<void> - Resolves when paywall is dismissed or purchase completes
 *
 * @example
 * ```tsx
 * // Show paywall when user hits contacts limit
 * if (contactCount >= contactsLimit) {
 *   await triggerPaywall(PLACEMENTS.CONTACTS_LIMIT, {
 *     current_count: contactCount,
 *     limit: contactsLimit,
 *   });
 * }
 * ```
 */
export async function triggerPaywall(
  placement: PlacementId,
  params?: Record<string, any>
): Promise<void> {
  try {
    console.log(`[Paywall] Triggering placement: ${placement}`, params);

    // Register the placement event
    // Superwall will decide whether to show based on rules configured in dashboard
    await Superwall.shared.register(placement, params);

    console.log('[Paywall] Placement registered successfully');
  } catch (error) {
    console.error('[Paywall] Failed to trigger:', error);
    // Don't throw - paywall failures shouldn't crash the app
  }
}

/**
 * Register a placement without triggering it.
 * Useful for preloading paywall data or registering events for analytics.
 *
 * @param placement - Placement ID from PLACEMENTS constant
 * @param params - Optional parameters
 */
export async function registerPlacement(
  placement: PlacementId,
  params?: Record<string, any>
): Promise<void> {
  try {
    await Superwall.shared.register(placement, params);
  } catch (error) {
    console.warn('[Paywall] Failed to register placement:', error);
  }
}

/**
 * Check if a feature should show a paywall based on subscription status.
 *
 * This is a client-side check - always validate entitlements server-side.
 *
 * @example
 * ```tsx
 * import { useSubscription } from '@/providers/SubscriptionProvider';
 *
 * const { isPaid } = useSubscription();
 *
 * if (!isPaid && await shouldShowPaywall(PLACEMENTS.VOICE_NOTES)) {
 *   await triggerPaywall(PLACEMENTS.VOICE_NOTES);
 *   return;
 * }
 *
 * // Continue with premium feature
 * ```
 */
export async function shouldShowPaywall(placement: PlacementId): Promise<boolean> {
  try {
    // Query Superwall to check if placement should trigger
    // This respects dashboard rules (A/B tests, user segments, etc.)
    const shouldShow = await Superwall.shared.getPresentationResult(placement);
    return shouldShow === 'paywall';
  } catch (error) {
    console.warn('[Paywall] Failed to check presentation result:', error);
    // Fail open - don't block features if Superwall check fails
    return false;
  }
}

/**
 * Preload paywall assets for faster display.
 * Call this during app initialization or on key screens.
 */
export async function preloadPaywall(placement: PlacementId): Promise<void> {
  try {
    // Superwall SDK automatically preloads when placement is registered
    await Superwall.shared.register(placement);
  } catch (error) {
    console.warn('[Paywall] Failed to preload:', error);
  }
}
