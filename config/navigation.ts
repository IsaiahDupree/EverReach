/**
 * Navigation Configuration
 * Single source of truth for app navigation and access control
 */

export const NAVIGATION_CONFIG = {
  /**
   * Paths that are ALWAYS accessible, regardless of trial or payment status
   * These are core app functions that users must always reach
   * 
   * NOTE: Runtime paths don't include (tabs) - use actual pathname values
   */
  alwaysAllow: [
    '/',                      // Root path (initial render)
    '/home',                  // Dashboard (RUNTIME PATH)
    '/settings',              // Settings (must access to sign out) (RUNTIME PATH)
    '/people',                // Contacts list (RUNTIME PATH)
    '/subscription-plans',    // View/manage subscriptions
    '/billing',               // Billing portal
    '/upgrade-onboarding',    // Paywall screen itself
    '/auth',                  // Authentication flows
    '/sign-in',               // Sign in screen
    '/terms-of-service',      // Legal pages
    '/privacy-policy',
    '/health-status',         // Status pages
    '/test-paywall',          // Test screens
    '/personal-notes',        // Personal notes - FREE ACCESS
    '/contact/',              // Contact detail pages - FREE ACCESS
    '/add-contact',           // Add contact form - FREE ACCESS
    '/account-billing',       // Account billing - FREE ACCESS
    '/feature-request',       // Feature requests - FREE ACCESS
    '/privacy-settings',      // Privacy settings - FREE ACCESS
    '/personal-profile',      // Personal profile - FREE ACCESS
    '/notifications',         // Notifications - FREE ACCESS
    '/alerts',                // Alerts - FREE ACCESS
    '/warmth-settings',       // Warmth settings - FREE ACCESS
  ],

  /**
   * Premium features that require active subscription or trial
   * These paths will be blocked at route level when trial expired and user not paid
   * 
   * NOTE: Runtime paths don't include (tabs) - use actual pathname values
   * 
   * IMPORTANT: Do NOT include routes with component-level PaywallGate to avoid
   * double-gating conflicts. These routes handle their own blocking:
   * 
   * Modal Screens (fullScreenModal):
   * - /goal-picker (has inline PaywallGate)
   * - /message-results (has inline PaywallGate)
   * - /message-templates (has inline PaywallGate)
   * - /voice-note (has inline PaywallGate)
   * - /contact-context/[id] (has inline PaywallGate)
   * - /screenshot-analysis (has inline PaywallGate)
   * 
   * Tab Screens with component gates:
   * - /chat (has PaywallGate wrapper in component)
   */
  premiumFeatures: [
    // REMOVED: /contact-context - now handled by component-level PaywallGate
    '/contact-history',       // Contact interaction history
    '/contact-notes',         // Contact notes editor
    // REMOVED: /screenshot-analysis - now handled by component-level PaywallGate
    '/advanced-analytics',    // Advanced analytics
    '/import-contacts',       // Import contacts (Google, etc.)
    '/import-third-party',    // Third-party imports
    '/import-contacts-review',// Review imported contacts
  ],

  /**
   * Where to redirect when blocking access
   */
  redirectTo: '/upgrade-onboarding',
} as const;

/**
 * Determines if a path should be blocked based on user's subscription status
 * 
 * SOFT PAYWALL: Block premium features when trial expired and not paid
 * Basic navigation (home, settings, contacts list) always allowed
 * 
 * @param path - Current navigation path
 * @param options - User subscription status
 * @returns true if path should be blocked, false otherwise
 */
export function shouldBlockPath(
  path: string,
  { isTrialExpired, isPaid }: { isTrialExpired: boolean; isPaid: boolean }
): boolean {
  // console.log('🔍 [shouldBlockPath] Checking:', { path, isTrialExpired, isPaid });

  // If user is paid or trial is active, allow everything
  if (isPaid || !isTrialExpired) {
    // console.log('✅ [shouldBlockPath] ALLOW - User is paid or trial active');
    return false;
  }

  // Trial expired and not paid - check if path is premium
  // console.log('⚠️ [shouldBlockPath] Trial expired + not paid, checking path...');

  // First check if path is explicitly allowed
  const isAllowed = NAVIGATION_CONFIG.alwaysAllow.some((allowedPath) => {
    // Root path must be exact match; do not allow children implicitly
    if (allowedPath === '/') {
      return path === allowedPath;
    }
    // For other entries, allow exact match or child paths
    return path === allowedPath || path.startsWith(allowedPath + '/');
  });
  if (isAllowed) {
    // console.log('✅ [shouldBlockPath] ALLOW - Path in alwaysAllow list');
    return false;
  }

  // Check if path is a premium feature
  const isPremium = NAVIGATION_CONFIG.premiumFeatures.some(premiumPath => path.startsWith(premiumPath));
  if (isPremium) {
    console.log(`🔒 [shouldBlockPath] BLOCK - Premium feature: ${path}`);
    return true;
  }

  // Default: allow (fail open for unknown paths)
  // console.log('✅ [shouldBlockPath] ALLOW - Unknown path (fail open)');
  return false;
}

/**
 * Check if a specific feature requires premium access
 * Used by FeatureGate component
 */
export function isFeaturePremium(featurePath: string): boolean {
  return NAVIGATION_CONFIG.premiumFeatures.some(
    (premiumPath) => featurePath.startsWith(premiumPath)
  );
}
