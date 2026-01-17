import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { fileLinkSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/me/persona-notes/:id/files – list files linked to a persona note
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  
  try {
    const supabase = getClientOrThrow(req);
    
    // Verify user owns the persona note
    const { data: note, error: noteError } = await supabase
      .from('persona_notes')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: "Persona note not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Get attachments
    const { data, error } = await supabase
      .from('attachments')
      .select('id, file_path, mime_type, size_bytes, created_at, metadata')
      .eq('persona_note_id', params.id)
      .order('created_at', { ascending: false });
      
    if (error) return serverError(error.message, req);
    return ok({ attachments: data || [] }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}

// POST /v1/me/persona-notes/:id/files – link an uploaded file to a persona note
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = fileLinkSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    
    // Verify user owns the persona note
    const { data: note, error: noteError } = await supabase
      .from('persona_notes')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: "Persona note not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Create attachment
    const { data, error } = await supabase
      .from('attachments')
      .insert([{ 
        file_path: parsed.data.path, 
        mime_type: parsed.data.mime_type, 
        size_bytes: parsed.data.size_bytes, 
        persona_note_id: params.id,
        metadata: (body as any).metadata || {}
      }])
      .select('id, file_path, mime_type, size_bytes, created_at')
      .single();
      
    if (error) return serverError(error.message, req);
    return ok({ attachment: data }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}

// DELETE /v1/me/persona-notes/:id/files?attachment_id=xxx – remove a specific attachment from a persona note
export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const url = new URL(req.url);
  const attachmentId = url.searchParams.get('attachment_id');
  if (!attachmentId) return badRequest('attachment_id query parameter required', req);

  try {
    const supabase = getClientOrThrow(req);
    
    // Verify user owns the persona note and attachment belongs to it
    const { data: note, error: noteError } = await supabase
      .from('persona_notes')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: "Persona note not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Verify attachment exists and belongs to this persona note
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('id, persona_note_id')
      .eq('id', attachmentId)
      .eq('persona_note_id', params.id)
      .single();

    if (fetchError || !attachment) {
      return new Response(JSON.stringify({ error: "Attachment not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Delete the attachment
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) return serverError(deleteError.message, req);
    
    return ok({ success: true, message: 'Attachment deleted' }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}
