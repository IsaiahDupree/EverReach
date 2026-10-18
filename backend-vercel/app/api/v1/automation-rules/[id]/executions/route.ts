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

// GET /v1/automation-rules/[id]/executions - Get execution history
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
    const status = searchParams.get('status'); // Filter by status

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

    // Verify automation rule belongs to org
    const { data: rule, error: ruleError } = await supabase
      .from('automation_rules')
      .select('id, name, org_id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (ruleError || !rule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    // Fetch execution history from rule_executions table (if exists)
    // For now, we'll return mock data structure showing what would be tracked
    // In production, this would query a rule_executions table
    
    // Check if rule_executions table exists, if not return structured mock
    const { data: executions, error: executionsError, count } = await supabase
      .from('rule_executions')
      .select('*', { count: 'exact' })
      .eq('rule_id', id)
      .order('executed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // If table doesn't exist, return empty array with structure
    if (executionsError) {
      console.log('rule_executions table not found, returning empty array');
      return NextResponse.json({
        rule_id: id,
        rule_name: rule.name,
        executions: [],
        total: 0,
        limit,
        offset,
        message: 'Execution tracking not yet implemented. Create rule_executions table to track.',
      });
    }

    // Get stats
    const stats = {
      total: count || 0,
      success: executions?.filter((e: any) => e.status === 'success').length || 0,
      failed: executions?.filter((e: any) => e.status === 'failed').length || 0,
      pending: executions?.filter((e: any) => e.status === 'pending').length || 0,
    };

    return NextResponse.json({
      rule_id: id,
      rule_name: rule.name,
      executions: executions || [],
      total: count || 0,
      limit,
      offset,
      stats,
    });

  } catch (error) {
    console.error('Automation rule executions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
