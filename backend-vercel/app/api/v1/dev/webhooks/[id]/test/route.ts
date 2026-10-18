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

// Helper to generate webhook signature
function generateWebhookSignature(payload: string, secret: string): string {
  const timestamp = Date.now();
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

// POST /v1/dev/webhooks/[id]/test - Send test webhook event
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

    const body = await req.json();
    const { contact_id } = body;

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

    // Fetch webhook with org check
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (webhookError || !webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Fetch a sample contact (use provided or first available)
    let contactData = null;
    if (contact_id) {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contact_id)
        .eq('org_id', profile.org_id)
        .single();
      contactData = data;
    } else {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('org_id', profile.org_id)
        .limit(1)
        .single();
      contactData = data;
    }

    if (!contactData) {
      return NextResponse.json(
        { error: 'No contacts found for testing. Create a contact first.' },
        { status: 404 }
      );
    }

    // Fetch recent interactions for context
    const { data: interactions } = await supabase
      .from('interactions')
      .select('id, channel, direction, summary, sentiment, occurred_at')
      .eq('contact_id', contactData.id)
      .order('occurred_at', { ascending: false })
      .limit(5);

    // Build test payload (simulating contact.warmth.below_threshold event)
    const testPayload = {
      id: `evt_test_${crypto.randomBytes(8).toString('hex')}`,
      type: 'contact.warmth.below_threshold',
      occurred_at: new Date().toISOString(),
      org_id: profile.org_id,
      contact_id: contactData.id,
      trigger: {
        metric: 'warmth_score',
        previous_score: 57,
        current_score: contactData.warmth_score || 38,
        previous_band: 'cooling',
        current_band: contactData.warmth_band || 'cold',
        days_since_last_touch: contactData.last_touch_days_ago || 0,
        threshold: 40,
      },
      context_bundle: {
        contact: {
          id: contactData.id,
          name: contactData.name,
          emails: contactData.emails || [],
          phones: contactData.phones || [],
          tags: contactData.tags || [],
          warmth_score: contactData.warmth_score || 0,
          warmth_band: contactData.warmth_band || 'unknown',
          last_touch_at: contactData.last_touch_at,
          custom_fields: contactData.custom || {},
        },
        pipeline: {
          id: contactData.pipeline_id,
          stage_id: contactData.stage_id,
          stage_name: 'Test Stage',
        },
        interactions: interactions || [],
        prompt_skeleton: `Contact: ${contactData.name}\nWarmth: ${contactData.warmth_score || 0}/100 (${contactData.warmth_band || 'unknown'})\nLast contact: ${contactData.last_touch_days_ago || 0}d ago\nTags: ${(contactData.tags || []).join(', ')}`,
        brand_rules: {
          tone: 'warm, concise',
          do: ['be helpful', 'be responsive'],
          dont: ['overpromise', 'be pushy'],
        },
      },
      links: {
        contact_url: `https://everreach.app/contacts/${contactData.id}?from=webhook&event=test`,
        context_bundle_url: `https://ever-reach-be.vercel.app/api/v1/contacts/${contactData.id}/context-bundle?interactions=10`,
      },
      meta: {
        request_id: `req_test_${crypto.randomBytes(8).toString('hex')}`,
        attempt: 1,
        is_test: true,
      },
    };

    const payloadString = JSON.stringify(testPayload);

    // Generate signature
    const signature = generateWebhookSignature(payloadString, webhook.secret);

    // Send test webhook
    try {
      const webhookResponse = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Evr-Signature': signature,
          'User-Agent': 'EverReach-Webhooks/1.0 (test)',
        },
        body: payloadString,
      });

      const responseText = await webhookResponse.text();

      // Log the test delivery
      await supabase.from('webhook_deliveries').insert({
        webhook_id: webhook.id,
        event_id: testPayload.id,
        event_type: testPayload.type,
        status: webhookResponse.ok ? 'sent' : 'failed',
        http_status: webhookResponse.status,
        response_body: responseText.substring(0, 1000), // Truncate
        attempt_number: 1,
        sent_at: new Date().toISOString(),
        duration_ms: 0, // Would need to track actual duration
        error_message: webhookResponse.ok ? null : `HTTP ${webhookResponse.status}: ${responseText.substring(0, 200)}`,
      });

      return NextResponse.json({
        success: webhookResponse.ok,
        status: webhookResponse.status,
        payload: testPayload,
        signature,
        response: responseText.substring(0, 500),
        message: webhookResponse.ok 
          ? 'Test webhook sent successfully' 
          : `Test webhook failed with status ${webhookResponse.status}`,
      });

    } catch (fetchError: any) {
      // Log failed delivery
      await supabase.from('webhook_deliveries').insert({
        webhook_id: webhook.id,
        event_id: testPayload.id,
        event_type: testPayload.type,
        status: 'failed',
        http_status: 0,
        attempt_number: 1,
        error_message: fetchError.message,
      });

      return NextResponse.json({
        success: false,
        payload: testPayload,
        signature,
        error: fetchError.message,
        message: 'Failed to deliver test webhook',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
