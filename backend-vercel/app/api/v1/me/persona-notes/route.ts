import { options, ok, badRequest, serverError, created } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { personaNoteCreateSchema, personaNotesListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/me/persona-notes?type=text|voice|screenshot&contact_id=uuid&limit&cursor
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const url = new URL(req.url);
    const parsed = personaNotesListQuerySchema.safeParse({
      type: url.searchParams.get('type') ?? undefined,
      contact_id: url.searchParams.get('contact_id') ?? undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });
    
    if (!parsed.success) {
      return badRequest(parsed.error.message, req);
    }
    
    const input = parsed.data;
    const supabase = getClientOrThrow(req);
    // Extra guard: enforce max limit even if schema parsing changes
    if ((input as any)?.limit && (input as any).limit > 100) {
      return badRequest('limit_too_large', req);
    }
    let q = supabase
      .from('persona_notes')
      .select('id, type, status, title, body_text, file_url, duration_sec, transcript, tags, linked_contacts, created_at, updated_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(input.limit ?? 20);
    if (input.type) q = q.eq('type', input.type);
    if (input.contact_id) q = q.contains('linked_contacts', [input.contact_id]);
    if (input.cursor) q = q.lt('created_at', input.cursor);

    let { data, error } = await q;
    if (error) return serverError((error as any).message || 'db_select_failed', req);
    
    // Derive contact_id from linked_contacts[0] for each item
    const items = (data ?? []).map(note => ({
      ...note,
      contact_id: (note.linked_contacts && note.linked_contacts[0]) || null
    }));
    const nextCursor = items.length === (input.limit ?? 20) ? items[items.length - 1]?.created_at : null;
    return ok({ items, limit: input.limit ?? 20, nextCursor }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// POST /v1/me/persona-notes
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = personaNoteCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    const insert = { ...parsed.data, user_id: user.id } as any;
    if (Array.isArray(insert.linked_contacts)) {
      insert.linked_contacts = insert.linked_contacts
        .map((c: any) => (typeof c === 'string' ? c : c?.id))
        .filter((v: any) => typeof v === 'string');
    }
    // If contact_id provided, verify it exists (RLS ensures user can only access their org's contacts)
    if (insert.contact_id) {
      const cid = insert.contact_id as string;
      
      // Verify contact exists - RLS automatically filters by user's org
      const { data: contactCheck, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', cid)
        .maybeSingle();
      
      if (contactError || !contactCheck) {
        console.error('[POST persona-notes] Contact not found or unauthorized:', cid, contactError);
        return badRequest('contact_not_found', req);
      }
      
      insert.linked_contacts = Array.from(new Set([cid, ...(insert.linked_contacts || [])]));
      delete insert.contact_id; // Column doesn't exist in DB
    }
    
    // Set status based on type and content
    if (insert.type === 'voice') {
      insert.status = insert.transcript ? 'ready' : 'pending';
    } else if (insert.type === 'screenshot') {
      insert.status = insert.file_url ? 'ready' : 'pending';
    } else if (insert.type === 'text') {
      insert.status = 'ready'; // Text notes are immediately ready
    }

    const { data, error } = await supabase
      .from('persona_notes')
      .insert([insert])
      .select('id, type, status, title, body_text, file_url, duration_sec, transcript, tags, linked_contacts, created_at, updated_at')
      .single();
    if (error) return serverError((error as any).message || 'db_insert_failed', req);
    
    // Auto-create interaction if note is linked to a contact
    if (data && insert.linked_contacts && insert.linked_contacts.length > 0) {
      const contactId = insert.linked_contacts[0];
      
      // Build interaction summary based on note type
      let summary = '';
      if (insert.type === 'voice') {
        summary = insert.transcript ? `Voice note: ${insert.transcript.substring(0, 100)}...` : 'Voice note recorded';
      } else if (insert.type === 'screenshot') {
        summary = insert.title || 'Screenshot captured';
      } else if (insert.type === 'text') {
        summary = insert.body_text ? `Note: ${insert.body_text.substring(0, 100)}...` : 'Note added';
      }
      
      // Create interaction (best-effort, don't fail if this fails)
      try {
        await supabase.from('interactions').insert({
          contact_id: contactId,
          channel: 'note',
          direction: 'outbound',
          summary: summary,
          content: insert.transcript || insert.body_text || insert.title,
          occurred_at: new Date().toISOString(),
          metadata: {
            note_id: data.id,
            note_type: insert.type,
            audio_url: insert.file_url || null,
          }
        });
      } catch (interactionError) {
        console.warn('[POST persona-notes] Failed to create interaction:', interactionError);
        // Don't fail the request if interaction creation fails
      }
    }
    
    // Derive contact_id from linked_contacts[0]
    const resp = {
      ...data,
      contact_id: (data.linked_contacts && data.linked_contacts[0]) || null
    };
    return created(resp, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
