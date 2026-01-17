import { ok, options, buildCorsHeaders } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { interactionCreateSchema, interactionQuerySchema } from "@/lib/validation";

export const runtime = 'nodejs';

export async function OPTIONS(req: Request){ return options(req); }

// GET /api/interactions?contact_id=<uuid>&limit=20&cursor=<ISO>
export async function GET(req: Request){
  const origin = req.headers.get("origin") ?? undefined;
  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
  }

  const rl = checkRateLimit(`u:${user.id}:GET:/interactions`, 120, 60_000);
  if (!rl.allowed) {
    const res = new Response(JSON.stringify({ error: { code: 'rate_limited', retryAfter: rl.retryAfter } }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  try {
    const url = new URL(req.url);
    const input = interactionQuerySchema.parse({
      contact_id: url.searchParams.get('contact_id') ?? undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });

    const supabase = getClientOrThrow(req);
    let query = supabase
      .from('interactions')
      .select('id, contact_id, kind, channel, direction, summary, sentiment, content, metadata, occurred_at, created_at, updated_at')
      .eq('contact_id', input.contact_id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(input.limit);

    if (input.cursor) {
      query = query.lt('created_at', input.cursor);
    }

    const { data, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: { code: 'db_select_failed', message: 'Failed to load interactions', details: error.message } }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
      });
    }

    const items = data ?? [];
    const nextCursor = items.length === input.limit ? items[items.length - 1]?.created_at : null;
    return ok({ items, limit: input.limit, nextCursor }, req);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { code: 'unexpected', message: err?.message || 'Internal error' } }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
  }
}

// POST /api/interactions
export async function POST(req: Request){
  const origin = req.headers.get("origin") ?? undefined;
  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
  }

  const rl = checkRateLimit(`u:${user.id}:POST:/interactions`, 60, 60_000);
  if (!rl.allowed) {
    const res = new Response(JSON.stringify({ error: { code: 'rate_limited', retryAfter: rl.retryAfter } }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  try {
    const body = await req.json();
    const input = interactionCreateSchema.parse(body);

    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('interactions')
      .insert([{ contact_id: input.contact_id, kind: input.kind, content: input.content ?? null, metadata: input.metadata ?? {} }])
      .select('id, contact_id, kind, created_at')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: { code: 'db_insert_failed', message: 'Failed to create interaction', details: error.message } }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify({ interaction: data }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { code: 'unexpected', message: err?.message || 'Internal error' } }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
  }
}
