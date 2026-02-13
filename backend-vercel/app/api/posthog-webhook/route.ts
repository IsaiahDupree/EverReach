/**
 * PostHog Webhook Handler
 * Receives events from PostHog and mirrors privacy-safe subset to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// Whitelist of properties that are safe to store (no PII)
const ALLOWED_PROPERTIES = new Set([
  // IDs & references
  'contact_id',
  'session_id',
  'feature_id',
  'bucket_id',
  'template_id',
  'message_id',
  'interaction_id',
  'voice_note_id',
  'reminder_id',
  'campaign_id',
  
  // Channels & methods
  'channel',
  'method',
  'source',
  'transport',
  'permission',
  
  // Goals & types
  'goal',
  'tone',
  'type',
  'request_type',
  'interaction_type',
  'notification_type',
  
  // Counts & metrics
  'duration_ms',
  'latency_ms',
  'file_size_kb',
  'ocr_char_count',
  'word_count',
  'token_count',
  'prompt_tokens',
  'completion_tokens',
  'votes_count',
  'request_count',
  'contact_count',
  'tags_count',
  'attachments_count',
  
  // Lengths (never content!)
  'title_length',
  'description_length',
  'query_length',
  'notes_length',
  'original_length',
  'edited_length',
  'length_delta',
  
  // Booleans
  'from_screenshot',
  'from_voice_note',
  'has_company',
  'has_photo',
  'has_notes',
  'has_followup',
  'had_context',
  'was_ai_generated',
  'was_edited',
  'success',
  'is_first_launch',
  'is_first_vote',
  'had_errors',
  'completed_on_time',
  
  // Scores & percentages
  'warmth_score',
  'from_score',
  'to_score',
  'delta',
  'confidence_score',
  'progress_percent',
  'momentum_7d',
  'momentum_30d',
  'kept_percentage',
  
  // Status & state
  'status',
  'from_status',
  'to_status',
  'plan',
  'variant',
  'platform',
  'device_model',
  'os_version',
  'app_version',
  'locale',
  'theme',
  
  // Screen & navigation
  'screen_name',
  'prev_screen',
  'entry_point',
  'cta_key',
]);

interface PostHogEvent {
  event: string;
  distinct_id: string;
  timestamp?: string;
  properties?: Record<string, any>;
}

interface PostHogPayload {
  batch?: PostHogEvent[];
  event?: string;
  distinct_id?: string;
  timestamp?: string;
  properties?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const secret = req.headers.get('x-posthog-secret');
    if (secret !== process.env.POSTHOG_WEBHOOK_SECRET) {
      console.error('[PostHog] Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: PostHogPayload = await req.json();
    
    // PostHog can send either a batch or single event
    const events: PostHogEvent[] = payload.batch || [
      {
        event: payload.event || '',
        distinct_id: payload.distinct_id || '',
        timestamp: payload.timestamp,
        properties: payload.properties,
      },
    ];

    console.log(`[PostHog] Processing ${events.length} events`);

    const rows = events
      .filter((e) => e.event && e.distinct_id) // Skip invalid events
      .map((e) => {
        const props = e.properties || {};
        
        // Filter properties to only allowed ones
        const safeProps: Record<string, any> = {};
        for (const [key, value] of Object.entries(props)) {
          if (ALLOWED_PROPERTIES.has(key)) {
            safeProps[key] = value;
          }
        }

        return {
          ts: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
          name: e.event,
          anon_user_id: String(e.distinct_id),
          session_id: props.session_id || null,
          user_id: null, // Will be backfilled later via anon_user_id mapping
          contact_id: props.contact_id || null,
          ingestion: 'posthog',
          props: safeProps,
        };
      });

    if (rows.length === 0) {
      console.log('[PostHog] No valid events to insert');
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    // Insert into Supabase
    const supabase = getServiceClient();
    const { error, count } = await supabase
      .from('analytics_events')
      .insert(rows);

    if (error) {
      console.error('[PostHog] Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Database insert failed' },
        { status: 500 }
      );
    }

    console.log(`[PostHog] Successfully inserted ${count || rows.length} events`);

    // Optionally: Process high-value domain events into typed tables
    await processDomainEvents(rows);

    return NextResponse.json({ 
      ok: true, 
      inserted: count || rows.length 
    });

  } catch (error: any) {
    console.error('[PostHog] Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Process specific high-value events into typed tables for easier querying
 */
async function processDomainEvents(events: any[]) {
  const supabase = getServiceClient();
  for (const event of events) {
    try {
      // Message generation events
      if (event.name === 'Message Generated') {
        await supabase.from('message_generation_events').insert({
          ts: event.ts,
          anon_user_id: event.anon_user_id,
          contact_id: event.props.contact_id,
          template_id: event.props.template_id,
          channel: event.props.channel,
          goal: event.props.goal,
          from_screenshot: event.props.from_screenshot || false,
          latency_ms: event.props.latency_ms,
          token_count: event.props.token_count,
          success: true,
        });
      }

      // Warmth score changes
      if (event.name === 'Warmth Score Changed') {
        await supabase.from('warmth_score_history').insert({
          occurred_at: event.ts,
          contact_id: event.props.contact_id,
          from_score: event.props.from_score,
          to_score: event.props.to_score,
          delta: event.props.delta,
          reason: event.props.trigger || 'system',
        });
      }

      // Feature flag exposures
      if (event.name === 'Feature Flag Evaluated') {
        await supabase.from('feature_flag_exposures').insert({
          ts: event.ts,
          anon_user_id: event.anon_user_id,
          flag_key: event.props.flag_key,
          variant: event.props.variant,
          is_enabled: event.props.is_enabled,
        });
      }

      // Experiment assignments
      if (event.name === 'Experiment Assigned') {
        await supabase.from('experiment_assignments').upsert({
          anon_user_id: event.anon_user_id,
          experiment_key: event.props.experiment_key,
          variant: event.props.variant,
          source: 'posthog',
          active: true,
        }, {
          onConflict: 'experiment_key,anon_user_id',
          ignoreDuplicates: false,
        });
      }
    } catch (error) {
      console.error(`[PostHog] Failed to process domain event ${event.name}:`, error);
      // Continue processing other events
    }
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'posthog-webhook',
    timestamp: new Date().toISOString(),
  });
}
