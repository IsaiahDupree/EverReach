import { options, ok, unauthorized, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);
  
  // Fetch profile and subscription data in parallel
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase
      .from('profiles')
      .select('email, display_name, avatar_url, bio, preferences, first_seen_at, last_active_at, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('user_subscriptions')
      .select('subscribed_at, status, current_period_end, origin, trial_started_at, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()
  ]);

  return ok({
    user: { 
      id: user.id, 
      email: profile?.email ?? null, 
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      bio: profile?.bio ?? null,
      preferences: profile?.preferences ?? {},
      first_seen_at: profile?.first_seen_at ?? null,
      last_active_at: profile?.last_active_at ?? null,
    },
    subscription: {
      subscription_date: subscription?.subscribed_at ?? null,
      status: subscription?.status ?? 'none',
      current_period_end: subscription?.current_period_end ?? null,
      origin: subscription?.origin ?? null,
      trial_started_at: subscription?.trial_started_at ?? null,
      trial_ends_at: subscription?.trial_ends_at ?? null,
    },
    org: null, // Starter: no orgs yet
    billing: profile ? {
      stripe_customer_id: profile.stripe_customer_id ?? null,
      stripe_subscription_id: profile.stripe_subscription_id ?? null,
      stripe_price_id: profile.stripe_price_id ?? null,
      subscription_status: profile.subscription_status ?? null,
      current_period_end: profile.current_period_end ?? null,
    } : null,
  }, req);
}

export async function PATCH(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const body = await req.json();
  const { display_name, avatar_url, bio, preferences } = body;

  const supabase = getClientOrThrow(req);
  
  const updates: any = { updated_at: new Date().toISOString() };
  if (display_name !== undefined) updates.display_name = display_name;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url; // Can be null to remove
  if (bio !== undefined) updates.bio = bio; // Can be null to remove
  if (preferences !== undefined) updates.preferences = preferences;

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select('email, display_name, avatar_url, bio, preferences')
    .single();

  if (error) {
    return badRequest(`Failed to update profile: ${error.message}`, req);
  }

  return ok({
    user: {
      id: user.id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      preferences: profile.preferences ?? {}
    }
  }, req);
}
