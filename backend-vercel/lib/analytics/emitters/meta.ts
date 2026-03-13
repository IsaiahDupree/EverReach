import * as crypto from 'crypto';
import type { AnalyticsEmitter, NormalizedRcEvent } from './base';

const META_APP_ID = '453049510987286'; // EverReach Meta App ID
const API_VERSION = 'v21.0';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function buildUserData(event: NormalizedRcEvent): Record<string, any> {
  const ud: Record<string, any> = {
    external_id: [sha256(event.user_id)],
  };
  if (event.email) ud.em = [sha256(event.email)];
  if (event.phone) ud.ph = [sha256(event.phone.replace(/\D/g, ''))];
  // fbc: Meta requires fb.{subdomain}.{timestamp}.{fbclid} format.
  // App stores raw fbclid in $fbClickId — wrap it here if needed.
  if (event.fbc) {
    ud.fbc = event.fbc.startsWith('fb.') ? event.fbc : `fb.1.${Math.floor(Date.now() / 1000)}.${event.fbc}`;
  }
  if (event.fbp) ud.fbp = event.fbp;
  // madid (IDFA) passed raw, lowercase — implies ATT granted
  if (event.madid) ud.madid = event.madid.toLowerCase();
  return ud;
}

function mapKindToMetaEvent(kind: NormalizedRcEvent['kind']): string | null {
  switch (kind) {
    case 'initial_purchase':   return 'Purchase';
    case 'trial_started':      return 'StartTrial';
    case 'trial_converted':    return 'Purchase';
    case 'renewal':            return 'Purchase';
    case 'product_change':     return 'Subscribe';
    case 'cancellation':       return 'Cancel';
    case 'expiration':         return 'Churn';
    case 'billing_issue':      return 'BillingIssue';
    case 'uncancellation':     return 'Reactivate';
    case 'refund':             return 'Refund';
    case 'non_subscription_purchase': return 'Purchase';
    default:                   return null;
  }
}

export class MetaEmitter implements AnalyticsEmitter {
  async emit(event: NormalizedRcEvent): Promise<void> {
    const pixelId = process.env.META_PIXEL_ID;
    const token = process.env.META_CONVERSIONS_API_TOKEN || process.env.META_CAPI_TOKEN;

    if (!pixelId || !token) return;
    if (event.environment === 'SANDBOX') {
      console.log('[MetaEmitter] Skipping sandbox event:', event.kind);
      return;
    }

    const eventName = mapKindToMetaEvent(event.kind);
    if (!eventName) {
      console.log('[MetaEmitter] No mapping for:', event.kind);
      return;
    }

    const capiEvent: Record<string, any> = {
      event_name: eventName,
      event_time: Math.floor((event.purchased_at_ms || Date.now()) / 1000),
      event_id: `rc_${event.event_id}`,
      action_source: 'app',
      user_data: buildUserData(event),
      // Only send app_data when madid is present (implies ATT granted).
      // Hardcoding advertiser_tracking_enabled: 1 without IDFA is invalid per Meta spec.
      ...(event.madid ? { app_data: { advertiser_tracking_enabled: 1, application_tracking_enabled: 1 } } : {}),
      custom_data: {
        currency: event.currency || 'USD',
        value: event.value,
        content_name: event.product_id,
        content_type: 'subscription',
        environment: event.environment,
        platform: event.platform,
        status: event.status,
      },
    };

    const testCode = process.env.META_TEST_EVENT_CODE;
    const body: Record<string, any> = { data: [capiEvent] };
    if (testCode) body.test_event_code = testCode;

    const url = `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Meta CAPI ${res.status}: ${errText.slice(0, 200)}`);
    }

    const result = await res.json();
    console.log('[MetaEmitter] Sent:', {
      event_name: eventName,
      events_received: result.events_received,
      user_id: event.user_id,
      has_fbc: !!event.fbc,
      has_madid: !!event.madid,
    });
  }
}
