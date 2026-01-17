import { options, ok, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

// GET /api/v1/me/entitlements
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const supabase = getClientOrThrow(req);

  // Defaults
  let plan: 'free' | 'pro' = 'free';
  let tier: 'free' | 'core' | 'pro' | 'enterprise' = 'free';
  let source: 'app_store' | 'play' | 'stripe' | 'manual' | 'revenuecat' = 'manual';
  let valid_until: string | null = null;
  let subscription_status: 'active' | 'trial' | 'canceled' | 'past_due' | null = null;
  let trialEndsAt: string | null = null;
  let subscriptionStartedAt: string | null = null;

  // 1) Check subscriptions table first (RevenueCat/App Store purchases)
  // Query all columns with * to see what exists
  let subscription: { status?: string | null; current_period_end?: string | null; product_id?: string | null; started_at?: string | null } | null = null;
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    console.log('[Entitlements] Subscriptions query:', { data, error: error?.message });
    if (data) subscription = data as any;
  } catch (e: any) {
    console.log('[Entitlements] Subscriptions query error:', e?.message);
  }

  // 2) Read Stripe-derived profile fields
  let profile: { subscription_status?: string | null; stripe_price_id?: string | null; current_period_end?: string | null } | null = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_price_id, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) profile = data as any;
  } catch {}

  // 3) Read legacy entitlements row (optional)
  let ents: { plan?: string | null; valid_until?: string | null; source?: string | null } | null = null;
  try {
    const { data } = await supabase
      .from('entitlements')
      .select('plan, valid_until, source')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) ents = data as any;
  } catch {}

  // 4) Derive effective state - check subscriptions table first (RevenueCat), then Stripe, then legacy
  const now = Date.now();
  const periodEndTime = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : 0;
  const isRevenueCatActive = subscription?.status === 'active' && 
    subscription?.current_period_end && 
    periodEndTime > now;
  
  console.log('[Entitlements] RevenueCat check:', { 
    status: subscription?.status, 
    current_period_end: subscription?.current_period_end,
    periodEndTime,
    now,
    isRevenueCatActive 
  });
  
  if (isRevenueCatActive) {
    // RevenueCat/App Store subscription is active
    plan = 'pro'; // Map core to pro for backwards compatibility
    // Derive tier from product_id (e.g., com.everreach.core.monthly -> core)
    const productId = subscription?.product_id || '';
    tier = productId.includes('core') ? 'core' : productId.includes('pro') ? 'pro' : 'core';
    source = 'revenuecat';
    subscription_status = 'active';
    valid_until = subscription?.current_period_end || null;
    subscriptionStartedAt = subscription?.started_at || null;
  } else {
    // Check Stripe
    const isStripePaid = profile?.subscription_status === 'active';
    if (isStripePaid) {
      plan = 'pro';
      tier = 'pro';
      source = 'stripe';
      subscription_status = 'active';
      valid_until = profile?.current_period_end || null;
      // Try to get subscription start date from user_subscriptions table
      try {
        const { data: userSub } = await supabase
          .from('user_subscriptions')
          .select('subscribed_at')
          .eq('user_id', user.id)
          .order('subscribed_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        subscriptionStartedAt = userSub?.subscribed_at || subscription?.started_at || null;
      } catch {
        subscriptionStartedAt = subscription?.started_at || null;
      }
    } else {
      // Fall back to legacy entitlements row
      const legacyPlanPro = (ents?.plan as any) === 'pro';
      const legacyValidUntilFuture = ents?.valid_until ? (new Date(ents.valid_until).getTime() > now) : false;
      const legacyActive = legacyPlanPro && legacyValidUntilFuture;

      plan = legacyPlanPro ? 'pro' : 'free';
      tier = legacyActive ? 'pro' : 'free';
      source = (ents?.source as any) || 'manual';
      subscription_status = legacyActive ? 'active' : 'trial';
      valid_until = ents?.valid_until || null;
      subscriptionStartedAt = subscription?.started_at || null;
    }
  }

  // 4) Build features and trial info
  const features = (subscription_status === 'active')
    ? { compose_runs: 1000, voice_minutes: 300, messages: 2000 }
    : { compose_runs: 50, voice_minutes: 30, messages: 200 };

  if (subscription_status !== 'active') {
    // 7-day trial default when not paid
    trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Extract product_id to determine billing period (monthly vs annual)
  const productId = subscription?.product_id || null;
  const isAnnual = productId ? (productId.includes('annual') || productId.includes('yearly')) : false;
  const isMonthly = productId ? (productId.includes('monthly') || (!productId.includes('annual') && !productId.includes('yearly'))) : false;

  return ok({
    plan,
    valid_until,
    source,
    features,
    tier,
    subscription_status,
    trial_ends_at: trialEndsAt,
    product_id: productId,
    billing_period: isAnnual ? 'annual' : isMonthly ? 'monthly' : null,
    subscription_started_at: subscriptionStartedAt
  }, req);
}
