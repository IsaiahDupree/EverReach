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

// POST /v1/dev/webhooks/[id]/redeliver/[deliveryId] - Retry failed webhook delivery
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; deliveryId: string }> }
) {
  try {
    const { id, deliveryId } = await params;
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

    // Verify webhook belongs to org
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

    // Fetch the delivery to redeliver
    const { data: delivery, error: deliveryError } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('webhook_id', id)
      .single();

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      );
    }

    // Check if delivery is eligible for redelivery (failed or pending only)
    if (delivery.status === 'sent') {
      return NextResponse.json(
        { error: 'Cannot redeliver a successful delivery' },
        { status: 400 }
      );
    }

    // Reconstruct the original payload
    // In production, you might want to store the original payload
    // For now, we'll create a redelivery attempt with the stored event data
    const redeliveryPayload = {
      id: delivery.event_id,
      type: delivery.event_type,
      occurred_at: new Date().toISOString(),
      org_id: profile.org_id,
      // Add more fields as needed from stored delivery data
      meta: {
        request_id: `req_redeliver_${crypto.randomBytes(8).toString('hex')}`,
        attempt: (delivery.attempt_number || 0) + 1,
        original_delivery_id: delivery.id,
        is_redelivery: true,
      },
    };

    const payloadString = JSON.stringify(redeliveryPayload);

    // Generate new signature
    const signature = generateWebhookSignature(payloadString, webhook.secret);

    // Attempt redelivery
    const startTime = Date.now();
    try {
      const webhookResponse = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Evr-Signature': signature,
          'User-Agent': 'EverReach-Webhooks/1.0 (redelivery)',
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      const duration = Date.now() - startTime;
      const responseText = await webhookResponse.text();

      // Create new delivery record for redelivery attempt
      const { data: newDelivery } = await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_id: webhook.id,
          event_id: delivery.event_id,
          event_type: delivery.event_type,
          status: webhookResponse.ok ? 'sent' : 'failed',
          http_status: webhookResponse.status,
          response_body: responseText.substring(0, 1000),
          attempt_number: (delivery.attempt_number || 0) + 1,
          sent_at: new Date().toISOString(),
          duration_ms: duration,
          error_message: webhookResponse.ok 
            ? null 
            : `HTTP ${webhookResponse.status}: ${responseText.substring(0, 200)}`,
        })
        .select()
        .single();

      // Update webhook stats if successful
      if (webhookResponse.ok) {
        await supabase
          .from('webhooks')
          .update({
            last_success_at: new Date().toISOString(),
            consecutive_failures: 0,
          })
          .eq('id', webhook.id);
      } else {
        await supabase
          .from('webhooks')
          .update({
            consecutive_failures: (webhook.consecutive_failures || 0) + 1,
          })
          .eq('id', webhook.id);
      }

      return NextResponse.json({
        success: webhookResponse.ok,
        status: webhookResponse.status,
        duration_ms: duration,
        attempt_number: (delivery.attempt_number || 0) + 1,
        delivery: newDelivery,
        response: responseText.substring(0, 500),
        message: webhookResponse.ok 
          ? 'Webhook redelivered successfully' 
          : `Redelivery failed with status ${webhookResponse.status}`,
      });

    } catch (fetchError: any) {
      const duration = Date.now() - startTime;

      // Log failed redelivery
      await supabase.from('webhook_deliveries').insert({
        webhook_id: webhook.id,
        event_id: delivery.event_id,
        event_type: delivery.event_type,
        status: 'failed',
        http_status: 0,
        attempt_number: (delivery.attempt_number || 0) + 1,
        duration_ms: duration,
        error_message: fetchError.message,
      });

      // Update consecutive failures
      await supabase
        .from('webhooks')
        .update({
          consecutive_failures: (webhook.consecutive_failures || 0) + 1,
        })
        .eq('id', webhook.id);

      return NextResponse.json({
        success: false,
        error: fetchError.message,
        duration_ms: duration,
        attempt_number: (delivery.attempt_number || 0) + 1,
        message: 'Failed to redeliver webhook',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Webhook redelivery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
