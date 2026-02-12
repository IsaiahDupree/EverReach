/**
 * Meta Conversions API Emitter
 *
 * Forwards RevenueCat webhook events to Meta's Conversions API server-to-server.
 * This captures RENEWAL, CANCELLATION, EXPIRATION, and other lifecycle events
 * that the client-side SDK can't observe.
 *
 * Requires env vars: META_PIXEL_ID, META_CONVERSIONS_API_TOKEN
 */

import * as crypto from 'crypto';
import type { Emitter, NormalizedRcEvent } from './base';

const PIXEL_ID = process.env.META_PIXEL_ID || process.env.EXPO_PUBLIC_META_PIXEL_ID || '';
const TOKEN = process.env.META_CONVERSIONS_API_TOKEN || process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || '';
const API_VERSION = 'v21.0';
const IS_ENABLED = !!PIXEL_ID && !!TOKEN;

/**
 * Map RevenueCat event kind → Meta event_name + custom_data builder.
 * Standard events (Purchase, Subscribe, StartTrial) are optimizable by Meta's algo.
 * Custom events (Cancel, Churn, BillingIssue, Reactivate) are for reporting.
 */
function mapToMetaEvent(event: NormalizedRcEvent): {
  event_name: string;
  custom_data: Record<string, any>;
} | null {
  switch (event.kind) {
    case 'initial_purchase':
      return {
        event_name: 'Purchase',
        custom_data: {
          currency: 'USD',
          content_name: event.product_id,
          content_type: 'subscription',
        },
      };

    case 'trial_started':
      return {
        event_name: 'StartTrial',
        custom_data: {
          predicted_ltv: 0,
          currency: 'USD',
          content_name: event.product_id,
        },
      };

    case 'renewal':
      return {
        event_name: 'Purchase',
        custom_data: {
          currency: 'USD',
          content_name: event.product_id,
          content_type: 'subscription_renewal',
        },
      };

    case 'cancellation':
      return {
        event_name: 'Cancel',
        custom_data: {
          content_name: event.product_id,
        },
      };

    case 'expiration':
      return {
        event_name: 'Churn',
        custom_data: {
          content_name: event.product_id,
        },
      };

    case 'billing_issue':
      return {
        event_name: 'BillingIssue',
        custom_data: {
          content_name: event.product_id,
        },
      };

    case 'product_change':
      return {
        event_name: 'Subscribe',
        custom_data: {
          currency: 'USD',
          content_name: event.product_id,
          content_type: 'subscription_change',
        },
      };

    case 'uncancellation':
      return {
        event_name: 'Reactivate',
        custom_data: {
          content_name: event.product_id,
        },
      };

    case 'refund':
      return {
        event_name: 'Refund',
        custom_data: {
          content_name: event.product_id,
        },
      };

    default:
      return null;
  }
}

/**
 * Hash a value with SHA-256 (Meta requires lowercase hex digest).
 */
function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/**
 * Build user_data for the Conversions API event.
 * On the server side we only have user_id — no email/phone unless
 * we look it up from Supabase. We rely on external_id matching.
 */
function buildUserData(event: NormalizedRcEvent) {
  return {
    external_id: [sha256(event.user_id)],
    client_user_agent: 'EverReach-Server/1.0',
  };
}

/**
 * Send events to Meta Conversions API.
 */
async function sendToMeta(events: any[]): Promise<void> {
  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: events }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Meta CAPI ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  console.log('[MetaCAPI] Server-side event sent:', {
    events_received: result.events_received,
    count: events.length,
  });
}

// ---------------------------------------------------------------------------
// Emitter implementation
// ---------------------------------------------------------------------------

export const metaCAPIEmitter: Emitter = {
  name: 'meta-capi',

  async emit(event: NormalizedRcEvent): Promise<void> {
    if (!IS_ENABLED) {
      console.log('[MetaCAPI] Skipped (no credentials configured)');
      return;
    }

    // Skip sandbox events in production forwarding
    if (event.environment === 'SANDBOX') {
      console.log('[MetaCAPI] Skipped sandbox event:', event.kind);
      return;
    }

    const mapped = mapToMetaEvent(event);
    if (!mapped) {
      console.log('[MetaCAPI] No mapping for event kind:', event.kind);
      return;
    }

    const capiEvent = {
      event_name: mapped.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: `rc_${event.event_id}`, // Prefix to avoid dedup with client events
      user_data: buildUserData(event),
      custom_data: {
        ...mapped.custom_data,
        platform: event.platform,
        period_type: event.period_type,
        country_code: event.country_code,
        source: 'revenuecat_webhook',
      },
      action_source: 'app' as const,
    };

    await sendToMeta([capiEvent]);
  },
};
