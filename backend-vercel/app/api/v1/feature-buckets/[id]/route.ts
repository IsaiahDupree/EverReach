/**
 * Individual Feature Bucket API
 * 
 * Endpoints:
 * - GET /api/v1/feature-buckets/:id - Get bucket details with top requests
 * - PATCH /api/v1/feature-buckets/:id - Update bucket (admin)
 * - DELETE /api/v1/feature-buckets/:id - Delete bucket (admin)
 */

import { options } from "@/lib/cors";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/v1/feature-buckets/:id
 * Get bucket details with top requests
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    const { id } = params;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get bucket details from rollup view
    const { data: bucket, error: bucketError } = await supabase
      .from('feature_bucket_rollups')
      .select('*')
      .eq('bucket_id', id)
      .single();

    if (bucketError || !bucket) {
      return NextResponse.json(
        { error: 'Bucket not found' },
        { status: 404 }
      );
    }

    // Get top requests in this bucket (by votes)
    const { data: requests, error: requestsError } = await supabase
      .from('feature_requests')
      .select(`
        id,
        title,
        description,
        type,
        status,
        created_at,
        votes:feature_votes(count)
      `)
      .eq('bucket_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (requestsError) {
      console.error('[FeatureBucket] Requests query error:', requestsError);
    }

    // Calculate votes per request
    const requestsWithVotes = (requests || []).map(r => ({
      ...r,
      votes_count: Array.isArray(r.votes) ? r.votes[0]?.count || 0 : 0,
    })).sort((a, b) => b.votes_count - a.votes_count);

    // Get recent activity
    const { data: activity } = await supabase
      .from('feature_activity')
      .select('*')
      .eq('bucket_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Check if user has voted for any requests in this bucket
    let userVotedRequestIds: string[] = [];
    if (user) {
      const { data: userVotes } = await supabase
        .from('feature_votes')
        .select('feature_id')
        .eq('user_id', user.id)
        .in('feature_id', requestsWithVotes.map(r => r.id));
      
      userVotedRequestIds = userVotes?.map(v => v.feature_id) || [];
    }

    // Enhance requests with user_has_voted
    const enhancedRequests = requestsWithVotes.map(r => ({
      ...r,
      user_has_voted: userVotedRequestIds.includes(r.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...bucket,
        requests: enhancedRequests,
        activity: activity || [],
      },
    });
  } catch (error: any) {
    console.error('[FeatureBucket] GET error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/feature-buckets/:id
 * Update bucket status or details (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // TODO: Check if user is admin
    // For now, allow authenticated users

    const { id } = params;
    const body = await request.json();
    const { 
      title, 
      summary, 
      description, 
      status, 
      priority, 
      goal_votes, 
      tags,
      target_version,
      declined_reason,
      note, // Optional note for status change
    } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get existing bucket
    const { data: existing, error: fetchError } = await supabase
      .from('feature_buckets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Bucket not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (summary !== undefined) updates.summary = summary;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (goal_votes !== undefined) updates.goal_votes = goal_votes;
    if (tags !== undefined) updates.tags = tags;
    if (target_version !== undefined) updates.target_version = target_version;
    if (declined_reason !== undefined) updates.declined_reason = declined_reason;

    // Special handling for shipped status
    if (status === 'shipped' && existing.status !== 'shipped') {
      updates.shipped_at = new Date().toISOString();
    }

    // Update bucket
    const { data, error } = await supabase
      .from('feature_buckets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[FeatureBucket] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update bucket' },
        { status: 500 }
      );
    }

    // Log activity if status changed
    if (status && status !== existing.status) {
      await supabase
        .from('feature_activity')
        .insert({
          bucket_id: id,
          actor_user_id: user.id,
          type: 'status_change',
          payload: {
            old_status: existing.status,
            new_status: status,
            note: note,
          },
        });

      // TODO: Notify voters when shipped
      if (status === 'shipped') {
        console.log('[FeatureBucket] TODO: Notify voters that bucket shipped:', id);
      }
    }

    console.log('[FeatureBucket] Updated:', id, 'by', user.id);

    return NextResponse.json({
      success: true,
      data,
      message: 'Bucket updated successfully',
    });
  } catch (error: any) {
    console.error('[FeatureBucket] PATCH error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/feature-buckets/:id
 * Delete bucket (admin only, moves requests to unbucketed)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // TODO: Check if user is admin

    const { id } = params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, unbucket all requests
    await supabase
      .from('feature_requests')
      .update({ bucket_id: null })
      .eq('bucket_id', id);

    // Delete the bucket (cascade will handle activity)
    const { error } = await supabase
      .from('feature_buckets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[FeatureBucket] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete bucket' },
        { status: 500 }
      );
    }

    console.log('[FeatureBucket] Deleted:', id, 'by', user.id);

    return NextResponse.json({
      success: true,
      message: 'Bucket deleted successfully',
    });
  } catch (error: any) {
    console.error('[FeatureBucket] DELETE error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export function OPTIONS(req: Request) {
  return options(req);
}
