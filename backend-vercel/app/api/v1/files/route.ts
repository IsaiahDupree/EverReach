import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { uploadSignSchema } from "@/lib/validation";
import { getServiceStorageClient, getDefaultBucketName } from "@/lib/storage";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { MAX_FILE_SIZES } from "@/lib/file-chunking";

export const runtime = 'nodejs';

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/files – list all files with optional filtering
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type'); // 'audio', 'image', 'video', 'document'
    const contactId = url.searchParams.get('contact_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const supabase = getClientOrThrow(req);
    let query = supabase
      .from('attachments')
      .select('id, file_path, mime_type, size_bytes, contact_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by contact if specified
    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    // Filter by file type
    if (type === 'audio') {
      query = query.ilike('mime_type', 'audio/%');
    } else if (type === 'image') {
      query = query.ilike('mime_type', 'image/%');
    } else if (type === 'video') {
      query = query.ilike('mime_type', 'video/%');
    } else if (type === 'document') {
      query = query.or('mime_type.ilike.application/%,mime_type.eq.text/plain');
    }

    const { data, error } = await query;
    if (error) return serverError("Internal server error", req);

    return ok({ files: data || [], count: data?.length || 0 }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}

// POST /v1/files – request presigned upload { path, contentType? }
export async function POST(req: Request){
  try {
    const body = await req.json();
    const parsed = uploadSignSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.message, req);

    const { path, contentType } = parsed.data;
    const supa = getServiceStorageClient();
    const bucket = getDefaultBucketName();
    const { data, error } = await supa.storage.from(bucket).createSignedUploadUrl(path, { upsert: true } as any);
    if (error) return serverError("Internal server error", req);
    return ok({ url: data.signedUrl, path, contentType: contentType || 'application/octet-stream' }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
