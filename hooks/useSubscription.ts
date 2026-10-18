/**
 * SunTrace - useSubscription hook
 *
 * Returns the current user's subscription tier and derived flags.
 * Reads from Supabase entitlements table (synced by RevenueCat webhook).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface SubscriptionState {
  tier: 'free' | 'core' | 'pro' | 'team';
  isPro: boolean;
  isLoading: boolean;
  isError: boolean;
}

async function fetchEntitlement(): Promise<'free' | 'core' | 'pro' | 'team'> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return 'free';

  const { data, error } = await supabase
    .from('entitlements')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return 'free';
  return data.plan as 'free' | 'core' | 'pro' | 'team';
}

export function useSubscription(): SubscriptionState {
  const { data: tier, isLoading, isError } = useQuery({
    queryKey: ['entitlement'],
    queryFn: fetchEntitlement,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const resolvedTier = tier ?? 'free';

  return {
    tier: resolvedTier,
    isPro: resolvedTier === 'pro' || resolvedTier === 'team',
    isLoading,
    isError,
  };
}
