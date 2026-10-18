import { options, ok, badRequest, serverError, created, unauthorized, tooManyRequests } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { templatesListQuerySchema, templateCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/templates?channel=&limit=&cursor=
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const rl = checkRateLimit(`u:${user.id}:GET:/v1/templates`, 60, 60_000);
    if (!rl.allowed) return tooManyRequests(`rate_limited, retry after ${rl.retryAfter}ms`, req);
    const url = new URL(req.url);
    const input = templatesListQuerySchema.parse({
      channel: url.searchParams.get('channel') ?? undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });

    const supabase = getClientOrThrow(req);
    let q = supabase
      .from('templates')
      .select('id, channel, name, description, subject_tmpl, body_tmpl, closing_tmpl, variables, visibility, is_default, created_at, updated_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(input.limit ?? 20);
    if (input.channel) q = q.eq('channel', input.channel);
    if (input.cursor) q = q.lt('created_at', input.cursor);

    const { data, error } = await q;
    if (error) return serverError("Internal server error", req);

    const items = data ?? [];
    const nextCursor = items.length === (input.limit ?? 20) ? items[items.length - 1]?.created_at : null;
    // Provide both 'templates' and 'items' keys for compatibility with clients/tests
    return ok({ templates: items, items, limit: input.limit ?? 20, nextCursor }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// POST /v1/templates
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = templateCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const rl = checkRateLimit(`u:${user.id}:POST:/v1/templates`, 30, 60_000);
    if (!rl.allowed) return tooManyRequests(`rate_limited, retry after ${rl.retryAfter}ms`, req);
    const supabase = getClientOrThrow(req);
    // Idempotency support: if provided, return the latest template with same (channel,name)
    const idempotency = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || undefined;
    if (idempotency && parsed.success) {
      const { data: existing } = await supabase
        .from('templates')
        .select('id, channel, name, created_at')
        .eq('channel', (parsed.data as any).channel)
        .eq('name', (parsed.data as any).name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return ok({ template: existing, idempotent: true }, req);
    }
    // Add user_id from authenticated user (required by table schema)
    const insert: any = { ...parsed.data, user_id: user.id };

    const { data, error} = await supabase
      .from('templates')
      .insert([insert])
      .select('id, channel, name, created_at')
      .single();
    if (error) return serverError("Internal server error", req);
    return created({ template: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
