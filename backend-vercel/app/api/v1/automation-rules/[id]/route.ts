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

// GET /v1/automation-rules/[id] - Get single automation rule
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

    // Fetch automation rule with org check
    const { data: rule, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !rule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);

  } catch (error) {
    console.error('Automation rule GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /v1/automation-rules/[id] - Update automation rule
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
    const { name, description, type, conditions, actions, enabled, segment_id } = body;

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

    // Verify automation rule exists and belongs to org
    const { data: existingRule, error: fetchError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (fetchError || !existingRule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (conditions !== undefined) updates.conditions = conditions;
    if (actions !== undefined) updates.actions = actions;
    if (enabled !== undefined) updates.enabled = enabled;
    if (segment_id !== undefined) updates.segment_id = segment_id;

    // Validate if type/conditions/actions changed
    if (type !== undefined || conditions !== undefined || actions !== undefined) {
      const finalType = type || existingRule.type;
      const finalConditions = conditions || existingRule.conditions;
      const finalActions = actions || existingRule.actions;

      // Basic validation
      if (finalType === 'warmth_threshold' && typeof finalConditions.warmth_threshold !== 'number') {
        return NextResponse.json(
          { error: 'warmth_threshold condition requires a numeric threshold' },
          { status: 400 }
        );
      }

      if (finalType === 'no_touch_days' && typeof finalConditions.no_touch_days !== 'number') {
        return NextResponse.json(
          { error: 'no_touch_days condition requires a numeric threshold' },
          { status: 400 }
        );
      }
    }

    // Update automation rule
    const { data: updatedRule, error: updateError } = await supabase
      .from('automation_rules')
      .update(updates)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating automation rule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update automation rule' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedRule);

  } catch (error) {
    console.error('Automation rule PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /v1/automation-rules/[id] - Delete automation rule
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

    // Delete automation rule
    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', id)
      .eq('org_id', profile.org_id);

    if (error) {
      console.error('Error deleting automation rule:', error);
      return NextResponse.json(
        { error: 'Failed to delete automation rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Automation rule DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
