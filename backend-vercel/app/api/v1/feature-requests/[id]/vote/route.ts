/**
 * Feature Request Voting API
 * 
 * Endpoints:
 * - POST /api/v1/feature-requests/:id/vote - Vote for a feature request
 * - DELETE /api/v1/feature-requests/:id/vote - Remove vote from feature request
 */

import { options, ok, created, badRequest, serverError, unauthorized, notFound } from "@/lib/cors";
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = 'nodejs';

/**
 * POST /api/v1/feature-requests/:id/vote
 * Vote for a feature request
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return unauthorized('Authentication required', request);
    }

    const { id: featureId } = params;
    const supabase = getClientOrThrow(request);

    // Check if feature request exists
    const { data: feature, error: fetchError } = await supabase
      .from('feature_requests')
      .select('id, title, votes_count')
      .eq('id', featureId)
      .single();

    if (fetchError || !feature) {
      return notFound('Feature request not found', request);
    }

    // Try to insert vote (will fail if already voted due to unique constraint)
    const { data, error } = await supabase
      .from('feature_votes')
      .insert({
        feature_id: featureId,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate vote error
      if (error.code === '23505') { // Unique violation
        return new Response(JSON.stringify({ error: 'You have already voted for this feature request' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.error('[FeatureVote] Vote error:', error);
      return serverError('Failed to register vote', request);
    }

    console.log('[FeatureVote] Voted:', featureId, 'by', user.id);

    // Get updated feature request
    const { data: updated } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('id', featureId)
      .single();

    return ok({
      request: updated || feature,
    }, request);
  } catch (error: any) {
    console.error('[FeatureVote] POST error:', error);
    return serverError(error?.message || 'Internal server error', request);
  }
}

/**
 * DELETE /api/v1/feature-requests/:id/vote
 * Remove vote from a feature request
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

    const { id: featureId } = params;
    const supabase = getClientOrThrow(request);

    // Delete the vote
    const { data, error } = await supabase
      .from('feature_votes')
      .delete()
      .eq('feature_id', featureId)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.error('[FeatureVote] Unvote error:', error);
      return serverError('Failed to remove vote', request);
    }

    if (!data || data.length === 0) {
      return notFound('Vote not found', request);
    }

    console.log('[FeatureVote] Unvoted:', featureId, 'by', user.id);

    // Get updated feature request
    const { data: updated } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('id', featureId)
      .single();

    return ok({
      request: updated,
    }, request);
  } catch (error: any) {
    console.error('[FeatureRequestVote] DELETE error:', error);
    return serverError(error?.message || 'Internal server error', request);
  }
}

export function OPTIONS(req: Request) {
  return options(req);
}
