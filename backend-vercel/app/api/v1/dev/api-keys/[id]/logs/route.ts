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

// GET /v1/dev/api-keys/[id]/logs - Get API key usage logs
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

    // Verify API key belongs to org
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('id, org_id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (keyError || !apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Fetch audit logs for this API key
    const { data: logs, error: logsError, count } = await supabase
      .from('api_audit_logs')
      .select('*', { count: 'exact' })
      .eq('api_key_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logsError) {
      console.error('Error fetching API key logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('API Key Logs GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
