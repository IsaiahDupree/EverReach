import { options, ok, badRequest, serverError, created } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/feature-requests
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return serverError("Internal server error", req);
    
    const requests = data || [];
    
    // Calculate stats
    const stats = {
      total: requests.length,
      by_status: {
        backlog: requests.filter(r => r.status === 'backlog').length,
        under_review: requests.filter(r => r.status === 'under_review').length,
        planned: requests.filter(r => r.status === 'planned').length,
        in_progress: requests.filter(r => r.status === 'in_progress').length,
        completed: requests.filter(r => r.status === 'completed').length,
        declined: requests.filter(r => r.status === 'declined').length,
      },
      by_category: {
        feature: requests.filter(r => r.category === 'feature').length,
        enhancement: requests.filter(r => r.category === 'enhancement').length,
        bug: requests.filter(r => r.category === 'bug').length,
        integration: requests.filter(r => r.category === 'integration').length,
        other: requests.filter(r => r.category === 'other').length,
      }
    };
    
    return ok({ requests, stats }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// POST /v1/feature-requests
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: any;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const { title, description, category } = body || {};
  if (!title || typeof title !== 'string') return badRequest('title_required', req);

  try {
    const supabase = getClientOrThrow(req);
    // Try to determine org_id (for RLS)
    let orgId: string | null = null;
    try {
      const { data: orgRow } = await supabase
        .from('user_orgs')
        .select('org_id')
        .limit(1)
        .maybeSingle();
      orgId = (orgRow as any)?.org_id ?? null;
    } catch {}

    const insert: any = {
      user_id: user.id,
      org_id: orgId,
      title,
      description: description ?? null,
      category: category ?? null,
      status: 'backlog',
      tags: [],
    };

    const { data, error } = await supabase
      .from('feature_requests')
      .insert([insert])
      .select('*')
      .single();
    if (error) return serverError("Internal server error", req);
    return created({ request: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
