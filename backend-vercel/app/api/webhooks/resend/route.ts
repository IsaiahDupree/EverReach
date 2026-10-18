/**
 * Resend Webhook Handler
 * 
 * Receives email delivery events from Resend:
 * - email.sent
 * - email.delivered
 * - email.delivery_delayed
 * - email.complained
 * - email.bounced
 * - email.opened
 * - email.clicked
 * 
 * POST /api/webhooks/resend - Process webhook events
 * GET /api/webhooks/resend - Health check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import crypto from 'crypto';

interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 
        'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Additional fields for specific event types
    opened_at?: string;
    clicked_at?: string;
    click?: {
      link: string;
      timestamp: string;
    };
    bounce?: {
      type: 'hard' | 'soft';
      message: string;
    };
  };
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) {
    console.error('[resend-webhook] No signature provided');
    return false;
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[resend-webhook] No RESEND_WEBHOOK_SECRET configured — rejecting (fail-closed)');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[resend-webhook] Signature verification failed:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const signature = req.headers.get('resend-signature');
    const body = await req.text();
    
    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      console.error('[resend-webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event: ResendWebhookEvent = JSON.parse(body);
    
    console.log('[resend-webhook] Received event:', {
      type: event.type,
      email_id: event.data.email_id,
      to: event.data.to
    });

    // Check for duplicate webhook (idempotency)
    const webhookId = `resend_${event.data.email_id}_${event.type}_${event.created_at}`;
    const { data: existing } = await supabase
      .from('webhook_log')
      .select('id')
      .eq('webhook_id', webhookId)
      .single();

    if (existing) {
      console.log('[resend-webhook] Duplicate webhook, skipping');
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Log webhook event
    await supabase.from('webhook_log').insert({
      webhook_id: webhookId,
      provider: 'resend',
      event_type: event.type,
      payload: event,
      processed_at: new Date().toISOString()
    });

    // Update email_send table based on event type
    const emailId = event.data.email_id;
    
    switch (event.type) {
      case 'email.sent':
        await supabase
          .from('email_send')
          .update({
            delivery_status: 'sent',
            sent_at: event.created_at,
            updated_at: new Date().toISOString()
          })
          .eq('external_id', emailId);
        break;

      case 'email.delivered':
        await supabase
          .from('email_send')
          .update({
            delivery_status: 'delivered',
            delivered_at: event.created_at,
            updated_at: new Date().toISOString()
          })
          .eq('external_id', emailId);
        break;

      case 'email.bounced':
        await supabase
          .from('email_send')
          .update({
            delivery_status: 'bounced',
            bounce_reason: event.data.bounce?.message || 'Unknown',
            bounce_type: event.data.bounce?.type || 'hard',
            updated_at: new Date().toISOString()
          })
          .eq('external_id', emailId);
        break;

      case 'email.complained':
        await supabase
          .from('email_send')
          .update({
            delivery_status: 'complained',
            complaint_at: event.created_at,
            updated_at: new Date().toISOString()
          })
          .eq('external_id', emailId);
        break;

      case 'email.opened':
        // Increment open count
        const { data: emailRecord } = await supabase
          .from('email_send')
          .select('open_count')
          .eq('external_id', emailId)
          .single();
        
        await supabase
          .from('email_send')
          .update({
            opened_at: event.data.opened_at || event.created_at,
            open_count: (emailRecord?.open_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('external_id', emailId);
        break;

      case 'email.clicked':
        // Increment click count
        const { data: emailClickRecord } = await supabase
          .from('email_send')
          .select('click_count')
          .eq('external_id', emailId)
          .single();
        
        await supabase
          .from('email_send')
          .update({
            clicked_at: event.data.clicked_at || event.created_at,
            click_count: (emailClickRecord?.click_count || 0) + 1,
            last_clicked_link: event.data.click?.link,
            updated_at: new Date().toISOString()
          })
          .eq('external_id', emailId);
        break;

      case 'email.delivery_delayed':
        await supabase
          .from('email_send')
          .update({
            delivery_status: 'delayed',
            updated_at: new Date().toISOString()
          })
          .eq('external_id', emailId);
        break;
    }

    console.log('[resend-webhook] Event processed successfully');

    return NextResponse.json({
      received: true,
      event_type: event.type,
      email_id: emailId
    });

  } catch (error) {
    console.error('[resend-webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'resend-webhook',
    timestamp: new Date().toISOString()
  });
}
