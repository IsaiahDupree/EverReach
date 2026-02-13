/**
 * PostHog → Supabase Event Mirroring Webhook
 * 
 * Receives events from PostHog and mirrors them to Supabase for:
 * - Product analytics joins with CRM data
 * - ML feature engineering
 * - Custom dashboards
 * 
 * Property whitelist enforces privacy (no PII)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const POSTHOG_WEBHOOK_SECRET = process.env.POSTHOG_WEBHOOK_SECRET!;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Property whitelist (60+ allowed properties, no PII)
const ALLOWED_PROPERTIES = new Set([
  // App/Device
  'platform', 'version', 'build', 'locale', 'tz', 'device_model', 'os_version',
  // Privacy/Consent
  'consent_analytics', 'consent_marketing', 'att_status',
  // Navigation
  'screen', 'prev_screen', 'source', 'referrer',
  // Actions (metadata only, no content)
  'contact_id', 'template_id', 'goal', 'channel', 'plan_shown', 'plan',
  'price_cents', 'term', 'reason', 'method', 'network', 'campaign_id', 'creative_id',
  // Counts/Scores (derived metrics)
  'count', 'score', 'warmth_score', 'warmth_band', 'char_count', 'word_count',
  'imported_count', 'deduped_count', 'tags_count', 'fields_filled',
  // Booleans (safe flags)
  'has_email', 'has_phone', 'has_company', 'had_personalization', 'ai_generated',
  'is_vip', 'enabled', 'retriable', 'policy_send',
  // Timing
  'ms', 'frame_ms', 'duration_ms', 'time_viewed_sec', 'due_in_days',
  // Experiments
  'experiment', 'variant', 'flag', 'surface',
  // Context
  'context', 'topic', 'rank', 'item_type', 'item_id', 'cta', 'action',
  'launch_type', 'error_code', 'endpoint', 'local_hour',
  // UTM params
  'utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content',
  // Simulation
  'is_simulated', 'persona_id', 'scenario_id', 'weight'
]);

interface PostHogEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  distinct_id: string;
  uuid: string;
}

interface PostHogWebhookPayload {
  hook: {
    id: string;
    event: string;
    target: string;
  };
  data: PostHogEvent;
}

/**
 * Verify webhook signature from PostHog
 */
function verifySignature(body: string, signature: string): boolean {
  if (!POSTHOG_WEBHOOK_SECRET) {
    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
    if (isDev) {
      console.warn('[PostHog Webhook] Secret not set — allowing in dev/preview mode');
      return true;
    }
    console.error('[PostHog Webhook] POSTHOG_WEBHOOK_SECRET not set — rejecting in production');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', POSTHOG_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Filter properties to whitelist (remove PII)
 */
function filterProperties(props: Record<string, any>): Record<string, any> {
  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    if (ALLOWED_PROPERTIES.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Hash user ID for privacy (SHA-256)
 */
function hashUserId(userId: string): string {
  return crypto
    .createHash('sha256')
    .update(userId)
    .digest('hex');
}

/**
 * Extract experiment assignments from properties
 */
function extractExperiments(props: Record<string, any>): Record<string, string> {
  const experiments: Record<string, string> = {};

  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('exp_') || key.startsWith('$feature/')) {
      const expName = key.replace('exp_', '').replace('$feature/', '');
      experiments[expName] = String(value);
    }
  }

  return experiments;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.text();
    const signature = req.headers.get('x-posthog-signature') || '';

    // Verify signature
    if (!verifySignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload: PostHogWebhookPayload = JSON.parse(body);
    const event = payload.data;

    // Extract core fields
    const eventName = event.event;
    const eventTime = new Date(event.timestamp);
    const distinctId = event.distinct_id;
    const eventId = event.uuid;

    // Hash user ID for privacy
    const userIdHash = hashUserId(distinctId);

    // Filter properties (whitelist only)
    const filteredProps = filterProperties(event.properties);

    // Extract experiment assignments
    const experiments = extractExperiments(event.properties);

    // Prepare event for Supabase
    const supabaseEvent = {
      event_id: eventId,
      event_name: eventName,
      event_time: eventTime.toISOString(),
      ingest_time: new Date().toISOString(),
      user_id_hash: userIdHash,
      anon_id: distinctId, // Keep anon_id for identity stitching
      properties: filteredProps,
      experiment_assignments: experiments,
      source: 'posthog_webhook'
    };

    // Insert into analytics_events table
    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert(supabaseEvent);

    if (insertError) {
      console.error('Failed to insert event:', insertError);
      return NextResponse.json(
        { error: 'Database insert failed', details: insertError.message },
        { status: 500 }
      );
    }

    // Also insert into user_event table for marketing intelligence
    if (eventName !== '$pageview' && eventName !== '$autocapture') {
      const { error: marketingError } = await supabase
        .from('user_event')
        .insert({
          user_id: distinctId, // Will be resolved to actual user_id via identity mapping
          etype: eventName,
          occurred_at: eventTime.toISOString(),
          properties: filteredProps,
          campaign_id: filteredProps.campaign_id || null,
          creative_id: filteredProps.creative_id || null,
          source: filteredProps.source || null
        });

      if (marketingError) {
        console.warn('Failed to insert marketing event:', marketingError);
        // Don't fail the whole request
      }
    }

    console.log(`✅ Event mirrored: ${eventName} for user ${userIdHash.substring(0, 8)}...`);

    return NextResponse.json({ 
      success: true, 
      event_id: eventId,
      event_name: eventName 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'posthog-events-webhook',
    timestamp: new Date().toISOString(),
    whitelist_size: ALLOWED_PROPERTIES.size
  });
}
