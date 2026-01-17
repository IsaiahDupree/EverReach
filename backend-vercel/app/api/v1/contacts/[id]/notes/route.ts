import { options, ok, badRequest, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { interactionCreateSchema } from "@/lib/validation";
import { updateAmplitudeForContact } from "@/lib/warmth-ewma";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/contacts/:id/notes
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get('limit') || '20');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
  const cursor = url.searchParams.get('cursor') || undefined; // ISO of created_at

  const supabase = getClientOrThrow(req);
  let sel = supabase.from('interactions')
    .select('id, contact_id, kind, content, metadata, occurred_at, created_at, updated_at')
    .eq('contact_id', params.id)
    .eq('kind', 'note')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (cursor) sel = sel.lt('created_at', cursor);

  const { data, error } = await sel;
  if (error) return serverError(`Database error: ${error.message}`, req);
  const items = data ?? [];
  const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;
  return ok({ items, limit, nextCursor }, req);
}

// POST /v1/contacts/:id/notes
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  let body: any;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }

  const parsed = interactionCreateSchema.safeParse({
    contact_id: params.id,
    kind: 'note',
    content: body?.content,
    metadata: body?.metadata,
  });
  if (!parsed.success) return badRequest(parsed.error.message, req);

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('interactions')
    .insert([{ contact_id: parsed.data.contact_id, kind: 'note', content: parsed.data.content ?? null, metadata: parsed.data.metadata ?? {} }])
    .select('id, contact_id, kind, content, created_at')
    .single();
  if (error) return serverError(`Database insert failed: ${error.message}`, req);
  try {
    await updateAmplitudeForContact(supabase, parsed.data.contact_id, 'note', data?.created_at ?? undefined);
  } catch (e) {
    console.error('[notes] Failed to update EWMA amplitude:', e);
  }
  
  // Return with note_text alias for consistency (201 Created)
  return new Response(JSON.stringify({
    id: data?.id,
    contact_id: data?.contact_id,
    note_type: data?.kind,
    note_text: data?.content,
    created_at: data?.created_at
  }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
