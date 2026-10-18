/**
 * Platform Detection and Feature Flags
 * 
 * Handles platform-specific features and payment providers:
 * - Web: Stripe payments, browser-specific features
 * - Mobile (iOS/Android): RevenueCat + Superwall, native features
 */

import { Platform } from 'react-native';

/**
 * Check if running on web platform
 */
export const isWeb = Platform.OS === 'web';

/**
 * Check if running on mobile (iOS or Android)
 */
export const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Check if running on iOS
 */
export const isIOS = Platform.OS === 'ios';

/**
 * Check if running on Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Check if web features are enabled via environment variable
 */
export const webFeaturesEnabled = 
  process.env.EXPO_PUBLIC_ENABLE_WEB_FEATURES === 'true' && isWeb;

/**
 * Determine which payment provider to use
 * - Web: Stripe
 * - Mobile: RevenueCat + Superwall
 */
export const paymentProvider = isWeb ? 'stripe' : 'revenuecat';

/**
 * Check if Stripe should be used for payments
 */
export const useStripe = isWeb;

/**
 * Check if RevenueCat should be used for payments
 */
export const useRevenueCat = isMobile;

/**
 * Get platform-specific subscription URL
 */
export function getSubscriptionUrl(): string {
  if (isWeb) {
    // For web, return Stripe checkout URL or subscription management page
    return '/subscription-plans'; // Your Stripe-powered subscription page
  }
  
  // For mobile, RevenueCat handles this natively
  return '';
}

/**
 * Platform-specific features configuration
 */
export const platformFeatures = {
  // Payment features
  stripePayments: isWeb,
  revenueCatPayments: isMobile,
  superwallPaywalls: isMobile,
  
  // UI features
  desktopLayout: isWeb,
  bottomNavigation: isMobile,
  sidebarNavigation: isWeb,
  
  // Native features
  pushNotifications: isMobile,
  appReview: isMobile,
  shareSheet: isMobile,
  hapticFeedback: isMobile,
  
  // Web-specific features
  browserExtensions: isWeb,
  desktopNotifications: isWeb,
  keyboardShortcuts: isWeb,
  advancedFilters: webFeaturesEnabled,
  bulkActions: webFeaturesEnabled,
  exportFeatures: webFeaturesEnabled,
};

/**
 * Get platform display name
 */
export function getPlatformName(): string {
  if (isWeb) return 'Web';
  if (isIOS) return 'iOS';
  if (isAndroid) return 'Android';
  return 'Unknown';
}

/**
 * Check if a specific feature is available
 */
export function hasFeature(feature: keyof typeof platformFeatures): boolean {
  return platformFeatures[feature];
}
