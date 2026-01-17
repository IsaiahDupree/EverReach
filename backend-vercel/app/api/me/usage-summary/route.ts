import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { paywallWindowSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /api/me/usage-summary?window=30d
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const url = new URL(req.url);
    const input = paywallWindowSchema.parse({ window: url.searchParams.get('window') ?? undefined });

    const supabase = getClientOrThrow(req);
    
    // Get current usage period data (tracks compose runs, voice minutes, etc.)
    const { data: usagePeriod, error: usageError } = await supabase
      .from('usage_periods')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_end', new Date().toISOString()) // Current/future period
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (usageError) {
      console.error('[usage-summary] Error fetching usage_periods:', usageError);
    }

    // Fallback to paywall_insights_cache for other metrics (if needed)
    const { data: cacheData } = await supabase
      .from('paywall_insights_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('window', input.window || '30d')
      .maybeSingle();

    const cache = cacheData || {} as any;
    const period = usagePeriod || {} as any;

    const usage = {
      // Primary usage metrics from usage_periods table
      compose_runs_used: period.compose_runs_used || 0,
      voice_minutes_used: Number(period.voice_minutes_used || 0),
      screenshot_count: period.screenshot_count || 0, // Screenshot analysis
      
      // Messages sent tracking (fallback to cache)
      messages_sent: cache.messages_sent || 0,
      
      // Additional metrics from cache
      contacts_created: cache.contacts_created || 0,
      messages_drafted: cache.messages_drafted || 0,
      drafts_accepted: cache.drafts_accepted || 0,
      storage_used_mb: Number(cache.storage_used_mb || 0),
      integrations_count: cache.integrations_count || 0,
      top_intents: cache.top_intents || [],
      updated_at: period.updated_at || cache.updated_at || null,
    };

    // Get limits from usage_periods (tier-aware)
    const limits = {
      compose_runs: period.compose_runs_limit || 50,
      voice_minutes: period.voice_minutes_limit || 30,
      screenshots: period.screenshots_limit || 100,
      messages: 200, // TODO: Add to usage_periods table
    };

    const assumptions = [
      `Usage tracked for period: ${period.period_start || 'current'} to ${period.period_end || 'current'}`,
      `Tier: ${period.subscription_tier || 'core'}`,
    ];

    return ok({ window: input.window || '30d', usage, limits, assumptions }, req);
  } catch (e: any) {
    return badRequest(e?.message || 'invalid_query', req);
  }
}
