import { ok, options, buildCorsHeaders } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = 'nodejs';

export async function OPTIONS(req: Request){ return options(req); }

export async function GET(req: Request){
  const origin = req.headers.get("origin") ?? undefined;

  // Auth required
  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
  }

  // simple per-user rate limit
  const rl = checkRateLimit(`u:${user.id}:GET:/recommendations/daily`, 60, 60_000);
  if (!rl.allowed) {
    const res = new Response(JSON.stringify({ error: { code: 'rate_limited', retryAfter: rl.retryAfter } }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  // Heuristic v1: suggest up to 10 tasks that are pending (not completed)
  // and due_at is in the past or not set, sorted by due_at asc then created_at desc
  try {
    const supabase = getClientOrThrow(req);
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, description, due_at, created_at')
      .is('completed_at', null)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return new Response(JSON.stringify({ error: { code: 'db_select_failed', message: 'Failed to load tasks' } }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
      });
    }

    // Shape into a generic recommendations array
    const recs = (tasks ?? []).map(t => ({
      type: 'task',
      id: t.id,
      title: t.title,
      due_at: t.due_at,
      created_at: t.created_at,
      reason: t.due_at ? 'Due task' : 'Pending task without due date',
    }));

    return ok({ recommendations: recs }, req);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { code: 'unexpected', message: err?.message || 'Internal error' } }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
  }
}
