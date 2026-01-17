import { options, ok } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { interactionCreateSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/interactions?contact_id=...&type=note|call|...&start=ISO&end=ISO&limit=&cursor=
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const rl = checkRateLimit(`u:${user.id}:GET:/v1/interactions`, 60, 60_000);
  if (!rl.allowed) return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: rl.retryAfter }), { status: 429 });

  const url = new URL(req.url);
  const contact_id = url.searchParams.get('contact_id') || undefined;
  const kind = url.searchParams.get('type') || undefined;
  const start = url.searchParams.get('start') || undefined;
  const end = url.searchParams.get('end') || undefined;
  const limitParam = Number(url.searchParams.get('limit') || '20');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
  const cursor = url.searchParams.get('cursor') || undefined; // ISO of created_at

  const supabase = getClientOrThrow(req);
  let sel = supabase.from('interactions')
    .select('id, contact_id, kind, channel, direction, summary, sentiment, content, metadata, occurred_at, created_at, updated_at, contacts!inner(display_name, warmth, warmth_band, avatar_url)')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (contact_id) sel = sel.eq('contact_id', contact_id);
  if (kind) sel = sel.eq('kind', kind);
  if (start) sel = sel.gte('created_at', start);
  if (end) sel = sel.lte('created_at', end);
  if (cursor) sel = sel.lt('created_at', cursor);

  const { data, error } = await sel;
  if (error) return new Response(JSON.stringify({ error: 'db_select_failed', details: error.message }), { status: 500 });
  
  // Flatten contact data into interaction object
  const items = (data ?? []).map((item: any) => {
    const contact = item.contacts;
    return {
      ...item,
      contact_name: contact?.display_name,
      contact_warmth: contact?.warmth,
      contact_warmth_band: contact?.warmth_band,
      contact_avatar_url: contact?.avatar_url,
      contacts: undefined, // Remove nested object
    };
  });
  
  const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;
  return ok({ items, limit, nextCursor }, req);
}

// POST /v1/interactions – create interaction
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 }); }
  const parsed = interactionCreateSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'validation_error', details: parsed.error.flatten() }), { status: 422 });

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('interactions')
    .insert([{ contact_id: parsed.data.contact_id, kind: parsed.data.kind, content: parsed.data.content ?? null, metadata: parsed.data.metadata ?? {} }])
    .select('id, contact_id, kind, created_at')
    .single();

  if (error) return new Response(JSON.stringify({ error: 'db_insert_failed', details: error.message }), { status: 500 });
  return ok({ interaction: data }, req);
}
