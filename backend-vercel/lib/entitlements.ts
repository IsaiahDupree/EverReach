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
  console.log('[recomputeEntitlements] 🔍 Starting for user:', userId);
  const now = new Date().toISOString();
  console.log('[recomputeEntitlements] Current time:', now);
  
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, store')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(25);

  if (subsError) {
    console.error('[recomputeEntitlements] ❌ Database error:', subsError.message);
    return;
  }

  console.log('[recomputeEntitlements] 📋 Found', (subs || []).length, 'subscription(s)');
  if (subs && subs.length > 0) {
    subs.forEach((s, i) => {
      console.log(`  [${i}] status=${s.status}, end=${s.current_period_end}, store=${s.store}`);
    });
  }

  let isPro = false;
  let validUntil: string | null = null;
  let source: Store | 'manual' = 'manual';

  for (const s of (subs as any[]) || []) {
    const st = s.status as string | null;
    const end = s.current_period_end as string | null;
    
    console.log('[recomputeEntitlements] Checking subscription:', { status: st, end, isActive: ACTIVE_STATUSES.has(st || ''), isFuture: end ? end >= now : false });
    
    if (st && ACTIVE_STATUSES.has(st) && end && end >= now) {
      isPro = true;
      validUntil = end;
      source = (s.store as Store) || 'manual';
      console.log('[recomputeEntitlements] ✅ Active subscription found!');
      console.log('  - Expires:', validUntil);
      console.log('  - Source:', source);
      console.log('  - Setting plan to: PRO');
      break;
    }
  }

  const newEntitlement = {
    user_id: userId,
    plan: isPro ? 'pro' : 'free',
    valid_until: isPro ? validUntil : null,
    source,
    updated_at: new Date().toISOString(),
  };

  console.log('[recomputeEntitlements] 💾 Upserting entitlement:', newEntitlement);

  const { error: upsertError } = await supabase.from('entitlements').upsert(newEntitlement);
  
  if (upsertError) {
    console.error('[recomputeEntitlements] ❌ Failed to upsert:', upsertError.message);
  } else {
    console.log('[recomputeEntitlements] ✅ Entitlement saved successfully');
  }
}
