/**
 * Twilio Webhook Handler
 * 
 * Receives SMS events from Twilio:
 * - Inbound SMS messages (replies)
 * - Delivery status updates (sent, delivered, failed)
 * - STOP/UNSUBSCRIBE keywords
 * 
 * POST /api/webhooks/twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { okXml } from '@/lib/cors';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface TwilioWebhookParams {
  MessageSid: string;
  SmsSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MessageStatus?: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  ErrorCode?: string;
  ErrorMessage?: string;
  // For inbound messages
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
}

function verifySignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  if (!signature) {
    console.error('[twilio-webhook] No signature provided');
    return false;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn('[twilio-webhook] No TWILIO_AUTH_TOKEN configured');
    return true; // Allow in development
  }

  try {
    // Twilio signature verification
    // Sort params and concatenate with URL
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);

    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    return expectedSignature === signature;
  } catch (error) {
    console.error('[twilio-webhook] Signature verification failed:', error);
    return false;
  }
}

function isStopKeyword(message: string): boolean {
  const stopKeywords = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
  const normalized = message.trim().toUpperCase();
  return stopKeywords.includes(normalized);
}

function isStartKeyword(message: string): boolean {
  const startKeywords = ['START', 'YES', 'UNSTOP'];
  const normalized = message.trim().toUpperCase();
  return startKeywords.includes(normalized);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const signature = req.headers.get('x-twilio-signature');
    const url = req.url;
    
    // Parse form data (Twilio sends application/x-www-form-urlencoded)
    const formData = await req.formData();
    const params: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const twilioParams = params as unknown as TwilioWebhookParams;
    
    // Verify webhook signature
    if (!verifySignature(url, params, signature)) {
      console.error('[twilio-webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[twilio-webhook] Received event:', {
      MessageSid: twilioParams.MessageSid,
      From: twilioParams.From,
      To: twilioParams.To,
      Status: twilioParams.MessageStatus,
      Body: twilioParams.Body?.substring(0, 50)
    });

    // Check for duplicate webhook
    const webhookId = `twilio_${twilioParams.MessageSid}`;
    const { data: existing } = await supabase
      .from('webhook_log')
      .select('id')
      .eq('webhook_id', webhookId)
      .single();

    if (existing) {
      console.log('[twilio-webhook] Duplicate webhook, skipping');
      return okXml('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', req);
    }

    // Log webhook event
    await supabase.from('webhook_log').insert({
      webhook_id: webhookId,
      provider: 'twilio',
      event_type: twilioParams.MessageStatus || 'message.received',
      payload: twilioParams,
      processed_at: new Date().toISOString()
    });

    // Handle different event types
    if (twilioParams.MessageStatus) {
      // Status callback (outbound message status)
      await handleStatusUpdate(supabase, twilioParams);
    } else {
      // Inbound message
      await handleInboundMessage(supabase, twilioParams);
    }

    // Return TwiML response (required by Twilio)
    return okXml('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', req);

  } catch (error) {
    console.error('[twilio-webhook] Error processing webhook:', error);
    
    // Still return 200 to prevent Twilio retries on our errors
    return okXml('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', req);
  }
}

async function handleStatusUpdate(supabase: any, params: TwilioWebhookParams) {
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = params;

  console.log('[twilio-webhook] Updating message status:', { MessageSid, MessageStatus });

  await supabase
    .from('sms_message')
    .update({
      delivery_status: MessageStatus,
      error_code: ErrorCode,
      error_message: ErrorMessage,
      delivered_at: MessageStatus === 'delivered' ? new Date().toISOString() : undefined,
      failed_at: ['failed', 'undelivered'].includes(MessageStatus || '') ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('external_id', MessageSid);
}

async function handleInboundMessage(supabase: any, params: TwilioWebhookParams) {
  const { MessageSid, From, To, Body, FromCity, FromState, FromCountry } = params;

  console.log('[twilio-webhook] Processing inbound message:', { From, Body: Body?.substring(0, 50) });

  // Find user by phone number
  const { data: contact } = await supabase
    .from('contact')
    .select('id, user_id')
    .eq('phone', From)
    .single();

  // Check for STOP/START keywords
  if (isStopKeyword(Body)) {
    console.log('[twilio-webhook] STOP keyword detected, unsubscribing:', From);
    
    await supabase
      .from('contact')
      .update({
        sms_opt_in: false,
        sms_opt_out_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('phone', From);

    return;
  }

  if (isStartKeyword(Body)) {
    console.log('[twilio-webhook] START keyword detected, resubscribing:', From);
    
    await supabase
      .from('contact')
      .update({
        sms_opt_in: true,
        sms_opt_out_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('phone', From);

    return;
  }

  // Store inbound message
  await supabase.from('sms_message').insert({
    external_id: MessageSid,
    direction: 'inbound',
    from_phone: From,
    to_phone: To,
    body: Body,
    user_id: contact?.user_id,
    contact_id: contact?.id,
    metadata: {
      city: FromCity,
      state: FromState,
      country: FromCountry
    },
    received_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  // Create interaction record for CRM
  if (contact?.id) {
    await supabase.from('interaction').insert({
      contact_id: contact.id,
      type: 'sms_received',
      notes: Body,
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
  }

  console.log('[twilio-webhook] Inbound message stored successfully');
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'twilio-webhook',
    timestamp: new Date().toISOString()
  });
}
