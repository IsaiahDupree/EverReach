import { options, ok, unauthorized, serverError, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getServiceStorageClient, getDefaultBucketName } from "@/lib/storage";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

// GET /v1/attachments/:id/url
// Returns a signed URL (1 hour expiry) for accessing the attachment
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);
  
  // Get attachment record to verify it exists and get the file path
  const { data: attachment, error: fetchError } = await supabase
    .from('attachments')
    .select('id, file_path, mime_type, size_bytes, created_at')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError) return serverError(`Database error: ${fetchError.message}`, req);
  if (!attachment) return notFound('Attachment not found', req);

  // Extract filename from path
  const fileName = attachment.file_path.split('/').pop() || 'file';

  // Generate signed URL (1 hour expiry)
  // Use service storage client for privileged operations
  const serviceStorage = getServiceStorageClient();
  const bucket = getDefaultBucketName();
  
  // Bucket is private, always use signed URL
  const { data: urlData, error: urlError} = await serviceStorage
    .storage
    .from(bucket)
    .createSignedUrl(attachment.file_path, 3600); // 1 hour = 3600 seconds

  if (urlError) {
    return serverError(`Failed to generate signed URL: ${urlError.message}`, req);
  }

  return ok({
    attachment: {
      id: attachment.id,
      file_path: attachment.file_path,
      file_name: fileName,
      mime_type: attachment.mime_type,
      size_bytes: attachment.size_bytes,
      created_at: attachment.created_at
    },
    url: urlData.signedUrl,
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
  }, req);
}
