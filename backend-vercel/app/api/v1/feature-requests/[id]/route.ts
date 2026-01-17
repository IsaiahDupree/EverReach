/**
 * Individual Feature Request API
 * 
 * Endpoints:
 * - GET /api/v1/feature-requests/:id - Get single feature request
 * - PATCH /api/v1/feature-requests/:id - Update feature request (owner or admin)
 * - DELETE /api/v1/feature-requests/:id - Delete feature request (owner only)
 */

import { options, ok, badRequest, serverError, unauthorized, notFound } from "@/lib/cors";
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = 'nodejs';

/**
 * GET /api/v1/feature-requests/:id
 * Get a single feature request with vote count
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    const { id } = params;

    const supabase = getClientOrThrow(request);

    // Get feature request
    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return notFound('Feature request not found', request);
    }

    // Check if user has voted
    let userHasVoted = false;
    if (user) {
      const { data: vote } = await supabase
        .from('feature_votes')
        .select('id')
        .eq('feature_id', id)
        .eq('user_id', user.id)
        .single();
      
      userHasVoted = !!vote;
    }

    return ok({
      request: {
        ...data,
        user_has_voted: userHasVoted,
      },
    }, request);
  } catch (error: any) {
    console.error('[FeatureRequest] GET error:', error);
    return serverError(error?.message || 'Internal server error', request);
  }
}

/**
 * PATCH /api/v1/feature-requests/:id
 * Update a feature request (owner can update title/description, admin can update status)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return unauthorized('Authentication required', request);
    }

    const { id } = params;
    let body: any;
    try { body = await request.json(); } catch { return badRequest('invalid_json', request); }
    
    const { title, description, status, priority, tags, target_version, declined_reason } = body;

    const supabase = getClientOrThrow(request);

    // Get existing feature request
    const { data: existing, error: fetchError } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return notFound('Feature request not found', request);
    }

    // Check permissions - for now, owner can update
    const isOwner = existing.user_id === user.id;
    
    // TODO: Implement admin check
    const isAdmin = false;

    if (!isOwner && !isAdmin) {
      return unauthorized('You do not have permission to update this feature request', request);
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (tags !== undefined) updates.tags = tags;

    // Update the feature request
    const { data, error } = await supabase
      .from('feature_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[FeatureRequest] Update error:', error);
      return serverError('Failed to update feature request', request);
    }

    console.log('[FeatureRequest] Updated:', id, 'by', user.id);

    return ok({ request: data }, request);
  } catch (error: any) {
    console.error('[FeatureRequest] PATCH error:', error);
    return serverError(error?.message || 'Internal server error', request);
  }
}

/**
 * DELETE /api/v1/feature-requests/:id
 * Delete a feature request (owner only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return unauthorized('Authentication required', request);
    }

    const { id } = params;
    const supabase = getClientOrThrow(request);

    // Verify ownership
    const { data: existing } = await supabase
      .from('feature_requests')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return notFound('Feature request not found', request);
    }

    if (existing.user_id !== user.id) {
      return unauthorized('You do not have permission to delete this feature request', request);
    }

    // Delete the feature request (cascade will handle votes)
    const { error } = await supabase
      .from('feature_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[FeatureRequest] Delete error:', error);
      return serverError('Failed to delete feature request', request);
    }

    console.log('[FeatureRequest] Deleted:', id, 'by', user.id);

    return ok({
      success: true,
      message: 'Feature request deleted successfully',
    }, request);
  } catch (error: any) {
    console.error('[FeatureRequest] DELETE error:', error);
    return serverError(error?.message || 'Internal server error', request);
  }
}

export function OPTIONS(req: Request) {
  return options(req);
}
