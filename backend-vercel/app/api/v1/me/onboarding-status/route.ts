import { options, ok, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const supabase = getClientOrThrow(req);
  
  try {
    // Fetch user profile with billing and onboarding info
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_completed_at, stripe_subscription_id, subscription_status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('[/api/v1/me/onboarding-status] Error fetching profile:', error);
    }

    // Determine onboarding completion
    const completedInitialOnboarding = profile?.onboarding_completed_at != null;
    const onboardingCompletedAt = profile?.onboarding_completed_at || null;

    // Determine subscription status
    const subscriptionStatus = profile?.subscription_status || null;
    const currentPeriodEnd = profile?.current_period_end || null;
    
    // Check if subscription is active
    const hasActiveSubscription = ['active', 'trialing'].includes(subscriptionStatus || '');
    
    // Check if trial
    const isTrial = subscriptionStatus === 'trialing';
    
    // Check if trial ended
    let trialEnded = false;
    if (isTrial && currentPeriodEnd) {
      const periodEnd = new Date(currentPeriodEnd);
      trialEnded = periodEnd < new Date();
    }
    
    // Check if subscription expired
    const subscriptionExpired = currentPeriodEnd 
      ? new Date(currentPeriodEnd) < new Date()
      : false;

    // Determine if user needs upgrade flow
    let needsUpgradeFlow = false;
    let shouldShowPaywall = false;
    let paywallReason: string | null = null;
    
    if (!completedInitialOnboarding) {
      // New user - needs onboarding first
      needsUpgradeFlow = false;
      shouldShowPaywall = false;
    } else if (trialEnded) {
      // Trial expired
      needsUpgradeFlow = true;
      shouldShowPaywall = true;
      paywallReason = 'trial_ended';
    } else if (subscriptionStatus === 'canceled') {
      // Subscription was canceled
      needsUpgradeFlow = true;
      shouldShowPaywall = true;
      paywallReason = 'subscription_canceled';
    } else if (subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') {
      // Payment failed
      needsUpgradeFlow = true;
      shouldShowPaywall = true;
      paywallReason = 'payment_failed';
    } else if (!hasActiveSubscription && !subscriptionStatus) {
      // No subscription at all
      needsUpgradeFlow = true;
      shouldShowPaywall = true;
      paywallReason = 'no_subscription';
    }

    // Determine recommended flow
    let recommendedFlow: 'initial_onboarding' | 'upgrade_paywall' | 'normal_app';
    if (!completedInitialOnboarding) {
      recommendedFlow = 'initial_onboarding';
    } else if (shouldShowPaywall) {
      recommendedFlow = 'upgrade_paywall';
    } else {
      recommendedFlow = 'normal_app';
    }

    // Determine payment platform (could be extended with RevenueCat data)
    const paymentPlatform = profile?.stripe_subscription_id ? 'stripe' : null;

    return ok({
      // Onboarding status
      completed_initial_onboarding: completedInitialOnboarding,
      onboarding_completed_at: onboardingCompletedAt,

      // Subscription status
      subscription_status: subscriptionStatus,
      has_active_subscription: hasActiveSubscription,
      is_trial: isTrial,
      trial_ended: trialEnded,
      subscription_expired: subscriptionExpired,
      current_period_end: currentPeriodEnd,

      // Flow routing (key fields)
      needs_upgrade_flow: needsUpgradeFlow,
      should_show_paywall: shouldShowPaywall,
      paywall_reason: paywallReason,

      // Platform info
      payment_platform: paymentPlatform,

      // Frontend routing helper
      recommended_flow: recommendedFlow,
    }, req);

  } catch (err) {
    console.error('[/api/v1/me/onboarding-status] Unexpected error:', err);
    
    // Safe fallback response
    return ok({
      completed_initial_onboarding: false,
      onboarding_completed_at: null,
      subscription_status: null,
      has_active_subscription: false,
      is_trial: false,
      trial_ended: false,
      subscription_expired: false,
      current_period_end: null,
      needs_upgrade_flow: false,
      should_show_paywall: false,
      paywall_reason: null,
      payment_platform: null,
      recommended_flow: 'initial_onboarding' as const,
    }, req);
  }
}
