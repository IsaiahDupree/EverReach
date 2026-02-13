import { ok, options, badRequest, serverError } from "@/lib/cors";
import { uploadSignSchema } from "@/lib/validation";
import { getServiceStorageClient, getDefaultBucketName } from "@/lib/storage";

export const runtime = 'nodejs';

export async function OPTIONS(req: Request){ return options(req); }

export async function POST(req: Request){
  try {
    const body = await req.json();
    const parsed = uploadSignSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.message, req);
    }
    const { path, contentType } = parsed.data;

    const supa = getServiceStorageClient();
    const bucket = getDefaultBucketName();
    // createSignedUploadUrl does not accept contentType; client will set it when uploading
    const { data, error } = await supa.storage.from(bucket).createSignedUploadUrl(path, {
      upsert: true,
    } as any);
    if (error) {
      // Provide a more actionable error if the bucket is missing
      const msg = error.message?.includes('related resource does not exist')
        ? `Storage bucket '${bucket}' not found. Create it or set SUPABASE_STORAGE_BUCKET.`
        : 'Failed to create upload URL';
      return serverError(msg, req);
    }

    return ok({ url: data.signedUrl, path, contentType: contentType || 'application/octet-stream' }, req);
  } catch (err: any) {
    return serverError('Internal error', req);
  }
}
