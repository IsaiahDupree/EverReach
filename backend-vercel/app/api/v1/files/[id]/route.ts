/**
 * File CRUD Operations
 * GET /v1/files/:id - Get file details
 * PATCH /v1/files/:id - Update file metadata
 * DELETE /v1/files/:id - Delete file
 */

import { options, ok, notFound, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getServiceStorageClient, getDefaultBucketName } from "@/lib/storage";

export const runtime = "nodejs";

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /v1/files/:id
 * Get file details including metadata and download URL
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const supabase = getClientOrThrow(req);
    
    // Get file metadata from attachments table
    const { data: attachment, error } = await supabase
      .from('attachments')
      .select('id, file_path, mime_type, size_bytes, contact_id, created_at, updated_at')
      .eq('id', params.id)
      .single();

    if (error || !attachment) {
      return notFound("File not found", req);
    }

    // Generate download URL
    const storage = getServiceStorageClient();
    const bucket = getDefaultBucketName();
    const { data: urlData, error: urlError } = await storage.storage
      .from(bucket)
      .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

    if (urlError) {
      console.warn(`[Files] Could not generate download URL for ${attachment.file_path}:`, urlError);
    }

    return ok({
      file: {
        ...attachment,
        download_url: urlData?.signedUrl || null,
      }
    }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}

/**
 * PATCH /v1/files/:id
 * Update file metadata (mime_type, tags, etc.)
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const body = await req.json();
    const supabase = getClientOrThrow(req);

    // Verify file exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('attachments')
      .select('id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existing) {
      return notFound("File not found", req);
    }

    // Update allowed fields
    const updates: any = {};
    if (body.mime_type) updates.mime_type = body.mime_type;
    if (body.size_bytes !== undefined) updates.size_bytes = body.size_bytes;

    const { data, error } = await supabase
      .from('attachments')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) return serverError(error.message, req);

    return ok({ file: data }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}

/**
 * DELETE /v1/files/:id
 * Delete file from storage and database
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const supabase = getClientOrThrow(req);

    // Get file details before deletion
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('id, file_path')
      .eq('id', params.id)
      .single();

    if (fetchError || !attachment) {
      return notFound("File not found", req);
    }

    // Delete from storage
    const storage = getServiceStorageClient();
    const bucket = getDefaultBucketName();
    const { error: storageError } = await storage.storage
      .from(bucket)
      .remove([attachment.file_path]);

    if (storageError) {
      console.error('[Files] Storage deletion error:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', params.id);

    if (deleteError) return serverError(deleteError.message, req);

    return ok({ 
      success: true,
      message: 'File deleted successfully',
      deleted_file_id: params.id
    }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}
