import { options, ok, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const supabase = getClientOrThrow(req);
  let profile = null;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, display_name, avatar_url, about, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!error && data) {
      profile = data;
    }
  } catch (err) {
    console.error('[/api/v1/me] profiles table query failed:', err);
  }

  return ok({
    user: { 
      id: user.id, 
      email: profile?.email ?? (user as any).email ?? null, 
      display_name: profile?.display_name ?? (user as any).user_metadata?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? (user as any).user_metadata?.avatar_url ?? null,
      about: profile?.about ?? null,
    },
    org: null,
    billing: profile ? {
      stripe_customer_id: profile.stripe_customer_id ?? null,
      stripe_subscription_id: profile.stripe_subscription_id ?? null,
      stripe_price_id: profile.stripe_price_id ?? null,
      subscription_status: profile.subscription_status ?? null,
      current_period_end: profile.current_period_end ?? null,
    } : null,
  }, req);
}

export async function PATCH(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const supabase = getClientOrThrow(req);

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const display_name = typeof body.display_name === 'string' ? String(body.display_name).slice(0, 200) : undefined;
  const avatar_url = typeof body.avatar_url === 'string' ? String(body.avatar_url).slice(0, 1024) : undefined;
  const about = typeof body.about === 'string' ? String(body.about).slice(0, 1000) : undefined;

  const patch: Record<string, any> = {};
  if (display_name !== undefined) patch.display_name = display_name;
  if (avatar_url !== undefined) patch.avatar_url = avatar_url;
  if (about !== undefined) patch.about = about;

  // Ensure we don't send empty patch
  if (Object.keys(patch).length === 0) {
    return ok({ message: 'No changes' }, req);
  }

  // Upsert profile row by user_id
  await supabase
    .from('profiles')
    .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });

  // Read back updated profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, display_name, avatar_url, about, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  return ok({
    user: {
      id: user.id,
      email: profile?.email ?? user.email ?? null,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      about: profile?.about ?? null,
    },
    billing: profile ? {
      stripe_customer_id: profile.stripe_customer_id ?? null,
      stripe_subscription_id: profile.stripe_subscription_id ?? null,
      stripe_price_id: profile.stripe_price_id ?? null,
      subscription_status: profile.subscription_status ?? null,
      current_period_end: profile.current_period_end ?? null,
    } : null,
  }, req);
}
