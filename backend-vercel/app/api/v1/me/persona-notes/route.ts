import { options, ok, badRequest, serverError, created, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { personaNoteCreateSchema, personaNotesListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/me/persona-notes?type=text|voice&limit&cursor
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  try {
    const url = new URL(req.url);
    const input = personaNotesListQuerySchema.parse({
      type: url.searchParams.get('type') ?? undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });

    const supabase = getClientOrThrow(req);
    let q = supabase
      .from('persona_notes')
      .select('id, type, status, title, body_text, file_url, duration_sec, transcript, tags, contact_id, created_at, updated_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(input.limit ?? 20);
    if (input.type) q = q.eq('type', input.type);
    if (input.cursor) q = q.lt('created_at', input.cursor);

    const { data, error } = await q;
    if (error) return serverError(error.message, req);

    const items = data ?? [];
    const nextCursor = items.length === (input.limit ?? 20) ? items[items.length - 1]?.created_at : null;
    return ok({ items, limit: input.limit ?? 20, nextCursor }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// POST /v1/me/persona-notes
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = personaNoteCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    const insert = { ...parsed.data } as any;
    
    // Set status based on whether transcript is provided
    if (insert.type === 'voice') {
      insert.status = insert.transcript ? 'ready' : 'pending';
    }
    
    const { data, error } = await supabase
      .from('persona_notes')
      .insert([insert])
      .select('id, type, title, contact_id, created_at')
      .single();
    if (error) return serverError(error.message, req);
    return created({ note: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
