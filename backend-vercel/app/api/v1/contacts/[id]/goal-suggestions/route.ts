import { options, ok, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/contacts/:id/goal-suggestions
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);

    // Prefer contact-specific overrides
    const { data: overrides, error: oErr } = await supabase
      .from('contact_goal_overrides')
      .select('goal_id, score')
      .eq('contact_id', params.id)
      .order('score', { ascending: false })
      .limit(5);
    if (oErr) return serverError(oErr.message, req);

    let items: Array<{ goal_id: string; name: string; score: number; reason: string | null }> = [];

    if (overrides && overrides.length > 0) {
      const ids = overrides.map(o => o.goal_id);
      const { data: goals, error: gErr } = await supabase
        .from('message_goals')
        .select('id, name')
        .in('id', ids);
      if (gErr) return serverError(gErr.message, req);
      const nameById = new Map((goals || []).map(g => [g.id, g.name] as const));
      items = overrides.map(o => ({ goal_id: o.goal_id, name: nameById.get(o.goal_id) || o.goal_id, score: o.score, reason: null }));
    } else {
      // Fallback: top popular goals (global+user) by popularity_score
      const { data: goals, error: gErr } = await supabase
        .from('message_goals')
        .select('id, name, popularity_score')
        .eq('is_active', true)
        .order('popularity_score', { ascending: false })
        .limit(5);
      if (gErr) return serverError(gErr.message, req);
      items = (goals || []).map(g => ({ goal_id: g.id, name: g.name, score: g.popularity_score ?? 0, reason: null }));
    }

    const suggestions = items.map((item, index) => ({
      id: item.goal_id,
      goal: item.name,
      goal_key: item.goal_id,
      reason: item.reason || `Suggested based on your relationship with this contact`,
      priority: index === 0 ? 'high' as const : index < 3 ? 'medium' as const : 'low' as const,
      category: index === 0 ? 'nurture' as const : index === 1 ? 're-engage' as const : index === 2 ? 'convert' as const : 'maintain' as const,
      confidence: Math.max(0.5, Math.min(0.95, item.score / 100)),
    }));

    return ok({ suggestions }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
