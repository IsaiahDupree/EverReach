import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { personaNoteUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/me/persona-notes/:id
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('persona_notes')
      .select('id, type, status, title, body_text, file_url, duration_sec, transcript, tags, linked_contacts, created_at, updated_at')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) return serverError((error as any).message || 'db_select_failed', req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    
    // Derive contact_id from linked_contacts[0]
    const resp = { ...data, contact_id: (data.linked_contacts && data.linked_contacts[0]) || null };
    return ok(resp, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// PATCH /v1/me/persona-notes/:id
export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = personaNoteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[PATCH persona-notes] Validation failed:', parsed.error.message);
    return badRequest(parsed.error.message, req);
  }
  try {
    const supabase = getClientOrThrow(req);
    let updateData = { ...parsed.data } as any;
    
    // Normalize linked_contacts if provided
    if (Array.isArray(updateData.linked_contacts)) {
      updateData.linked_contacts = updateData.linked_contacts
        .map((c: any) => (typeof c === 'string' ? c : c?.id))
        .filter((v: any) => typeof v === 'string');
    }
    
    // If contact_id provided, verify it exists (RLS ensures user can only access their org's contacts)
    if (updateData.contact_id) {
      const cid = updateData.contact_id as string;
      
      // Verify contact exists - RLS automatically filters by user's org
      const { data: contactCheck, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', cid)
        .maybeSingle();
      
      if (contactError || !contactCheck) {
        console.error('[PATCH persona-notes] Contact not found or unauthorized:', cid, contactError);
        return badRequest('contact_not_found', req);
      }
      
      const { data: current } = await supabase
        .from('persona_notes')
        .select('linked_contacts')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();
      const existing = Array.isArray(current?.linked_contacts) ? current.linked_contacts : [];
      updateData.linked_contacts = Array.from(new Set([cid, ...existing]));
      delete updateData.contact_id; // Don't try to update non-existent column
    }
    
    const { data, error } = await supabase
      .from('persona_notes')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id, type, status, title, body_text, file_url, duration_sec, transcript, tags, linked_contacts, created_at, updated_at')
      .maybeSingle();
    if (error) return serverError((error as any).message || 'db_update_failed', req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    
    // Derive contact_id from linked_contacts[0]
    const resp = { ...data, contact_id: (data.linked_contacts && data.linked_contacts[0]) || null };
    return ok(resp, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// DELETE /v1/me/persona-notes/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('persona_notes')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ deleted: true, id: data.id }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
