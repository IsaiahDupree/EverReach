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

// GET /v1/dev/webhooks/[id]/deliveries - Get webhook delivery logs
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
    const status = searchParams.get('status'); // filter by status

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

    // Verify webhook belongs to org
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('id, org_id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (webhookError || !webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Fetch deliveries with optional status filter
    let query = supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('webhook_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ['sent', 'failed', 'pending'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: deliveries, error: deliveriesError, count } = await query;

    if (deliveriesError) {
      console.error('Error fetching webhook deliveries:', deliveriesError);
      return NextResponse.json(
        { error: 'Failed to fetch deliveries' },
        { status: 500 }
      );
    }

    // Get stats
    const { data: stats } = await supabase
      .from('webhook_deliveries')
      .select('status')
      .eq('webhook_id', id);

    const statsSummary = {
      total: stats?.length || 0,
      sent: stats?.filter(d => d.status === 'sent').length || 0,
      failed: stats?.filter(d => d.status === 'failed').length || 0,
      pending: stats?.filter(d => d.status === 'pending').length || 0,
    };

    return NextResponse.json({
      deliveries: deliveries || [],
      total: count || 0,
      limit,
      offset,
      stats: statsSummary,
    });

  } catch (error) {
    console.error('Webhook deliveries GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
