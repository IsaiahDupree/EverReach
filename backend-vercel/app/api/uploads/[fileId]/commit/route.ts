/**
 * Upload Commit Endpoint
 * POST /uploads/[fileId]/commit
 * 
 * Commits an upload after the file has been uploaded to storage.
 * This marks the file as ready for processing.
 */

import { ok, options, badRequest, serverError, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) { 
  return options(req); 
}

export async function POST(
  req: Request,
  { params }: { params: { fileId: string } }
) {
  // Auth required
  const user = await getUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }), 
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limit: 30 commits per minute
  const rl = checkRateLimit(`u:${user.id}:POST:/uploads/commit`, 30, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'rate_limited', 
          retryAfter: rl.retryAfter 
        } 
      }), 
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { fileId } = params;
  
  if (!fileId || fileId.length === 0) {
    return badRequest('fileId is required', req);
  }

  try {
    const supabase = getClientOrThrow(req);

    // Check if file upload record exists
    const { data: upload, error: fetchError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !upload) {
      return notFound('Upload not found', req);
    }

    // Mark upload as committed
    const { data, error: updateError } = await supabase
      .from('file_uploads')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to commit upload:', updateError);
      return serverError('Failed to commit upload', req);
    }

    return ok({
      file_id: data.id,
      file_url: data.file_url,
      status: data.status,
      completed_at: data.completed_at,
    }, req);

  } catch (err: any) {
    console.error('Upload commit error:', err);
    return serverError(err?.message || 'Internal error', req);
  }
}
