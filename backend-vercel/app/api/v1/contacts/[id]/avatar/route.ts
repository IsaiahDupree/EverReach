import { options, ok, unauthorized, serverError, notFound, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getServiceStorageClient, getDefaultBucketName } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /api/v1/contacts/:id/avatar
 * Upload a contact profile picture
 * 
 * Accepts multipart/form-data with 'avatar' field containing image file
 * Stores in: attachments/contacts/{contact_id}/{filename}
 * Updates contacts.photo_url with public URL
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const rl = checkRateLimit(`u:${user.id}:POST:/v1/contacts/${params.id}/avatar`, 10, 60_000);
  if (!rl.allowed) return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);

  try {
    const contactId = params.id;
    const supabase = getClientOrThrow(req);

    // Verify contact exists and belongs to user
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError) return serverError("Internal server error", req);
    if (!contact) return notFound('Contact not found', req);

    // Parse multipart form data
    const formData = await req.formData();
    const avatarFile = formData.get('avatar') as File;

    if (!avatarFile) {
      return badRequest('No avatar file provided', req);
    }

    // Validate file type
    if (!avatarFile.type.startsWith('image/')) {
      return badRequest('File must be an image', req);
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (avatarFile.size > MAX_SIZE) {
      return badRequest('File size must be less than 5MB', req);
    }

    // Generate storage path: contacts/{contact_id}/{timestamp}-{filename}
    const timestamp = Date.now();
    const fileExt = avatarFile.name.split('.').pop() || 'jpg';
    const storagePath = `contacts/${contactId}/${timestamp}-avatar.${fileExt}`;

    // Upload to Supabase Storage
    const storage = getServiceStorageClient();
    const bucket = getDefaultBucketName();

    const arrayBuffer = await avatarFile.arrayBuffer();
    const { data: uploadData, error: uploadError } = await storage.storage
      .from(bucket)
      .upload(storagePath, arrayBuffer, {
        contentType: avatarFile.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Avatar Upload] Storage error:', uploadError);
      return serverError("Internal server error", req);
    }

    // Get public URL
    const { data: { publicUrl } } = storage.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    if (!publicUrl) {
      return serverError('Failed to generate public URL', req);
    }

    // Update contact with new photo_url
    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update({ photo_url: publicUrl })
      .eq('id', contactId)
      .select('id, display_name, photo_url')
      .maybeSingle();

    if (updateError) {
      // Try to clean up uploaded file
      await storage.storage.from(bucket).remove([storagePath]);
      return serverError("Internal server error", req);
    }

    console.log(`[Avatar Upload] Success: contact ${contactId}, URL: ${publicUrl}`);

    return ok({
      success: true,
      avatar_url: publicUrl,
      photo_url: publicUrl, // Also return as photo_url for consistency
      contact: updatedContact,
    }, req);

  } catch (error: any) {
    console.error('[Avatar Upload] Error:', error);
    return serverError("Internal server error", req);
  }
}

/**
 * DELETE /api/v1/contacts/:id/avatar
 * Remove a contact's profile picture
 * 
 * Deletes the file from storage and sets photo_url to null
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const rl = checkRateLimit(`u:${user.id}:DELETE:/v1/contacts/${params.id}/avatar`, 10, 60_000);
  if (!rl.allowed) return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);

  try {
    const contactId = params.id;
    const supabase = getClientOrThrow(req);

    // Get current contact to find photo path
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('id, photo_url')
      .eq('id', contactId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError) return serverError("Internal server error", req);
    if (!contact) return notFound('Contact not found', req);

    // Extract storage path from photo_url if it exists and is from our storage
    const storage = getServiceStorageClient();
    const bucket = getDefaultBucketName();
    
    if (contact.photo_url && contact.photo_url.includes('/storage/v1/object/public/')) {
      try {
        // Extract path from URL: .../attachments/contacts/{id}/...
        const urlParts = contact.photo_url.split(`/${bucket}/`);
        if (urlParts.length > 1) {
          const storagePath = urlParts[1];
          
          // Delete from storage
          const { error: deleteError } = await storage.storage
            .from(bucket)
            .remove([storagePath]);

          if (deleteError) {
            console.warn('[Avatar Delete] Storage deletion failed:', deleteError);
            // Continue anyway to clear the database field
          } else {
            console.log(`[Avatar Delete] Deleted from storage: ${storagePath}`);
          }
        }
      } catch (err) {
        console.warn('[Avatar Delete] Failed to parse storage path:', err);
        // Continue anyway to clear the database field
      }
    }

    // Update contact to remove photo_url
    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update({ photo_url: null })
      .eq('id', contactId)
      .select('id, display_name, photo_url')
      .maybeSingle();

    if (updateError) {
      return serverError("Internal server error", req);
    }

    console.log(`[Avatar Delete] Success: contact ${contactId}`);

    return ok({
      success: true,
      contact: updatedContact,
    }, req);

  } catch (error: any) {
    console.error('[Avatar Delete] Error:', error);
    return serverError("Internal server error", req);
  }
}
