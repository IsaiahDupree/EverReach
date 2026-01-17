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

// Helper to validate rule type and structure
function validateRule(rule: any): { valid: boolean; error?: string } {
  const { type, conditions, actions } = rule;

  // Validate type
  const validTypes = [
    'warmth_threshold',
    'stage_change',
    'tag_added',
    'interaction_created',
    'no_touch_days',
  ];

  if (!type || !validTypes.includes(type)) {
    return { valid: false, error: `Invalid rule type. Valid types: ${validTypes.join(', ')}` };
  }

  // Validate conditions
  if (!conditions || typeof conditions !== 'object') {
    return { valid: false, error: 'Conditions must be a valid JSON object' };
  }

  // Validate actions
  if (!actions || typeof actions !== 'object') {
    return { valid: false, error: 'Actions must be a valid JSON object' };
  }

  // Type-specific validation
  if (type === 'warmth_threshold') {
    if (typeof conditions.warmth_threshold !== 'number') {
      return { valid: false, error: 'warmth_threshold condition requires a numeric threshold' };
    }
  }

  if (type === 'no_touch_days') {
    if (typeof conditions.no_touch_days !== 'number') {
      return { valid: false, error: 'no_touch_days condition requires a numeric threshold' };
    }
  }

  // Validate at least one action is specified
  const hasAction = actions.webhook || actions.email || actions.push || actions.send_message;
  if (!hasAction) {
    return { valid: false, error: 'At least one action must be specified (webhook, email, push, send_message)' };
  }

  return { valid: true };
}

// POST /v1/automation-rules - Create new automation rule
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
    const { name, description, type, conditions, actions, enabled, segment_id } = body;

    // Validation
    if (!name || !type || !conditions || !actions) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, conditions, actions' },
        { status: 400 }
      );
    }

    // Validate rule structure
    const validation = validateRule({ type, conditions, actions });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
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

    // If segment_id is provided, verify it exists
    if (segment_id) {
      const { data: segment } = await supabase
        .from('segments')
        .select('id')
        .eq('id', segment_id)
        .eq('org_id', profile.org_id)
        .single();

      if (!segment) {
        return NextResponse.json(
          { error: 'Segment not found' },
          { status: 404 }
        );
      }
    }

    // Insert automation rule
    const { data: rule, error: insertError } = await supabase
      .from('automation_rules')
      .insert({
        org_id: profile.org_id,
        name,
        description: description || null,
        type,
        conditions,
        actions,
        enabled: enabled !== undefined ? enabled : true,
        segment_id: segment_id || null,
        created_by: user.id,
        trigger_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating automation rule:', insertError);
      return NextResponse.json(
        { error: 'Failed to create automation rule' },
        { status: 500 }
      );
    }

    return NextResponse.json(rule, { status: 201 });

  } catch (error) {
    console.error('Automation rules POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /v1/automation-rules - List all automation rules for the user's org
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
    const type = searchParams.get('type'); // Filter by type
    const enabled = searchParams.get('enabled'); // Filter by enabled status

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

    // Build query
    let query = supabase
      .from('automation_rules')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (enabled !== null && enabled !== undefined) {
      query = query.eq('enabled', enabled === 'true');
    }

    const { data: rules, error, count } = await query;

    if (error) {
      console.error('Error fetching automation rules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch automation rules' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rules: rules || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Automation rules GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
