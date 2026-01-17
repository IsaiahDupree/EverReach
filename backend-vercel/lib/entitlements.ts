import { SupabaseClient } from '@supabase/supabase-js';

const ACTIVE_STATUSES = new Set(['trial','active','grace','paused']);

type Store = 'stripe' | 'app_store' | 'play';

export async function getProductIdForStoreSku(supabase: SupabaseClient, store: Store, sku: string | null): Promise<string> {
  if (!sku) return 'pro_monthly';
  const { data } = await supabase
    .from('product_skus')
    .select('product_id')
    .eq('store', store)
    .eq('sku', sku)
    .maybeSingle();
  return (data as any)?.product_id || 'pro_monthly';
}

export async function insertSubscriptionSnapshot(
  supabase: SupabaseClient,
  args: {
    userId: string,
    productId: string,
    store: Store,
    storeAccountId: string,
    status: string | null,
    currentPeriodEndISO: string | null,
  }
) {
  await supabase.from('subscriptions').insert({
    user_id: args.userId,
    product_id: args.productId,
    store: args.store,
    store_account_id: args.storeAccountId,
    status: args.status || 'active',
    current_period_end: args.currentPeriodEndISO || new Date().toISOString(),
  });
}

export async function recomputeEntitlementsForUser(supabase: SupabaseClient, userId: string) {
  const now = new Date().toISOString();
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, store')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(25);

  let isPro = false;
  let validUntil: string | null = null;
  let source: Store | 'manual' = 'manual';

  for (const s of (subs as any[]) || []) {
    const st = s.status as string | null;
    const end = s.current_period_end as string | null;
    if (st && ACTIVE_STATUSES.has(st) && end && end >= now) {
      isPro = true;
      validUntil = end;
      source = (s.store as Store) || 'manual';
      break;
    }
  }

  await supabase.from('entitlements').upsert({
    user_id: userId,
    plan: isPro ? 'pro' : 'free',
    valid_until: isPro ? validUntil : null,
    source,
    updated_at: new Date().toISOString(),
  });
}
