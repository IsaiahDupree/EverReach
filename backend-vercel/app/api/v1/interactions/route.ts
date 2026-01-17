import { options, ok, unauthorized, serverError, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { interactionCreateSchema } from "@/lib/validation";
import { updateAmplitudeForContact } from "@/lib/warmth-ewma";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/interactions?contact_id=...&type=note|call|...&start=ISO&end=ISO&limit=&cursor=&sort=created_at:desc
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const rl = checkRateLimit(`u:${user.id}:GET:/v1/interactions`, 60, 60_000);
  if (!rl.allowed) return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);

  const url = new URL(req.url);
  const contact_id = url.searchParams.get('contact_id') || undefined;
  // Support legacy `type` and new `channel` filter
  const channel = url.searchParams.get('channel') || url.searchParams.get('type') || undefined;
  const start = url.searchParams.get('start') || undefined;
  const end = url.searchParams.get('end') || undefined;
  const limitParam = Number(url.searchParams.get('limit') || '20');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
  const cursor = url.searchParams.get('cursor') || undefined; // ISO of created_at
  const sortParam = url.searchParams.get('sort') || 'created_at:desc';

  // Parse sort parameter (e.g., "created_at:desc" or "occurred_at:desc")
  const [sortField, sortOrder] = sortParam.split(':');
  const validSortFields = ['created_at', 'occurred_at', 'updated_at'];
  const actualSortField = validSortFields.includes(sortField) ? sortField : 'created_at';
  const ascending = sortOrder === 'asc';

  const supabase = getClientOrThrow(req);
  
  // Enhanced select with contact name join for better display
  let sel = supabase.from('interactions')
    .select(`
      id,
      contact_id,
      channel,
      direction,
      summary,
      content,
      metadata,
      occurred_at,
      created_at,
      updated_at,
      contacts(id, display_name)
    `)
    .order(actualSortField, { ascending })
    .order('id', { ascending: false }) // Secondary sort for stability
    .limit(limit);

  if (contact_id) sel = sel.eq('contact_id', contact_id);
  if (channel) sel = sel.eq('channel', channel);
  if (start) sel = sel.gte('created_at', start);
  if (end) sel = sel.lte('created_at', end);
  if (cursor) {
    // Cursor pagination based on sort field
    if (ascending) {
      sel = sel.gt(actualSortField, cursor);
    } else {
      sel = sel.lt(actualSortField, cursor);
    }
  }

  const { data, error } = await sel;
  if (error) return serverError(`Database error: ${error.message}`, req);
  
  // Transform response to flatten contact data
  const items = (data ?? []).map((item: any) => {
    const contact = item.contacts;
    return {
      id: item.id,
      contact_id: item.contact_id,
      contact_name: contact?.display_name || undefined,
      channel: item.channel,
      direction: item.direction,
      summary: item.summary,
      content: item.content,
      body: item.content,  // Backward compatibility alias for frontend
      metadata: item.metadata,
      occurred_at: item.occurred_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  });
  
  const nextCursor = items.length === limit 
    ? (items[items.length - 1] as any)[actualSortField] 
    : null;
  
  return ok({ 
    items, 
    limit, 
    nextCursor,
    sort: `${actualSortField}:${ascending ? 'asc' : 'desc'}`
  }, req);
}

// POST /v1/interactions – create interaction
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON', req); }
  const parsed = interactionCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(`Validation error: ${JSON.stringify(parsed.error.flatten())}`, req);

  const supabase = getClientOrThrow(req);
  const nowIso = new Date().toISOString();
  // Backward-compatible mapping: accept either {kind, content} or {channel, direction, summary, body}
  const channelVal = (parsed.data as any).channel ?? (parsed.data as any).kind ?? 'note';
  const directionVal = (parsed.data as any).direction ?? 'outbound';
  const summaryVal = (parsed.data as any).summary ?? ((parsed.data as any).content ? String((parsed.data as any).content).slice(0, 200) : null);
  const contentVal = (parsed.data as any).content ?? (parsed.data as any).body ?? null;

  const { data, error } = await supabase
    .from('interactions')
    .insert([{ 
      contact_id: (parsed.data as any).contact_id, 
      channel: channelVal, 
      direction: directionVal, 
      summary: summaryVal, 
      content: contentVal, 
      metadata: (parsed.data as any).metadata ?? {}, 
      occurred_at: (parsed.data as any).occurred_at ?? nowIso 
    }])
    .select('id, contact_id, channel, created_at')
    .single();

  if (error) return serverError(`Database insert failed: ${error.message}`, req);
  // EWMA amplitude update (non-blocking failure)
  try {
    await updateAmplitudeForContact(supabase, (parsed.data as any).contact_id, channelVal, (parsed.data as any).occurred_at ?? nowIso);
  } catch (e) {
    console.error('[interactions] Failed to update EWMA amplitude:', e);
  }
  return ok({ interaction: data }, req);
}
