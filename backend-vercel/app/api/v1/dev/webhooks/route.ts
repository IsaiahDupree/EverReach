import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import crypto from 'crypto';

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

// Helper to generate webhook secret
function generateWebhookSecret(): string {
  return 'whsec_' + crypto.randomBytes(32).toString('hex');
}

// POST /v1/dev/webhooks - Create new webhook
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
    const { url, events, description, filters } = body;

    // Validation
    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: url, events (array)' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = [
      'contact.warmth.changed',
      'contact.warmth.below_threshold',
      'contact.no_touch_days.crossed',
      'interaction.created',
      'contact.stage.changed',
      'outbox.requires_approval',
      'outbox.sent',
    ];

    for (const event of events) {
      if (!validEvents.includes(event)) {
        return NextResponse.json(
          { error: `Invalid event: ${event}. Valid events: ${validEvents.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Generate webhook secret
    const secret = generateWebhookSecret();

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

    // Insert webhook
    const { data: webhook, error: insertError } = await supabase
      .from('webhooks')
      .insert({
        org_id: profile.org_id,
        url,
        secret, // Store in plain text (in production, encrypt this)
        events,
        description: description || null,
        filters: filters || null,
        enabled: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating webhook:', insertError);
      return NextResponse.json(
        { error: 'Failed to create webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json(webhook, { status: 201 });

  } catch (error) {
    console.error('Webhooks POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /v1/dev/webhooks - List all webhooks for the user's org
export async function GET(req: NextRequest) {
  try {
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

    // Fetch webhooks
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      webhooks: webhooks || [],
      total: webhooks?.length || 0,
    });

  } catch (error) {
    console.error('Webhooks GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
