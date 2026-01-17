// Use Web Crypto API for edge runtime compatibility
// Note: Conversions API uses Dataset ID, not Pixel ID
const PIXEL_ID = process.env.META_DATASET_ID || process.env.EXPO_PUBLIC_META_PIXEL_ID || '2005521593177778';
const ACCESS_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE; // Remove for production
const API_VERSION = 'v21.0';

export interface MetaUserData {
  em?: string;           // Email (will be hashed)
  fn?: string;           // First name (will be hashed)
  ln?: string;           // Last name (will be hashed)
  ph?: string;           // Phone (will be hashed)
  client_user_agent?: string;
  client_ip_address?: string;
  fbc?: string;          // Facebook click ID
  fbp?: string;          // Facebook browser ID
  external_id?: string;  // Your user ID (will be hashed)
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{ id: string; quantity: number }>;
  num_items?: number;
  [key: string]: any;
}

export interface MetaServerEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: 'website' | 'app' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
  opt_out?: boolean;
}

/**
 * SHA-256 hash a value for Meta Conversions API using Web Crypto API
 */
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize and hash user data for Meta Conversions API
 */
async function normalizeUserData(userData: MetaUserData): Promise<Record<string, string>> {
  const normalized: Record<string, string> = {};

  if (userData.em) {
    normalized.em = await hashValue(userData.em);
  }
  if (userData.fn) {
    normalized.fn = await hashValue(userData.fn);
  }
  if (userData.ln) {
    normalized.ln = await hashValue(userData.ln);
  }
  if (userData.ph) {
    // Remove non-numeric characters before hashing
    const cleanPhone = userData.ph.replace(/\D/g, '');
    normalized.ph = await hashValue(cleanPhone);
  }
  if (userData.external_id) {
    normalized.external_id = await hashValue(userData.external_id);
  }
  // These don't need hashing
  if (userData.client_user_agent) {
    normalized.client_user_agent = userData.client_user_agent;
  }
  if (userData.client_ip_address) {
    normalized.client_ip_address = userData.client_ip_address;
  }
  if (userData.fbc) {
    normalized.fbc = userData.fbc;
  }
  if (userData.fbp) {
    normalized.fbp = userData.fbp;
  }

  return normalized;
}

/**
 * Generate a unique event ID for deduplication using Web Crypto API
 */
export function generateEventId(): string {
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  const hex = Array.from(randomValues).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${Date.now()}-${hex}`;
}

/**
 * Send event(s) to Meta Conversions API
 */
export async function sendMetaEvent(events: MetaServerEvent | MetaServerEvent[]): Promise<{
  success: boolean;
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: string;
}> {
  if (!ACCESS_TOKEN) {
    console.error('[MetaConversions] Missing META_CONVERSIONS_API_TOKEN');
    return { success: false, error: 'Missing API token' };
  }

  const eventArray = Array.isArray(events) ? events : [events];

  // Normalize user data (hash PII) - await all async hash operations
  const normalizedEvents = await Promise.all(
    eventArray.map(async event => ({
      ...event,
      user_data: await normalizeUserData(event.user_data),
    }))
  );

  const payload: Record<string, any> = {
    data: normalizedEvents,
    access_token: ACCESS_TOKEN,
  };

  // Add test event code if in test mode
  if (TEST_EVENT_CODE) {
    payload.test_event_code = TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`;

  try {
    console.log('[MetaConversions] Sending events:', {
      pixel_id: PIXEL_ID,
      event_count: normalizedEvents.length,
      event_names: normalizedEvents.map(e => e.event_name),
      test_mode: !!TEST_EVENT_CODE,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[MetaConversions] API Error:', result);
      return {
        success: false,
        error: result.error?.message || 'Unknown error',
      };
    }

    console.log('[MetaConversions] Success:', result);
    return {
      success: true,
      events_received: result.events_received,
      messages: result.messages,
      fbtrace_id: result.fbtrace_id,
    };
  } catch (error: any) {
    console.error('[MetaConversions] Fetch error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// Pre-built event helpers for common events
// ============================================

/**
 * Track Purchase event (subscription payment)
 */
export async function trackPurchase(params: {
  email: string;
  userId?: string;
  value: number;
  currency?: string;
  contentName: string;
  eventId?: string;
  userAgent?: string;
  ipAddress?: string;
  fbc?: string;
  fbp?: string;
}) {
  const event: MetaServerEvent = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId || generateEventId(),
    action_source: 'website',
    user_data: {
      em: params.email,
      external_id: params.userId,
      client_user_agent: params.userAgent,
      client_ip_address: params.ipAddress,
      fbc: params.fbc,
      fbp: params.fbp,
    },
    custom_data: {
      value: params.value,
      currency: params.currency || 'USD',
      content_name: params.contentName,
    },
  };

  return sendMetaEvent(event);
}

/**
 * Track Subscribe event (subscription activated)
 */
export async function trackSubscribe(params: {
  email: string;
  userId?: string;
  value: number;
  currency?: string;
  planName: string;
  billingPeriod: 'monthly' | 'annual';
  eventId?: string;
  userAgent?: string;
  ipAddress?: string;
  fbc?: string;
  fbp?: string;
}) {
  const event: MetaServerEvent = {
    event_name: 'Subscribe',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId || generateEventId(),
    action_source: 'website',
    user_data: {
      em: params.email,
      external_id: params.userId,
      client_user_agent: params.userAgent,
      client_ip_address: params.ipAddress,
      fbc: params.fbc,
      fbp: params.fbp,
    },
    custom_data: {
      value: params.value,
      currency: params.currency || 'USD',
      content_name: params.planName,
      billing_period: params.billingPeriod,
    },
  };

  return sendMetaEvent(event);
}

/**
 * Track StartTrial event
 */
export async function trackStartTrial(params: {
  email: string;
  userId?: string;
  trialDays?: number;
  eventId?: string;
  userAgent?: string;
  ipAddress?: string;
  fbc?: string;
  fbp?: string;
}) {
  const event: MetaServerEvent = {
    event_name: 'StartTrial',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId || generateEventId(),
    action_source: 'website',
    user_data: {
      em: params.email,
      external_id: params.userId,
      client_user_agent: params.userAgent,
      client_ip_address: params.ipAddress,
      fbc: params.fbc,
      fbp: params.fbp,
    },
    custom_data: {
      value: 0,
      currency: 'USD',
      trial_days: params.trialDays || 7,
    },
  };

  return sendMetaEvent(event);
}

/**
 * Track Lead event (waitlist signup)
 */
export async function trackLead(params: {
  email: string;
  contentName?: string;
  eventId?: string;
  userAgent?: string;
  ipAddress?: string;
  fbc?: string;
  fbp?: string;
}) {
  const event: MetaServerEvent = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId || generateEventId(),
    action_source: 'website',
    user_data: {
      em: params.email,
      client_user_agent: params.userAgent,
      client_ip_address: params.ipAddress,
      fbc: params.fbc,
      fbp: params.fbp,
    },
    custom_data: {
      content_name: params.contentName || 'Waitlist',
    },
  };

  return sendMetaEvent(event);
}

/**
 * Track CompleteRegistration event (account created)
 */
export async function trackCompleteRegistration(params: {
  email: string;
  userId?: string;
  registrationMethod?: string;
  eventId?: string;
  userAgent?: string;
  ipAddress?: string;
  fbc?: string;
  fbp?: string;
}) {
  const event: MetaServerEvent = {
    event_name: 'CompleteRegistration',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId || generateEventId(),
    action_source: 'website',
    user_data: {
      em: params.email,
      external_id: params.userId,
      client_user_agent: params.userAgent,
      client_ip_address: params.ipAddress,
      fbc: params.fbc,
      fbp: params.fbp,
    },
    custom_data: {
      content_name: 'Registration',
      registration_method: params.registrationMethod || 'email',
    },
  };

  return sendMetaEvent(event);
}

/**
 * Track InitiateCheckout event
 */
export async function trackInitiateCheckout(params: {
  email?: string;
  userId?: string;
  value: number;
  currency?: string;
  planName: string;
  eventId?: string;
  userAgent?: string;
  ipAddress?: string;
  fbc?: string;
  fbp?: string;
}) {
  const event: MetaServerEvent = {
    event_name: 'InitiateCheckout',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId || generateEventId(),
    action_source: 'website',
    user_data: {
      em: params.email,
      external_id: params.userId,
      client_user_agent: params.userAgent,
      client_ip_address: params.ipAddress,
      fbc: params.fbc,
      fbp: params.fbp,
    },
    custom_data: {
      value: params.value,
      currency: params.currency || 'USD',
      content_name: params.planName,
    },
  };

  return sendMetaEvent(event);
}

/**
 * Track ViewContent event (pricing page, etc.)
 */
export async function trackViewContent(params: {
  email?: string;
  userId?: string;
  contentName: string;
  eventId?: string;
  userAgent?: string;
  ipAddress?: string;
  fbc?: string;
  fbp?: string;
}) {
  const event: MetaServerEvent = {
    event_name: 'ViewContent',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId || generateEventId(),
    action_source: 'website',
    user_data: {
      em: params.email,
      external_id: params.userId,
      client_user_agent: params.userAgent,
      client_ip_address: params.ipAddress,
      fbc: params.fbc,
      fbp: params.fbp,
    },
    custom_data: {
      content_name: params.contentName,
    },
  };

  return sendMetaEvent(event);
}

/**
 * Track custom event
 */
export async function trackCustomEvent(params: {
  eventName: string;
  email?: string;
  userId?: string;
  customData?: Record<string, any>;
  eventId?: string;
  userAgent?: string;
  ipAddress?: string;
  fbc?: string;
  fbp?: string;
}) {
  const event: MetaServerEvent = {
    event_name: params.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId || generateEventId(),
    action_source: 'website',
    user_data: {
      em: params.email,
      external_id: params.userId,
      client_user_agent: params.userAgent,
      client_ip_address: params.ipAddress,
      fbc: params.fbc,
      fbp: params.fbp,
    },
    custom_data: params.customData,
  };

  return sendMetaEvent(event);
}
