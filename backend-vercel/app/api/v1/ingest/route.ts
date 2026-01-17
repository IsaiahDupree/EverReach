import { NextRequest, NextResponse } from 'next/server';
import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * POST /v1/ingest
 * 
 * Event collector endpoint: Receives events from clients, stores in Supabase,
 * mirrors to PostHog, and forwards to Marketing Intelligence webhooks.
 * 
 * Security:
 * - Requires authentication
 * - Rate limited (600 events/min per user)
 * - Scrubs PII from props before storage
 * 
 * Idempotency:
 * - Prompts/responses upserted by ID to avoid duplicates
 */
export async function POST(req: NextRequest){
  // Authentication optional for pre-auth events (signup_started, etc.)
  const user = await getUser(req);
  
  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON', req);
  }

  const { name, props } = body;
  
  if (!name || typeof name !== 'string') {
    return badRequest('event name required', req);
  }

  if (!props || typeof props !== 'object') {
    return badRequest('event props required', req);
  }

  // Rate limiting (if authenticated)
  if (user) {
    const rl = checkRateLimit(`ingest:${user.id}`, 600, 60_000); // 600/min
    if (!rl.allowed) {
      return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);
    }
  }

  const supabase = getClientOrThrow(req);
  
  // Add user_id if authenticated
  const eventProps = { ...props };
  if (user && !eventProps.user_id) {
    eventProps.user_id = user.id;
  }

  // Scrub PII (remove email, phone if accidentally included)
  const scrubbedProps = scrubPII(eventProps);

  try {
    // 1) Write raw event to app_events
    const { error: eventError } = await supabase
      .from('app_events')
      .insert({
        event_name: name,
        user_id: scrubbedProps.user_id || null,
        anonymous_id: scrubbedProps.session_id || null,
        occurred_at: new Date().toISOString(),
        properties: scrubbedProps,
        context: {
          platform: scrubbedProps.platform || 'unknown',
          app_build: scrubbedProps.app_build || 'unknown',
          device_model: scrubbedProps.device_model || 'unknown',
        },
      });

    if (eventError) {
      console.error('[Ingest] Event insert error:', eventError);
      return serverError(`Failed to store event: ${eventError.message}`, req);
    }

    // 2) Specialized writes for prompts/responses (idempotent upserts)
    if (name === 'prompt_submitted' && scrubbedProps.prompt_id) {
      await supabase.from('prompts').upsert({
        prompt_id: scrubbedProps.prompt_id,
        user_id: scrubbedProps.user_id,
        session_id: scrubbedProps.session_id,
        contact_id: scrubbedProps.contact_id || null,
        text: scrubbedProps.text || scrubbedProps.prompt_text || '',
        model: scrubbedProps.model,
        temperature: scrubbedProps.temperature,
        context_len: scrubbedProps.context_len,
        tags: scrubbedProps.tags || [],
      }, { onConflict: 'prompt_id' });
    }

    if (name === 'ai_response_generated' && scrubbedProps.response_id) {
      await supabase.from('responses').upsert({
        response_id: scrubbedProps.response_id,
        prompt_id: scrubbedProps.prompt_id,
        user_id: scrubbedProps.user_id,
        model: scrubbedProps.model,
        text: scrubbedProps.response_text || scrubbedProps.text || '',
        tokens_out: scrubbedProps.output_tokens || scrubbedProps.tokens_out,
        finish_reason: scrubbedProps.finish_reason,
        cost_usd: scrubbedProps.cost_usd,
        latency_ms: scrubbedProps.latency_ms,
      }, { onConflict: 'response_id' });
    }

    // 3) Mirror to PostHog (fire-and-forget)
    if (process.env.POSTHOG_API_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      mirrorToPostHog(name, scrubbedProps, user?.id || scrubbedProps.session_id).catch((err) => {
        console.error('[Ingest] PostHog mirror error:', err);
      });
    }

    // 4) Forward to Marketing Intelligence webhook (fire-and-forget)
    if (process.env.MI_WEBHOOK_URL) {
      forwardToMI(name, scrubbedProps).catch((err) => {
        console.error('[Ingest] MI forward error:', err);
      });
    }

    return ok({ success: true }, req);

  } catch (error: any) {
    console.error('[Ingest] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}

/**
 * Scrub PII from event properties
 */
function scrubPII(props: Record<string, any>): Record<string, any> {
  const scrubbed = { ...props };
  
  // Remove common PII fields if accidentally included
  delete scrubbed.email;
  delete scrubbed.phone;
  delete scrubbed.phone_number;
  delete scrubbed.password;
  delete scrubbed.credit_card;
  delete scrubbed.ssn;
  
  // Truncate long text fields to prevent storing too much user content
  if (scrubbed.text && typeof scrubbed.text === 'string' && scrubbed.text.length > 5000) {
    scrubbed.text = scrubbed.text.substring(0, 5000) + '...[truncated]';
  }
  
  if (scrubbed.prompt_text && typeof scrubbed.prompt_text === 'string' && scrubbed.prompt_text.length > 5000) {
    scrubbed.prompt_text = scrubbed.prompt_text.substring(0, 5000) + '...[truncated]';
  }
  
  if (scrubbed.response_text && typeof scrubbed.response_text === 'string' && scrubbed.response_text.length > 5000) {
    scrubbed.response_text = scrubbed.response_text.substring(0, 5000) + '...[truncated]';
  }
  
  return scrubbed;
}

/**
 * Mirror event to PostHog
 */
async function mirrorToPostHog(
  eventName: string,
  props: Record<string, any>,
  distinctId: string
): Promise<void> {
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  const apiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!apiKey) {
    console.warn('[Ingest] PostHog API key not configured');
    return;
  }

  const payload = {
    api_key: apiKey,
    event: eventName,
    properties: props,
    distinct_id: distinctId,
    timestamp: new Date().toISOString(),
  };

  const response = await fetch(`${posthogHost}/capture/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000), // 5s timeout
  });

  if (!response.ok) {
    throw new Error(`PostHog mirror failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Forward event to Marketing Intelligence webhook
 */
async function forwardToMI(
  eventName: string,
  props: Record<string, any>
): Promise<void> {
  const webhookUrl = process.env.MI_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return; // Webhook not configured, skip
  }

  const payload = {
    event: eventName,
    properties: props,
    timestamp: new Date().toISOString(),
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000), // 5s timeout
  });

  if (!response.ok) {
    throw new Error(`MI forward failed: ${response.status} ${response.statusText}`);
  }
}
