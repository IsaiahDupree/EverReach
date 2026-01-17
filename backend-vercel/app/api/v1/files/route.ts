import { options, ok, badRequest, serverError } from "@/lib/cors";
import { uploadSignSchema } from "@/lib/validation";
import { getServiceStorageClient, getDefaultBucketName } from "@/lib/storage";

export const runtime = 'nodejs';

export function OPTIONS(req: Request){ return options(req); }

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
    if (error) return serverError(error.message, req);
    return ok({ url: data.signedUrl, path, contentType: contentType || 'application/octet-stream' }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
