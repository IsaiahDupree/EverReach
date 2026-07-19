import { createHash } from 'crypto';

const PIXEL_ID = '1191876055285693';
const API_VERSION = 'v21.0';

interface UserData {
  em?: string;      // Hashed email
  ph?: string;      // Hashed phone
  fn?: string;      // Hashed first name
  ln?: string;      // Hashed last name
  ct?: string;      // Hashed city
  st?: string;      // Hashed state
  zp?: string;      // Hashed zip
  country?: string; // Hashed country
  external_id?: string[];
  client_user_agent?: string;
  client_ip_address?: string;
  fbp?: string;     // Facebook browser ID
  fbc?: string;     // Facebook click ID
}

interface CustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  [key: string]: any;
}

export interface MetaServerEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: 'website' | 'app';
  event_source_url?: string;
  user_data: UserData;
  custom_data?: CustomData;
}

/**
 * Hash a string with SHA256 (normalized: lowercase, trimmed)
 */
export function hashPII(value: string): string {
  if (!value) return '';
  return createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex');
}

/**
 * Normalize and hash user data for Meta CAPI
 */
export function normalizeUserData(input: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  externalId?: string;
  userAgent?: string;
  clientIp?: string;
  fbp?: string;
  fbc?: string;
}): UserData {
  const result: UserData = {};

  if (input.email) result.em = hashPII(input.email);
  if (input.phone) {
    // Normalize phone: remove all non-digits
    const normalized = input.phone.replace(/\D/g, '');
    result.ph = hashPII(normalized);
  }
  if (input.firstName) result.fn = hashPII(input.firstName);
  if (input.lastName) result.ln = hashPII(input.lastName);
  if (input.city) result.ct = hashPII(input.city);
  if (input.state) result.st = hashPII(input.state);
  if (input.zip) {
    // Zip: first 5 digits only
    const zp5 = input.zip.substring(0, 5);
    result.zp = hashPII(zp5);
  }
  if (input.country) result.country = hashPII(input.country);
  if (input.externalId) result.external_id = [input.externalId];
  if (input.userAgent) result.client_user_agent = input.userAgent;
  if (input.clientIp) result.client_ip_address = input.clientIp;
  if (input.fbp) result.fbp = input.fbp;
  if (input.fbc) result.fbc = input.fbc;

  return result;
}

/**
 * Send an event to Meta Conversions API
 */
export async function sendMetaEvent(
  event: MetaServerEvent,
  testEventCode?: string
): Promise<{
  success: boolean;
  eventsReceived?: number;
  fblsDebugData?: any;
  error?: string;
}> {
  const token = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN ||
                process.env.META_CONVERSIONS_ACCESS_TOKEN;

  if (!token) {
    throw new Error('Missing META_CONVERSIONS_ACCESS_TOKEN environment variable');
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${token}`;

  const payload = {
    data: [event],
    ...(testEventCode && { test_event_code: testEventCode }),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errorMsg = data.error?.message ||
                      data.error?.error_user_msg ||
                      `HTTP ${response.status}`;
      return {
        success: false,
        error: errorMsg,
      };
    }

    return {
      success: data.events_received > 0,
      eventsReceived: data.events_received,
      fblsDebugData: data.fbs_debug_data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown error',
    };
  }
}

/**
 * Send multiple events in batch
 */
export async function sendMetaEventsBatch(
  events: MetaServerEvent[],
  testEventCode?: string
): Promise<{
  successful: number;
  failed: number;
  errors: Record<string, string>;
}> {
  const token = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN ||
                process.env.META_CONVERSIONS_ACCESS_TOKEN;

  if (!token) {
    throw new Error('Missing META_CONVERSIONS_ACCESS_TOKEN environment variable');
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${token}`;

  const payload = {
    data: events,
    ...(testEventCode && { test_event_code: testEventCode }),
  };

  const errors: Record<string, string> = {};
  let successful = 0;
  let failed = 0;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errorMsg = data.error?.message ||
                      data.error?.error_user_msg ||
                      `HTTP ${response.status}`;
      failed = events.length;
      for (const event of events) {
        errors[event.event_id] = errorMsg;
      }
      return { successful, failed, errors };
    }

    successful = data.events_received || 0;
    failed = events.length - successful;

    return { successful, failed, errors };
  } catch (err: any) {
    failed = events.length;
    for (const event of events) {
      errors[event.event_id] = err.message || 'Unknown error';
    }
    return { successful: 0, failed, errors };
  }
}

/**
 * Create a revenue event (Purchase, Subscribe, StartTrial)
 */
export function createRevenueEvent(
  eventName: 'Purchase' | 'Subscribe' | 'StartTrial',
  options: {
    eventId: string;
    eventTime?: number;
    value?: number;
    currency?: string;
    userData: UserData;
    customData?: CustomData;
    eventSourceUrl?: string;
  }
): MetaServerEvent {
  return {
    event_name: eventName,
    event_time: options.eventTime || Math.floor(Date.now() / 1000),
    event_id: options.eventId,
    action_source: 'app',
    event_source_url: options.eventSourceUrl,
    user_data: options.userData,
    custom_data: {
      currency: options.currency || 'USD',
      value: options.value || 0,
      ...options.customData,
    },
  };
}

/**
 * Create a funnel event (Lead, CompleteRegistration, etc.)
 */
export function createFunnelEvent(
  eventName: string,
  options: {
    eventId: string;
    eventTime?: number;
    userData: UserData;
    customData?: CustomData;
    eventSourceUrl?: string;
  }
): MetaServerEvent {
  return {
    event_name: eventName,
    event_time: options.eventTime || Math.floor(Date.now() / 1000),
    event_id: options.eventId,
    action_source: 'app',
    event_source_url: options.eventSourceUrl,
    user_data: options.userData,
    custom_data: options.customData,
  };
}

/**
 * Generate a unique event ID for deduplication
 */
export function generateEventId(prefix: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}
