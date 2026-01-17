import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { fileLinkSchema } from "@/lib/validation";
import { getServiceStorageClient, getDefaultBucketName } from "@/lib/storage";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/contacts/:id/files – list files linked to a contact with signed URLs
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('attachments')
      .select('id, file_path, mime_type, size_bytes, created_at')
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false });
    if (error) return serverError(error.message, req);
    
    // Generate URLs for each attachment (signed, 1 hour expiry)
    // Use service storage client for privileged operations
    const serviceStorage = getServiceStorageClient();
    const bucket = getDefaultBucketName();
    
    const attachmentsWithUrls = await Promise.all(
      (data || []).map(async (attachment) => {
        // Extract filename from path
        const fileName = attachment.file_path.split('/').pop() || 'file';
        
        // Bucket is private, always use signed URL
        const { data: urlData } = await serviceStorage
          .storage
          .from(bucket)
          .createSignedUrl(attachment.file_path, 3600); // 1 hour
        
        const url = urlData?.signedUrl || null;
        const expires_at = url ? new Date(Date.now() + 3600 * 1000).toISOString() : null;
        
        return {
          id: attachment.id,
          file_name: fileName,
          file_path: attachment.file_path,
          mime_type: attachment.mime_type,
          size_bytes: attachment.size_bytes,
          created_at: attachment.created_at,
          url,
          expires_at
        };
      })
    );
    
    return ok({ files: attachmentsWithUrls }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}

// POST /v1/contacts/:id/files – link an uploaded file to a contact
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
      .insert([{ file_path: parsed.data.path, mime_type: parsed.data.mime_type, size_bytes: parsed.data.size_bytes, contact_id: params.id }])
      .select('id, file_path, created_at')
      .single();
    if (error) return serverError(error.message, req);
    return ok({ attachment: data }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}

// DELETE /v1/contacts/:id/files?attachment_id=xxx – unlink/delete a specific attachment from a contact
export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const url = new URL(req.url);
  const attachmentId = url.searchParams.get('attachment_id');
  if (!attachmentId) return badRequest('attachment_id query parameter required', req);

  try {
    const supabase = getClientOrThrow(req);
    
    // Verify attachment belongs to this contact and user owns the contact
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('id, contact_id')
      .eq('id', attachmentId)
      .eq('contact_id', params.id)
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
