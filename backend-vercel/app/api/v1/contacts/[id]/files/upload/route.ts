import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getServiceStorageClient, getDefaultBucketName } from "@/lib/storage";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// POST /v1/contacts/:id/files/upload - Get a presigned upload URL
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('invalid_json', req);
  }

  const { file_name, mime_type, size_bytes } = body;
  
  if (!file_name || !mime_type) {
    return badRequest('file_name and mime_type are required', req);
  }

  try {
    const serviceStorage = getServiceStorageClient();
    const bucket = getDefaultBucketName();
    
    // Generate unique file path: user_id/timestamp-filename
    const timestamp = Date.now();
    const filePath = `${user.id}/${timestamp}-${file_name}`;
    
    // Get presigned upload URL (1 hour expiry)
    const { data: uploadData, error: uploadError } = await serviceStorage
      .storage
      .from(bucket)
      .createSignedUploadUrl(filePath);
    
    if (uploadError) {
      return serverError("Internal server error", req);
    }
    
    return ok({
      upload_url: uploadData.signedUrl,
      file_path: filePath,
      token: uploadData.token
    }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}
