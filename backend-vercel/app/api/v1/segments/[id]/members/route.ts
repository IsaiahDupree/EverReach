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

// GET /v1/segments/[id]/members - Get members of a segment
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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Build query based on segment filters
    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const filters = segment.filters || {};

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
      // Note: Supabase doesn't have easy "not contains" for arrays
      // We'd need to handle exclude in application logic or use a more complex query
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

    // Execute query
    const { data: members, error: membersError, count } = await query;

    if (membersError) {
      console.error('Error fetching segment members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch segment members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      segment_id: id,
      segment_name: segment.name,
      members: members || [],
      total: count || 0,
      limit,
      offset,
      filters: segment.filters,
    });

  } catch (error) {
    console.error('Segment members GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
