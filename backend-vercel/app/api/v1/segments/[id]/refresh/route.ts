import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';


// Helper to get user from auth token
async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = getServiceClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user;
}

// POST /v1/segments/[id]/refresh - Refresh segment member count
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Fetch segment with org check
    const { data: segment, error: segmentError } = await supabase
      .from('segments')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (segmentError || !segment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    // Compute member count
    const memberCount = await computeSegmentMembers(
      supabase,
      id,
      profile.org_id,
      segment.filters || {}
    );

    // Fetch updated segment
    const { data: updatedSegment } = await supabase
      .from('segments')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({
      segment: updatedSegment || segment,
      previous_count: segment.member_count,
      current_count: memberCount,
      refreshed_at: new Date().toISOString(),
      message: 'Segment member count refreshed successfully',
    });

  } catch (error) {
    console.error('Segment refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to compute segment members
async function computeSegmentMembers(
  supabase: any,
  segmentId: string,
  orgId: string,
  filters: any
) {
  // Build query based on filters
  let query = supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // Apply filters
  if (filters.warmth_band && Array.isArray(filters.warmth_band)) {
    query = query.in('warmth_band', filters.warmth_band);
  }

  if (filters.warmth_score) {
    if (filters.warmth_score.gte !== undefined) {
      query = query.gte('warmth_score', filters.warmth_score.gte);
    }
    if (filters.warmth_score.lte !== undefined) {
      query = query.lte('warmth_score', filters.warmth_score.lte);
    }
    if (filters.warmth_score.gt !== undefined) {
      query = query.gt('warmth_score', filters.warmth_score.gt);
    }
    if (filters.warmth_score.lt !== undefined) {
      query = query.lt('warmth_score', filters.warmth_score.lt);
    }
    if (filters.warmth_score.eq !== undefined) {
      query = query.eq('warmth_score', filters.warmth_score.eq);
    }
  }

  if (filters.last_touch_days_ago) {
    if (filters.last_touch_days_ago.gte !== undefined) {
      query = query.gte('last_touch_days_ago', filters.last_touch_days_ago.gte);
    }
    if (filters.last_touch_days_ago.lte !== undefined) {
      query = query.lte('last_touch_days_ago', filters.last_touch_days_ago.lte);
    }
    if (filters.last_touch_days_ago.gt !== undefined) {
      query = query.gt('last_touch_days_ago', filters.last_touch_days_ago.gt);
    }
    if (filters.last_touch_days_ago.lt !== undefined) {
      query = query.lt('last_touch_days_ago', filters.last_touch_days_ago.lt);
    }
  }

  if (filters.tags) {
    if (filters.tags.include && filters.tags.include.length > 0) {
      query = query.contains('tags', filters.tags.include);
    }
  }

  if (filters.stage_ids && Array.isArray(filters.stage_ids)) {
    query = query.in('stage_id', filters.stage_ids);
  }

  if (filters.pipeline_ids && Array.isArray(filters.pipeline_ids)) {
    query = query.in('pipeline_id', filters.pipeline_ids);
  }

  if (filters.has_email !== undefined) {
    if (filters.has_email) {
      query = query.not('emails', 'is', null);
    } else {
      query = query.is('emails', null);
    }
  }

  if (filters.has_phone !== undefined) {
    if (filters.has_phone) {
      query = query.not('phones', 'is', null);
    } else {
      query = query.is('phones', null);
    }
  }

  if (filters.created_after) {
    query = query.gte('created_at', filters.created_after);
  }

  if (filters.created_before) {
    query = query.lte('created_at', filters.created_before);
  }

  // Execute count query
  const { count } = await query;

  // Update segment with member count
  await supabase
    .from('segments')
    .update({
      member_count: count || 0,
      last_computed_at: new Date().toISOString(),
    })
    .eq('id', segmentId);

  return count || 0;
}
