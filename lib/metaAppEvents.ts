/**
 * Meta App Events Integration for iOS
 * 
 * Dual approach:
 * 1. Conversions API (server-side) — works immediately with Pixel ID + access token
 * 2. Native Facebook SDK (react-native-fbsdk-next) — requires Facebook App ID (added later)
 * 
 * Both feed into the same Meta Events Manager and support deduplication via event_id.
 * 
 * Standard Meta Events mapped:
 * - CompleteRegistration → auth_sign_up
 * - StartTrial → trial_started
 * - Subscribe / Purchase → subscription_upgraded
 * - ViewContent → screen_viewed / contact_viewed
 * - Lead → lead_captured
 * - Contact → message_sent
 * - AddToWishlist → contact_created (relationship tracking)
 * - Search → contact_searched
 * 
 * Setup:
 * 1. Set EXPO_PUBLIC_META_PIXEL_ID and EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN in .env
 * 2. (Optional) Install react-native-fbsdk-next and add config plugin for native SDK
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

// ============================================================================
// Configuration
// ============================================================================

const PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID || '';
const CONVERSIONS_API_TOKEN = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || '';
const GRAPH_API_VERSION = 'v21.0';
const IS_ENABLED = !!PIXEL_ID && !!CONVERSIONS_API_TOKEN;

// Native Facebook SDK (optional — only available when react-native-fbsdk-next is installed)
let AppEventsLogger: any = null;
let Settings: any = null;

try {
  // Dynamic import to avoid crash when not installed
  const fbsdk = require('react-native-fbsdk-next');
  AppEventsLogger = fbsdk.AppEventsLogger;
  Settings = fbsdk.Settings;
} catch {
  // react-native-fbsdk-next not installed — Conversions API only
}

const HAS_NATIVE_SDK = !!AppEventsLogger;

// ============================================================================
// State
// ============================================================================

let _initialized = false;
let _userId: string | null = null;
let _userEmail: string | null = null;
let _hashedEmail: string | null = null;
let _userPhone: string | null = null;
let _hashedPhone: string | null = null;
let _clientIpAddress: string | null = null;
let _fbp: string | null = null; // Browser ID (generated for app)
let _fbc: string | null = null; // Click ID (from Facebook ad deep links)
let _advertisingTrackingEnabled = true; // iOS ATT — assume yes until checked
let _eventQueue: QueuedEvent[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_INTERVAL_MS = 10_000; // Batch events every 10 seconds
const MAX_QUEUE_SIZE = 20;

interface QueuedEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  user_data: Record<string, any>;
  custom_data: Record<string, any>;
  app_data: Record<string, any>;
  action_source: 'app';
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize Meta App Events tracking.
 * Call this once at app startup (in _layout.tsx).
 */
export function initializeMetaAppEvents(): void {
  if (_initialized) return;
  
  if (!IS_ENABLED) {
    console.log('[MetaAppEvents] Skipping init (missing PIXEL_ID or CONVERSIONS_API_TOKEN)');
    return;
  }

  _initialized = true;

  // Initialize native SDK if available
  if (HAS_NATIVE_SDK && Settings) {
    try {
      Settings.setAdvertiserTrackingEnabled(true);
      console.log('[MetaAppEvents] Native Facebook SDK initialized');
    } catch (e) {
      console.warn('[MetaAppEvents] Native SDK init failed:', e);
    }
  }

  // Generate fbp (Browser ID equivalent for app) — persisted format: fb.1.{timestamp}.{random}
  if (!_fbp) {
    _fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`;
  }

  // Fetch client IP address asynchronously (for Event Match Quality)
  fetchClientIp();

  // Start flush timer for Conversions API batch
  _flushTimer = setInterval(flushEventQueue, FLUSH_INTERVAL_MS);

  console.log('[MetaAppEvents] Initialized', {
    pixelId: PIXEL_ID.substring(0, 6) + '...',
    nativeSDK: HAS_NATIVE_SDK,
    conversionsAPI: true,
  });
}

/**
 * Identify the current user for better event matching.
 * Call after authentication.
 */
export async function identifyMetaUser(
  userId: string,
  email?: string,
  phone?: string,
): Promise<void> {
  _userId = userId;
  
  if (email) {
    _userEmail = email;
    _hashedEmail = await hashSHA256(email.toLowerCase().trim());
  }

  if (phone) {
    _userPhone = phone;
    // Normalize: strip non-digits, ensure country code
    const normalized = phone.replace(/[^\d]/g, '');
    _hashedPhone = await hashSHA256(normalized);
  }

  console.log('[MetaAppEvents] User identified:', userId.substring(0, 8) + '...');
}

/**
 * Reset user identity (call on logout).
 */
export function resetMetaUser(): void {
  _userId = null;
  _userEmail = null;
  _hashedEmail = null;
  _userPhone = null;
  _hashedPhone = null;
  _fbc = null;

  if (HAS_NATIVE_SDK && AppEventsLogger) {
    try {
      AppEventsLogger.clearUserID();
    } catch {}
  }

  console.log('[MetaAppEvents] User reset');
}

/**
 * Clean up on app close.
 */
export async function shutdownMetaAppEvents(): Promise<void> {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
  await flushEventQueue();
  _initialized = false;
}

// ============================================================================
// Standard Meta Event Helpers
// ============================================================================

/**
 * Track user registration (CompleteRegistration)
 */
export function trackRegistration(method: string = 'email'): void {
  trackMetaEvent('CompleteRegistration', {
    content_name: 'signup',
    status: 'completed',
    registration_method: method,
  });
}

/**
 * Track trial start (StartTrial)
 */
export function trackTrialStart(trialDays: number, value: number = 0): void {
  trackMetaEvent('StartTrial', {
    predicted_ltv: value,
    currency: 'USD',
    content_name: 'free_trial',
    num_items: trialDays,
  });
}

/**
 * Track subscription purchase (Subscribe / Purchase)
 */
export function trackPurchase(
  planName: string,
  value: number,
  currency: string = 'USD',
): void {
  trackMetaEvent('Subscribe', {
    value,
    currency,
    content_name: planName,
    content_type: 'subscription',
  });

  // Also fire Purchase for broader optimization
  trackMetaEvent('Purchase', {
    value,
    currency,
    content_name: planName,
    content_type: 'subscription',
    num_items: 1,
  });
}

/**
 * Track screen/content view (ViewContent)
 */
export function trackContentView(
  contentName: string,
  contentCategory?: string,
  contentId?: string,
): void {
  trackMetaEvent('ViewContent', {
    content_name: contentName,
    content_category: contentCategory,
    content_ids: contentId ? [contentId] : undefined,
    content_type: 'screen',
  });
}

/**
 * Track lead capture (Lead)
 */
export function trackLead(source: string, leadScore?: number): void {
  trackMetaEvent('Lead', {
    content_name: source,
    value: leadScore || 0,
    currency: 'USD',
  });
}

/**
 * Track contact created (AddToWishlist — relationship added)
 */
export function trackContactCreated(source: string = 'manual'): void {
  trackMetaEvent('AddToWishlist', {
    content_name: 'contact_added',
    content_category: source,
  });
}

/**
 * Track message sent (Contact event)
 */
export function trackMessageSent(channel: string): void {
  trackMetaEvent('Contact', {
    content_name: 'message_sent',
    content_category: channel,
  });
}

/**
 * Track search (Search)
 */
export function trackSearch(query: string, resultCount: number): void {
  trackMetaEvent('Search', {
    search_string: query.substring(0, 100),
    content_category: 'contacts',
    num_items: resultCount,
  });
}

/**
 * Track app install / first open (custom event)
 */
export function trackAppInstall(installSource: string = 'organic'): void {
  trackMetaEvent('AppInstall', {
    content_name: 'first_open',
    content_category: installSource,
  });
}

/**
 * Track activation event (custom — user completes key action)
 */
export function trackActivation(type: string): void {
  trackMetaEvent('Activation', {
    content_name: type,
  });
}

// ============================================================================
// Core Event Dispatch
// ============================================================================

/**
 * Track a Meta event. Sends to both native SDK (if available) and Conversions API.
 */
export function trackMetaEvent(
  eventName: string,
  customData?: Record<string, any>,
): void {
  if (!_initialized || !IS_ENABLED) return;

  const eventId = generateEventId();
  const eventTime = Math.floor(Date.now() / 1000);

  // 1. Native SDK (if available) — for automatic device matching
  if (HAS_NATIVE_SDK && AppEventsLogger) {
    try {
      const value = customData?.value;
      if (value !== undefined && typeof value === 'number') {
        AppEventsLogger.logPurchase(value, customData?.currency || 'USD', {
          fb_content_type: customData?.content_type,
          fb_content_id: customData?.content_ids?.[0],
          _eventId: eventId,
        });
      } else {
        AppEventsLogger.logEvent(eventName, {
          ...flattenCustomData(customData),
          _eventId: eventId,
        });
      }
    } catch (e) {
      console.warn('[MetaAppEvents] Native SDK event failed:', e);
    }
  }

  // 2. Queue for Conversions API (server-side)
  const queuedEvent: QueuedEvent = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    user_data: buildUserData(),
    custom_data: customData || {},
    app_data: buildAppData(),
    action_source: 'app',
  };

  _eventQueue.push(queuedEvent);

  if (__DEV__) {
    console.log('[MetaAppEvents] Event queued:', eventName, {
      eventId: eventId.substring(0, 12) + '...',
      queueSize: _eventQueue.length,
      nativeSent: HAS_NATIVE_SDK,
    });
  }

  // Auto-flush if queue is full
  if (_eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEventQueue();
  }
}

// ============================================================================
// Conversions API
// ============================================================================

/**
 * Flush queued events to Meta Conversions API.
 */
async function flushEventQueue(): Promise<void> {
  if (_eventQueue.length === 0) return;

  const events = [..._eventQueue];
  _eventQueue = [];

  try {
    const payload = {
      data: events,
    };

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${CONVERSIONS_API_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json();
      if (__DEV__) {
        console.log('[MetaAppEvents] Conversions API flush success:', {
          events_received: result.events_received,
          count: events.length,
        });
      }
    } else {
      const errorText = await response.text();
      console.error('[MetaAppEvents] Conversions API error:', {
        status: response.status,
        error: errorText.substring(0, 200),
        eventCount: events.length,
      });
      // Re-queue failed events (up to limit)
      if (_eventQueue.length + events.length <= MAX_QUEUE_SIZE * 2) {
        _eventQueue.push(...events);
      }
    }
  } catch (error) {
    console.error('[MetaAppEvents] Conversions API flush failed:', error);
    // Re-queue on network failure
    if (_eventQueue.length + events.length <= MAX_QUEUE_SIZE * 2) {
      _eventQueue.push(...events);
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function buildUserData(): Record<string, any> {
  const userData: Record<string, any> = {
    client_user_agent: `EverReach/1.0 (${Platform.OS})`,
  };

  if (_hashedEmail) {
    userData.em = [_hashedEmail];
  }

  if (_hashedPhone) {
    userData.ph = [_hashedPhone];
  }

  if (_userId) {
    userData.external_id = [_userId];
  }

  if (_clientIpAddress) {
    userData.client_ip_address = _clientIpAddress;
  }

  if (_fbp) {
    userData.fbp = _fbp;
  }

  if (_fbc) {
    userData.fbc = _fbc;
  }

  return userData;
}

function buildAppData(): Record<string, any> {
  const version = Constants.expoConfig?.version || '1.0.0';
  const osVersion = Platform.Version?.toString() || '18.0';
  const bundleId = Constants.expoConfig?.ios?.bundleIdentifier || 'com.everreach.app';

  return {
    advertiser_tracking_enabled: _advertisingTrackingEnabled ? 1 : 0,
    application_tracking_enabled: 1,
    // Meta requires extinfo with specific format for iOS (i2) / Android (a2)
    // See: https://developers.facebook.com/docs/graph-api/reference/application/activities/#parameters
    extinfo: [
      Platform.OS === 'ios' ? 'i2' : 'a2', // extinfo version
      bundleId,           // app package name
      version,            // short version
      version,            // long version
      osVersion,          // OS version
      'iPhone',           // device model
      'en_US',            // locale
      'UTC',              // timezone abbreviation
      '',                 // carrier
      '390',              // screen width
      '844',              // screen height
      '2',                // screen density
      '6',                // CPU cores
      '256000',           // external storage (MB)
      '225000',           // free space (MB)
      '-5',               // timezone offset
    ],
  };
}

function flattenCustomData(data?: Record<string, any>): Record<string, string> {
  if (!data) return {};
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      flat[key] = Array.isArray(value) ? value.join(',') : String(value);
    }
  }
  return flat;
}

function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `ev_${timestamp}_${random}`;
}

/**
 * Capture Facebook Click ID from a deep link URL.
 * Call this when the app opens from a Facebook ad (via Linking or deep link handler).
 * The fbclid parameter is in the URL: ?fbclid=xxxx
 */
export function captureClickId(url: string): void {
  try {
    const urlObj = new URL(url);
    const fbclid = urlObj.searchParams.get('fbclid');
    if (fbclid) {
      // fbc format: fb.1.{timestamp}.{fbclid}
      _fbc = `fb.1.${Date.now()}.${fbclid}`;
      console.log('[MetaAppEvents] Click ID captured from URL');
    }
  } catch {
    // URL parsing failed — ignore
  }
}

/**
 * Fetch client IP address for Event Match Quality.
 */
async function fetchClientIp(): Promise<void> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      _clientIpAddress = data.ip || null;
      if (__DEV__) {
        console.log('[MetaAppEvents] Client IP captured:', _clientIpAddress?.substring(0, 8) + '...');
      }
    }
  } catch {
    // Non-critical — events still work without IP
  }
}

async function hashSHA256(value: string): Promise<string> {
  try {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      value,
    );
  } catch {
    // Fallback: return empty (won't be used for matching)
    return '';
  }
}

// ============================================================================
// Event Name Mapping (App Events → Meta Standard Events)
// ============================================================================

/**
 * Map internal analytics event names to Meta standard event names.
 * Returns null if the event should not be forwarded to Meta.
 */
export function mapToMetaEvent(
  internalEvent: string,
): { metaEvent: string; mapper?: (props: Record<string, any>) => Record<string, any> } | null {
  const mapping: Record<string, { metaEvent: string; mapper?: (props: Record<string, any>) => Record<string, any> }> = {
    // Auth
    'auth_sign_up': {
      metaEvent: 'CompleteRegistration',
      mapper: (p) => ({ content_name: 'signup', status: 'completed', registration_method: p.method || 'email' }),
    },
    
    // Subscription
    'trial_started': {
      metaEvent: 'StartTrial',
      mapper: (p) => ({ predicted_ltv: 0, currency: 'USD', content_name: 'free_trial', num_items: p.trial_days || 7 }),
    },
    'subscription_upgraded': {
      metaEvent: 'Subscribe',
      mapper: (p) => ({ value: p.amount || 0, currency: 'USD', content_name: p.to_plan, content_type: 'subscription' }),
    },
    
    // Content
    'screen_viewed': {
      metaEvent: 'ViewContent',
      mapper: (p) => ({ content_name: p.screen_name, content_type: 'screen' }),
    },
    'contact_viewed': {
      metaEvent: 'ViewContent',
      mapper: (p) => ({ content_name: 'contact_detail', content_ids: p.contact_id ? [p.contact_id] : undefined, content_type: 'contact' }),
    },
    
    // Contacts
    'contact_created': {
      metaEvent: 'AddToWishlist',
      mapper: (p) => ({ content_name: 'contact_added', content_category: p.source || 'manual' }),
    },
    'contact_searched': {
      metaEvent: 'Search',
      mapper: (p) => ({ search_string: p.query?.substring(0, 100), num_items: p.result_count }),
    },
    
    // Messaging
    'message_sent': {
      metaEvent: 'Contact',
      mapper: (p) => ({ content_name: 'message_sent', content_category: p.channel }),
    },
    
    // Marketing funnel
    'lead_captured': {
      metaEvent: 'Lead',
      mapper: (p) => ({ content_name: p.source, value: p.lead_score || 0, currency: 'USD' }),
    },
    'install_tracked': {
      metaEvent: 'AppInstall',
      mapper: (p) => ({ content_name: 'first_open', content_category: p.install_source || 'organic' }),
    },
    'first_open_post_install': {
      metaEvent: 'AppInstall',
      mapper: (p) => ({ content_name: 'first_open', content_category: p.install_source || 'organic' }),
    },
    'activation_event': {
      metaEvent: 'Activation',
      mapper: (p) => ({ content_name: p.type }),
    },
    'qualified_signup': {
      metaEvent: 'Lead',
      mapper: (p) => ({ content_name: 'qualified_signup', value: p.lead_score || 0, currency: 'USD' }),
    },
    
    // AI features (custom events)
    'ai_message_generated': {
      metaEvent: 'CustomizeProduct',
      mapper: (p) => ({ content_name: 'ai_message', content_category: p.goal_type }),
    },
  };

  return mapping[internalEvent] || null;
}

/**
 * Auto-track an internal event to Meta if it has a mapping.
 * Called from the main analytics.track() function.
 */
export function autoTrackToMeta(
  internalEvent: string,
  properties?: Record<string, any>,
): void {
  const mapping = mapToMetaEvent(internalEvent);
  if (!mapping) return;

  const customData = mapping.mapper
    ? mapping.mapper(properties || {})
    : properties || {};

  trackMetaEvent(mapping.metaEvent, customData);
}
