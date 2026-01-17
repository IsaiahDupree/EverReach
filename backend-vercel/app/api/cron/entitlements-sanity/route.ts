import { ok, options, serverError } from "@/lib/cors";
import { getServiceClient } from "@/lib/supabase";
import { recomputeEntitlementsForUser } from "@/lib/entitlements";

export const runtime = 'nodejs';
export async function OPTIONS(){ return options(); }

// GET /api/cron/entitlements-sanity?advanceHours=48&limit=50
export async function GET(req: Request){
  try {
    const url = new URL(req.url);
    const advanceHours = Math.max(1, Math.min(240, Number(url.searchParams.get('advanceHours') || '48')));
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || '50')));

    const supabase = getServiceClient();

    const now = new Date();
    const future = new Date(now.getTime() + advanceHours * 60 * 60 * 1000);

    // Find users with subscriptions expiring soon; fallback to recent subscribers if none
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('user_id, current_period_end')
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', future.toISOString())
      .order('current_period_end', { ascending: true })
      .limit(limit);

    const userIds = Array.from(new Set((subs as any[] || []).map(s => s.user_id))).slice(0, limit);

    let processed = 0;
    for (const uid of userIds) {
      try {
        await recomputeEntitlementsForUser(supabase, uid);
        processed++;
      } catch {}
    }

    return ok({ processed, userIds }, req);
  } catch (e: any) {
    return serverError(e?.message || 'entitlements_sanity_failed');
  }
}
