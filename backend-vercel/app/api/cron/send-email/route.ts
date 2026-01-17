/**
 * Email Worker Cron Job
 * 
 * Processes queued email deliveries and sends via Resend.
 * Respects consent, tracks status, handles errors with retry logic.
 * 
 * Trigger: Cron every 5 minutes
 * GET /api/cron/send-email?secret=CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'EverReach <hello@everreach.app>';

function buildDeepLink(path: string, params: Record<string, any>): string {
  const base = process.env.DEEP_LINK_BASE || 'https://app.everreach.app';
  const url = new URL(path, base);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  
  return url.toString();
}

async function sendEmail(delivery: any, supabase: ReturnType<typeof getSupabase>): Promise<void> {
  console.log(`[send-email] Processing delivery ${delivery.id}`);
  
  try {
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, consent_email, full_name')
      .eq('user_id', delivery.user_id)
      .single();
    
    if (profileError || !profile) {
      throw new Error(`Profile not found: ${profileError?.message}`);
    }
    
    // Check consent
    if (!profile.consent_email || !profile.email) {
      console.log(`[send-email] No consent or email for ${delivery.user_id}`);
      await supabase
        .from('deliveries')
        .update({ 
          status: 'suppressed',
          error: 'No consent or missing email'
        })
        .eq('id', delivery.id);
      return;
    }
    
    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('subject, body_md, preheader, deep_link_path, deep_link_params')
      .eq('campaign_id', delivery.campaign_id)
      .eq('variant_key', delivery.variant_key)
      .single();
    
    if (templateError || !template) {
      throw new Error(`Template not found: ${templateError?.message}`);
    }
    
    // Build deep link with tracking params
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
    
    // Replace variables in template
    let bodyHtml = template.body_md; // Simple markdown (can add parser later)
    bodyHtml = bodyHtml
      .replace(/\{name\}/g, profile.full_name || 'there')
      .replace(/\{deep_link\}/g, deepLink || '#')
      .replace(/\{reason\}/g, delivery.reason || '');
    
    // Send via Resend
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: profile.email,
      subject: template.subject,
      html: bodyHtml,
      tags: [
        { name: 'campaign_id', value: delivery.campaign_id },
        { name: 'variant', value: delivery.variant_key },
        { name: 'reason', value: delivery.reason || 'unknown' },
      ],
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    // Update delivery status
    await supabase
      .from('deliveries')
      .update({
        status: 'sent',
        external_id: response.data?.id,
        sent_at: new Date().toISOString(),
      })
      .eq('id', delivery.id);
    
    console.log(`[send-email] Sent ${delivery.id} via ${response.data?.id}`);
    
  } catch (error: any) {
    console.error(`[send-email] Error sending ${delivery.id}:`, error);
    
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
    
    console.log('[send-email] Starting email worker');
    
    // Fetch queued emails (batch of 50)
    const { data: deliveries, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('status', 'queued')
      .eq('channel', 'email')
      .lt('retry_count', 3)
      .order('queued_at', { ascending: true })
      .limit(50);
    
    if (error) {
      throw new Error(`Query error: ${error.message}`);
    }
    
    if (!deliveries || deliveries.length === 0) {
      console.log('[send-email] No queued emails');
      return NextResponse.json({ success: true, sent: 0 });
    }
    
    console.log(`[send-email] Processing ${deliveries.length} emails`);
    
    // Process each delivery
    for (const delivery of deliveries) {
      await sendEmail(delivery, supabase);
    }
    
    console.log(`[send-email] Done. Processed ${deliveries.length} emails`);
    
    return NextResponse.json({
      success: true,
      processed: deliveries.length
    });
    
  } catch (error: any) {
    console.error('[send-email] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
