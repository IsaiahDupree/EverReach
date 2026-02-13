import { ok, options, unauthorized, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { interactionCreateSchema, interactionQuerySchema } from "@/lib/validation";
import { updateAmplitudeForContact } from "@/lib/warmth-ewma";

export const runtime = 'nodejs';

export async function OPTIONS(req: Request){ return options(req); }

// GET /api/interactions?contact_id=<uuid>&limit=20&cursor=<ISO>
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const rl = checkRateLimit(`u:${user.id}:GET:/interactions`, 120, 60_000);
  if (!rl.allowed) {
    const res = badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);
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
      .select('id, contact_id, kind, content, metadata, occurred_at, created_at, updated_at')
      .eq('contact_id', input.contact_id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(input.limit);

    if (input.cursor) {
      query = query.lt('created_at', input.cursor);
    }

    const { data, error } = await query;
    if (error) return serverError("Internal server error", req);

    const items = data ?? [];
    const nextCursor = items.length === input.limit ? items[items.length - 1]?.created_at : null;
    return ok({ items, limit: input.limit, nextCursor }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}

// POST /api/interactions
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const rl = checkRateLimit(`u:${user.id}:POST:/interactions`, 60, 60_000);
  if (!rl.allowed) {
    const res = badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  try {
    const body = await req.json();
    const input = interactionCreateSchema.parse(body);

    const supabase = getClientOrThrow(req);
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('interactions')
      .insert([{ contact_id: input.contact_id, kind: input.kind, content: input.content ?? null, metadata: input.metadata ?? {}, occurred_at: input.occurred_at ?? nowIso }])
      .select('id, contact_id, kind, created_at')
      .single();

    if (error) return serverError("Internal server error", req);
    try {
      await updateAmplitudeForContact(supabase, input.contact_id, input.kind, input.occurred_at ?? nowIso);
    } catch (e) {
      console.error('[interactions(api)] Failed to update EWMA amplitude:', e);
    }
    return ok({ interaction: data }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}
