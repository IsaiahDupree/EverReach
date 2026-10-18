import { options, ok, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * GET /v1/me/onboarding-status
 * 
 * Returns the user's onboarding and subscription status to determine
 * which flow the frontend should show:
 * 
 * - Initial onboarding (new user)
 * - Paywall/upgrade flow (trial ended, subscription expired, etc.)
 * - Normal app (subscribed and onboarded)
 * 
 * This is the single source of truth for routing users to the correct experience.
 */
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);

  try {
    // 1. Check if user completed initial onboarding
    const { data: onboardingData } = await supabase
      .from('onboarding_responses')
      .select('id, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const completedInitialOnboarding = !!onboardingData;

    // 2. Get subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_subscription_id, current_period_end, trial_started_at, trial_ends_at')  // ✅ ADD trial fields
      .eq('user_id', user.id)
      .maybeSingle();

    const subscriptionStatus = profile?.subscription_status || null;
    const hasActiveSubscription = profile?.stripe_subscription_id && 
      ['active', 'trialing'].includes(subscriptionStatus || '');

    // 3. Check trial expiry
    const currentPeriodEnd = profile?.current_period_end 
      ? new Date(profile.current_period_end)
      : null;
    const now = new Date();
    let trialEnded = currentPeriodEnd ? currentPeriodEnd < now : false;

    // ✅ Also check app-level trial (7-day trial from registration)
    let appTrialEnded = false;
    if (profile?.trial_ends_at && !hasActiveSubscription) {
      const trialEndDate = new Date(profile.trial_ends_at);
      appTrialEnded = trialEndDate < now;
    }

    // Combine both Stripe trial and app-level trial checks
    trialEnded = trialEnded || appTrialEnded;

    // 4. Get subscription from user_subscriptions table (RevenueCat/App Store)
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('status, platform, expires_at, is_trial')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isTrial = subscription?.is_trial || subscriptionStatus === 'trialing';
    const subscriptionExpired = subscription?.expires_at 
      ? new Date(subscription.expires_at) < now
      : false;

    // 5. Determine which flow to show
    const needsUpgradeFlow = completedInitialOnboarding && (
      !hasActiveSubscription ||
      trialEnded ||
      subscriptionExpired ||
      subscriptionStatus === 'canceled' ||
      subscriptionStatus === 'past_due' ||
      subscriptionStatus === 'unpaid'
    );

    const shouldShowPaywall = needsUpgradeFlow;

    // 6. Get reason for paywall (for frontend messaging)
    let paywallReason: string | null = null;
    if (needsUpgradeFlow) {
      if (subscriptionStatus === 'canceled') {
        paywallReason = 'subscription_canceled';
      } else if (subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') {
        paywallReason = 'payment_failed';
      } else if (trialEnded || subscriptionExpired) {
        paywallReason = 'trial_ended';
      } else if (!hasActiveSubscription) {
        paywallReason = 'no_subscription';
      }
    }

    return ok({
      // Onboarding status
      completed_initial_onboarding: completedInitialOnboarding,
      onboarding_completed_at: onboardingData?.created_at || null,

      // Subscription status
      subscription_status: subscriptionStatus,
      has_active_subscription: hasActiveSubscription,
      is_trial: isTrial,
      trial_ended: trialEnded,
      subscription_expired: subscriptionExpired,
      current_period_end: currentPeriodEnd?.toISOString() || null,

      // ✅ App trial fields (7-day trial from registration)
      app_trial_started_at: profile?.trial_started_at || null,
      app_trial_ends_at: profile?.trial_ends_at || null,
      app_trial_ended: appTrialEnded,

      // Flow routing
      needs_upgrade_flow: needsUpgradeFlow,
      should_show_paywall: shouldShowPaywall,
      paywall_reason: paywallReason,

      // Platform info
      payment_platform: subscription?.platform || null,

      // Recommended action for frontend
      recommended_flow: !completedInitialOnboarding 
        ? 'initial_onboarding'
        : needsUpgradeFlow
          ? 'upgrade_paywall'
          : 'normal_app',
    }, req);

  } catch (error: any) {
    console.error('[Onboarding Status] Error:', error);
    
    // Fallback response on error
    return ok({
      completed_initial_onboarding: false,
      subscription_status: null,
      has_active_subscription: false,
      is_trial: false,
      trial_ended: false,
      subscription_expired: false,
      needs_upgrade_flow: false,
      should_show_paywall: false,
      paywall_reason: null,
      recommended_flow: 'initial_onboarding',
    }, req);
  }
}
