import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to get user from auth token
async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user;
}

// GET /v1/segments/[id] - Get single segment
export async function GET(
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: segment, error } = await supabase
      .from('segments')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !segment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(segment);

  } catch (error) {
    console.error('Segment GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /v1/segments/[id] - Update segment
export async function PATCH(
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

    const body = await req.json();
    const { name, description, filters, auto_update } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Verify segment exists and belongs to org
    const { data: existingSegment, error: fetchError } = await supabase
      .from('segments')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (fetchError || !existingSegment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (auto_update !== undefined) updates.auto_update = auto_update;

    // If filters changed, validate and trigger recomputation
    if (filters !== undefined) {
      // Validate filters (basic validation)
      if (typeof filters !== 'object') {
        return NextResponse.json(
          { error: 'Filters must be a valid JSON object' },
          { status: 400 }
        );
      }
      updates.filters = filters;
      // Mark for recomputation
      updates.member_count = 0;
      updates.last_computed_at = null;
    }

    // Update segment
    const { data: updatedSegment, error: updateError } = await supabase
      .from('segments')
      .update(updates)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating segment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update segment' },
        { status: 500 }
      );
    }

    // If filters changed, trigger recomputation
    if (filters !== undefined) {
      try {
        await computeSegmentMembers(supabase, id, profile.org_id, filters);
        
        // Fetch updated count
        const { data: recomputedSegment } = await supabase
          .from('segments')
          .select('*')
          .eq('id', id)
          .single();
        
        return NextResponse.json(recomputedSegment || updatedSegment);
      } catch (computeError) {
        console.error('Error computing segment members:', computeError);
        return NextResponse.json(updatedSegment);
      }
    }

    return NextResponse.json(updatedSegment);

  } catch (error) {
    console.error('Segment PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /v1/segments/[id] - Delete segment
export async function DELETE(
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Delete segment
    const { error } = await supabase
      .from('segments')
      .delete()
      .eq('id', id)
      .eq('org_id', profile.org_id);

    if (error) {
      console.error('Error deleting segment:', error);
      return NextResponse.json(
        { error: 'Failed to delete segment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Segment DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to compute segment members (same as in main route)
async function computeSegmentMembers(
  supabase: any,
  segmentId: string,
  orgId: string,
  filters: any
) {
  let query = supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);

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
  }

  if (filters.last_touch_days_ago) {
    if (filters.last_touch_days_ago.gte !== undefined) {
      query = query.gte('last_touch_days_ago', filters.last_touch_days_ago.gte);
    }
  }

  if (filters.tags?.include && filters.tags.include.length > 0) {
    query = query.contains('tags', filters.tags.include);
  }

  if (filters.stage_ids && Array.isArray(filters.stage_ids)) {
    query = query.in('stage_id', filters.stage_ids);
  }

  const { count } = await query;

  await supabase
    .from('segments')
    .update({
      member_count: count || 0,
      last_computed_at: new Date().toISOString(),
    })
    .eq('id', segmentId);

  return count || 0;
}
