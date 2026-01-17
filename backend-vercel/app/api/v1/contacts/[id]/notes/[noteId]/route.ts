import { options, ok, unauthorized, serverError, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

// GET /v1/contacts/:id/notes/:noteId
export async function GET(
  req: Request,
  { params }: { params: { id: string; noteId: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('interactions')
    .select('id, contact_id, kind, content, metadata, occurred_at, created_at, updated_at')
    .eq('id', params.noteId)
    .eq('contact_id', params.id)
    .eq('kind', 'note')
    .maybeSingle();

  if (error) return serverError(`Database error: ${error.message}`, req);
  if (!data) return notFound('Note not found', req);

  // Return with note_text alias for consistency with POST
  return ok({
    id: data.id,
    contact_id: data.contact_id,
    note_type: data.kind,
    note_text: data.content,
    created_at: data.created_at
  }, req);
}

// DELETE /v1/contacts/:id/notes/:noteId
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; noteId: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);
  
  // First verify the note exists and belongs to this contact
  const { data: existing, error: fetchError } = await supabase
    .from('interactions')
    .select('id')
    .eq('id', params.noteId)
    .eq('contact_id', params.id)
    .eq('kind', 'note')
    .maybeSingle();

  if (fetchError) return serverError(`Database error: ${fetchError.message}`, req);
  if (!existing) return notFound('Note not found', req);

  // Delete the note
  const { data, error } = await supabase
    .from('interactions')
    .delete()
    .eq('id', params.noteId)
    .eq('contact_id', params.id)
    .eq('kind', 'note')
    .select('id')
    .maybeSingle();

  if (error) return serverError(`Delete failed: ${error.message}`, req);
  if (!data) return notFound('Note not found', req);

  return ok({ deleted: true, id: data.id }, req);
}
