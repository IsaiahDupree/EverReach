import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { fileLinkSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/interactions/:id/files – link an uploaded file to an interaction
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = fileLinkSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('attachments')
      .insert([{ file_path: parsed.data.path, mime_type: parsed.data.mime_type, size_bytes: parsed.data.size_bytes, message_id: null, contact_id: null, /* keep nullable */ }])
      .select('id, file_path, created_at')
      .single();
    if (error) return serverError(error.message, req);

    // Attachments schema doesn't have interaction_id; to keep consistent, we can record interaction linkage in metadata later.
    // For now, we update contact linkage if derived from interaction.
    // Fetch interaction to assign contact_id on the attachment for easier retrieval
    const { data: inter } = await supabase.from('interactions').select('contact_id').eq('id', params.id).maybeSingle();
    if (inter?.contact_id) {
      await supabase.from('attachments').update({ contact_id: inter.contact_id }).eq('id', data.id);
    }

    return ok({ attachment: data }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}
