/**
 * SMS Worker Cron Job
 * 
 * Processes queued SMS deliveries and sends via Twilio.
 * Respects consent, tracks status, handles errors with retry logic.
 * 
 * Trigger: Cron every 5 minutes
 * GET /api/cron/send-sms?secret=CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

const twilioClient = twilio(
  process.env.TWILIO_API_KEY_SID,
  process.env.TWILIO_API_KEY_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID }
);

const FROM_NUMBER = process.env.TWILIO_FROM || '';

function buildDeepLink(path: string, params: Record<string, any>): string {
  const base = process.env.DEEP_LINK_BASE || 'https://app.everreach.app';
  const url = new URL(path, base);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  
  return url.toString();
}

async function sendSMS(delivery: any, supabase: ReturnType<typeof getSupabase>): Promise<void> {
  console.log(`[send-sms] Processing delivery ${delivery.id}`);
  
  try {
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_e164, consent_sms, full_name')
      .eq('user_id', delivery.user_id)
      .single();
    
    if (profileError || !profile) {
      throw new Error(`Profile not found: ${profileError?.message}`);
    }
    
    // Check consent and phone
    if (!profile.consent_sms || !profile.phone_e164) {
      console.log(`[send-sms] No consent or phone for ${delivery.user_id}`);
      await supabase
        .from('deliveries')
        .update({ 
          status: 'suppressed',
          error: 'No consent or missing phone'
        })
        .eq('id', delivery.id);
      return;
    }
    
    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('sms_text, deep_link_path, deep_link_params')
      .eq('campaign_id', delivery.campaign_id)
      .eq('variant_key', delivery.variant_key)
      .single();
    
    if (templateError || !template) {
      throw new Error(`Template not found: ${templateError?.message}`);
    }
    
    // Build deep link
    let deepLink = null;
    if (template.deep_link_path) {
      const params = {
        ...(template.deep_link_params || {}),
        reason: delivery.reason,
        variant: delivery.variant_key,
        delivery_id: delivery.id,
      };
      deepLink = buildDeepLink(template.deep_link_path, params);
    }
    
    // Replace variables in SMS text
    let smsBody = template.sms_text
      .replace(/\{name\}/g, profile.full_name || '')
      .replace(/\{deep_link\}/g, deepLink || '')
      .replace(/\{reason\}/g, delivery.reason || '');
    
    // Add unsubscribe instruction (required for compliance)
    smsBody += '\n\nReply STOP to unsubscribe';
    
    // Send via Twilio
    const response = await twilioClient.messages.create({
      from: FROM_NUMBER,
      to: profile.phone_e164,
      body: smsBody,
    });
    
    if (response.errorCode) {
      throw new Error(`${response.errorCode}: ${response.errorMessage}`);
    }
    
    // Update delivery status
    await supabase
      .from('deliveries')
      .update({
        status: 'sent',
        external_id: response.sid,
        sent_at: new Date().toISOString(),
      })
      .eq('id', delivery.id);
    
    console.log(`[send-sms] Sent ${delivery.id} via ${response.sid}`);
    
  } catch (error: any) {
    console.error(`[send-sms] Error sending ${delivery.id}:`, error);
    
    // Update with error and retry count
    await supabase
      .from('deliveries')
      .update({
        status: delivery.retry_count >= 3 ? 'failed' : 'queued',
        error: error.message,
        retry_count: (delivery.retry_count || 0) + 1,
      })
      .eq('id', delivery.id);
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    // Verify cron secret
    const secret = req.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[send-sms] Starting SMS worker');
    
    // Fetch queued SMS (batch of 50)
    const { data: deliveries, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('status', 'queued')
      .eq('channel', 'sms')
      .lt('retry_count', 3)
      .order('queued_at', { ascending: true })
      .limit(50);
    
    if (error) {
      throw new Error(`Query error: ${error.message}`);
    }
    
    if (!deliveries || deliveries.length === 0) {
      console.log('[send-sms] No queued SMS');
      return NextResponse.json({ success: true, sent: 0 });
    }
    
    console.log(`[send-sms] Processing ${deliveries.length} SMS`);
    
    // Process each delivery
    for (const delivery of deliveries) {
      await sendSMS(delivery, supabase);
    }
    
    console.log(`[send-sms] Done. Processed ${deliveries.length} SMS`);
    
    return NextResponse.json({
      success: true,
      processed: deliveries.length
    });
    
  } catch (error: any) {
    console.error('[send-sms] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
