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

// Helper to validate segment filters
function validateFilters(filters: any): { valid: boolean; error?: string } {
  if (!filters || typeof filters !== 'object') {
    return { valid: false, error: 'Filters must be a valid JSON object' };
  }

  // Valid filter keys
  const validKeys = [
    'warmth_band',
    'warmth_score',
    'last_touch_days_ago',
    'tags',
    'custom_fields',
    'stage_ids',
    'pipeline_ids',
    'has_email',
    'has_phone',
    'created_after',
    'created_before',
  ];

  for (const key of Object.keys(filters)) {
    if (!validKeys.includes(key)) {
      return { valid: false, error: `Invalid filter key: ${key}. Valid keys: ${validKeys.join(', ')}` };
    }
  }

  // Validate warmth_band format
  if (filters.warmth_band) {
    if (!Array.isArray(filters.warmth_band)) {
      return { valid: false, error: 'warmth_band must be an array' };
    }
    const validBands = ['hot', 'warm', 'cooling', 'cold', 'unknown'];
    for (const band of filters.warmth_band) {
      if (!validBands.includes(band)) {
        return { valid: false, error: `Invalid warmth band: ${band}. Valid: ${validBands.join(', ')}` };
      }
    }
  }

  // Validate warmth_score format
  if (filters.warmth_score) {
    if (typeof filters.warmth_score !== 'object') {
      return { valid: false, error: 'warmth_score must be an object with operators (gte, lte, gt, lt, eq)' };
    }
  }

  // Validate tags format
  if (filters.tags) {
    if (typeof filters.tags !== 'object') {
      return { valid: false, error: 'tags must be an object with include/exclude arrays' };
    }
    if (filters.tags.include && !Array.isArray(filters.tags.include)) {
      return { valid: false, error: 'tags.include must be an array' };
    }
    if (filters.tags.exclude && !Array.isArray(filters.tags.exclude)) {
      return { valid: false, error: 'tags.exclude must be an array' };
    }
  }

  return { valid: true };
}

// POST /v1/segments - Create new segment
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, description, filters, auto_update } = body;

    // Validation
    if (!name || !filters) {
      return NextResponse.json(
        { error: 'Missing required fields: name, filters' },
        { status: 400 }
      );
    }

    // Validate filters
    const filterValidation = validateFilters(filters);
    if (!filterValidation.valid) {
      return NextResponse.json(
        { error: filterValidation.error },
        { status: 400 }
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

    // Insert segment
    const { data: segment, error: insertError } = await supabase
      .from('segments')
      .insert({
        org_id: profile.org_id,
        name,
        description: description || null,
        filters,
        auto_update: auto_update !== undefined ? auto_update : true,
        created_by: user.id,
        member_count: 0, // Will be computed separately
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating segment:', insertError);
      return NextResponse.json(
        { error: 'Failed to create segment' },
        { status: 500 }
      );
    }

    // Trigger member count computation (async)
    // In production, this would be a background job
    // For now, we'll compute it immediately
    try {
      await computeSegmentMembers(supabase, segment.id, profile.org_id, filters);
    } catch (computeError) {
      console.error('Error computing segment members:', computeError);
      // Don't fail the request, just log the error
    }

    // Fetch updated segment with member count
    const { data: updatedSegment } = await supabase
      .from('segments')
      .select('*')
      .eq('id', segment.id)
      .single();

    return NextResponse.json(updatedSegment || segment, { status: 201 });

  } catch (error) {
    console.error('Segments POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /v1/segments - List all segments for the user's org
export async function GET(req: NextRequest) {
  try {
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

    // Fetch segments
    const { data: segments, error, count } = await supabase
      .from('segments')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching segments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch segments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      segments: segments || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Segments GET error:', error);
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
  }

  if (filters.tags) {
    if (filters.tags.include && filters.tags.include.length > 0) {
      query = query.contains('tags', filters.tags.include);
    }
  }

  if (filters.stage_ids && Array.isArray(filters.stage_ids)) {
    query = query.in('stage_id', filters.stage_ids);
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
