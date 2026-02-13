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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

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
// Persistence Keys (AsyncStorage)
// ============================================================================

const STORAGE_PREFIX = '@meta_events:';
const STORAGE_KEYS = {
  fbp: `${STORAGE_PREFIX}fbp`,
  fbc: `${STORAGE_PREFIX}fbc`,
  fbc_timestamp: `${STORAGE_PREFIX}fbc_ts`,
  client_ip: `${STORAGE_PREFIX}client_ip`,
  hashed_email: `${STORAGE_PREFIX}hem`,
  hashed_phone: `${STORAGE_PREFIX}hph`,
  hashed_fn: `${STORAGE_PREFIX}hfn`,
  hashed_ln: `${STORAGE_PREFIX}hln`,
  hashed_ct: `${STORAGE_PREFIX}hct`,
  hashed_st: `${STORAGE_PREFIX}hst`,
  hashed_zp: `${STORAGE_PREFIX}hzp`,
  hashed_country: `${STORAGE_PREFIX}hcountry`,
  user_id: `${STORAGE_PREFIX}uid`,
} as const;

const FBC_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // fbc valid for 7 days

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
let _hashedFn: string | null = null; // first name
let _hashedLn: string | null = null; // last name
let _hashedCt: string | null = null; // city
let _hashedSt: string | null = null; // state
let _hashedZp: string | null = null; // zip
let _hashedCountry: string | null = null; // country
let _advertisingTrackingEnabled = true; // iOS ATT — assume yes until checked
let _trackingConsentResolved = false; // Whether ATT prompt has been shown
let _eventQueue: QueuedEvent[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
let _ipReady: Promise<void> | null = null; // resolves when IP is available or timed out

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
 * Set tracking consent based on iOS ATT (App Tracking Transparency) result.
 * Call this AFTER requesting ATT permission and BEFORE or AFTER initializeMetaAppEvents().
 * If the user denies tracking, we still send events but without user-identifying data.
 * 
 * @param granted - true if user granted ATT permission, false if denied
 */
export function setTrackingConsent(granted: boolean): void {
  _advertisingTrackingEnabled = granted;
  _trackingConsentResolved = true;

  // Update native SDK tracking flag if available
  if (HAS_NATIVE_SDK && Settings) {
    try {
      Settings.setAdvertiserTrackingEnabled(granted);
    } catch (e) {
      console.warn('[MetaAppEvents] Failed to update native SDK tracking:', e);
    }
  }

  console.log('[MetaAppEvents] Tracking consent set:', granted ? 'granted' : 'denied');
}

/**
 * Initialize Meta App Events tracking.
 * Call this once at app startup (in _layout.tsx).
 * Loads persisted parameters from AsyncStorage for immediate availability.
 * 
 * Note: Call setTrackingConsent() after ATT prompt resolves to gate user-level tracking.
 * Events are always queued (for aggregate measurement), but user_data fields
 * are only populated when tracking consent is granted.
 */
export function initializeMetaAppEvents(): void {
  if (_initialized) return;
  
  if (!IS_ENABLED) {
    console.log('[MetaAppEvents] Skipping init (missing PIXEL_ID or CONVERSIONS_API_TOKEN)');
    return;
  }

  _initialized = true;

  // Initialize native SDK if available (ATT value updated later via setTrackingConsent)
  if (HAS_NATIVE_SDK && Settings) {
    try {
      Settings.setAdvertiserTrackingEnabled(_advertisingTrackingEnabled);
      console.log('[MetaAppEvents] Native Facebook SDK initialized');
    } catch (e) {
      console.warn('[MetaAppEvents] Native SDK init failed:', e);
    }
  }

  // Load persisted parameters from AsyncStorage (non-blocking but fast)
  loadPersistedParams().then(() => {
    if (__DEV__) {
      console.log('[MetaAppEvents] Persisted params loaded', {
        hasFbp: !!_fbp,
        hasFbc: !!_fbc,
        hasIp: !!_clientIpAddress,
        hasEmail: !!_hashedEmail,
        hasPhone: !!_hashedPhone,
        hasFn: !!_hashedFn,
      });
    }
  });

  // Fetch fresh client IP (also persists it). _ipReady resolves when IP is available or timed out.
  _ipReady = fetchClientIp();

  // Start flush timer for Conversions API batch
  _flushTimer = setInterval(flushEventQueue, FLUSH_INTERVAL_MS);

  console.log('[MetaAppEvents] Initialized', {
    pixelId: PIXEL_ID.substring(0, 6) + '...',
    nativeSDK: HAS_NATIVE_SDK,
    conversionsAPI: true,
  });
}

/**
 * Profile data for enhanced event matching.
 * All fields are optional — send whatever is available.
 */
export interface MetaUserProfile {
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

/**
 * Identify the current user for better event matching.
 * Call after authentication. All hashed values are persisted to AsyncStorage.
 */
export async function identifyMetaUser(
  userId: string,
  email?: string,
  phone?: string,
  profile?: MetaUserProfile,
): Promise<void> {
  _userId = userId;
  
  const persistBatch: [string, string][] = [
    [STORAGE_KEYS.user_id, userId],
  ];

  if (email) {
    _userEmail = email;
    _hashedEmail = await hashSHA256(email.toLowerCase().trim());
    persistBatch.push([STORAGE_KEYS.hashed_email, _hashedEmail]);
  }

  if (phone) {
    _userPhone = phone;
    const normalized = phone.replace(/[^\d]/g, '');
    _hashedPhone = await hashSHA256(normalized);
    persistBatch.push([STORAGE_KEYS.hashed_phone, _hashedPhone]);
  }

  if (profile?.firstName) {
    _hashedFn = await hashSHA256(profile.firstName.toLowerCase().trim());
    persistBatch.push([STORAGE_KEYS.hashed_fn, _hashedFn]);
  }

  if (profile?.lastName) {
    _hashedLn = await hashSHA256(profile.lastName.toLowerCase().trim());
    persistBatch.push([STORAGE_KEYS.hashed_ln, _hashedLn]);
  }

  if (profile?.city) {
    _hashedCt = await hashSHA256(profile.city.toLowerCase().trim().replace(/\s/g, ''));
    persistBatch.push([STORAGE_KEYS.hashed_ct, _hashedCt]);
  }

  if (profile?.state) {
    _hashedSt = await hashSHA256(profile.state.toLowerCase().trim().replace(/\s/g, ''));
    persistBatch.push([STORAGE_KEYS.hashed_st, _hashedSt]);
  }

  if (profile?.zip) {
    _hashedZp = await hashSHA256(profile.zip.trim().substring(0, 5));
    persistBatch.push([STORAGE_KEYS.hashed_zp, _hashedZp]);
  }

  if (profile?.country) {
    _hashedCountry = await hashSHA256(profile.country.toLowerCase().trim());
    persistBatch.push([STORAGE_KEYS.hashed_country, _hashedCountry]);
  }

  // Persist all hashed values in a single batch write
  try {
    await AsyncStorage.multiSet(persistBatch);
  } catch {}

  console.log('[MetaAppEvents] User identified:', userId.substring(0, 8) + '...', {
    params: persistBatch.length,
  });
}

/**
 * Reset user identity (call on logout).
 * Keeps device-level params (fbp, IP) but clears user-level params.
 */
export function resetMetaUser(): void {
  _userId = null;
  _userEmail = null;
  _hashedEmail = null;
  _userPhone = null;
  _hashedPhone = null;
  _hashedFn = null;
  _hashedLn = null;
  _hashedCt = null;
  _hashedSt = null;
  _hashedZp = null;
  _hashedCountry = null;
  _fbc = null;

  // Clear user-level persisted values (keep fbp and IP — they're device-level)
  AsyncStorage.multiRemove([
    STORAGE_KEYS.user_id,
    STORAGE_KEYS.hashed_email,
    STORAGE_KEYS.hashed_phone,
    STORAGE_KEYS.hashed_fn,
    STORAGE_KEYS.hashed_ln,
    STORAGE_KEYS.hashed_ct,
    STORAGE_KEYS.hashed_st,
    STORAGE_KEYS.hashed_zp,
    STORAGE_KEYS.hashed_country,
    STORAGE_KEYS.fbc,
    STORAGE_KEYS.fbc_timestamp,
  ]).catch(() => {});

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
 * On first flush, waits for IP readiness (up to 3s) to maximize coverage.
 */
async function flushEventQueue(): Promise<void> {
  if (_eventQueue.length === 0) return;

  // Wait for IP on first flush (up to 3s — cached IP will be instant on subsequent sessions)
  if (_ipReady) {
    await _ipReady;
    _ipReady = null; // Only wait once
  }

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

      // Log events to Supabase for audit trail (fire-and-forget)
      logEventsToSupabase(events, result).catch((err: any) => {
        if (__DEV__) console.warn('[MetaAppEvents] DB log failed:', err);
      });
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

/**
 * Log successfully flushed events to Supabase meta_conversion_event table.
 * Fire-and-forget — failures are logged but don't affect event delivery.
 */
async function logEventsToSupabase(
  events: QueuedEvent[],
  apiResponse: { events_received?: number },
): Promise<void> {
  if (!supabase) return;

  const rows = events.map((evt) => ({
    event_id: evt.event_id,
    pixel_id: PIXEL_ID,
    event_name: evt.event_name,
    event_time: new Date(evt.event_time * 1000).toISOString(),
    action_source: evt.action_source,
    user_id: evt.user_data.external_id?.[0] || null,
    hashed_email: evt.user_data.em?.[0] || null,
    hashed_phone: evt.user_data.ph?.[0] || null,
    client_ip_address: evt.user_data.client_ip_address || null,
    client_user_agent: evt.user_data.client_user_agent || null,
    fbp: evt.user_data.fbp || null,
    fbc: evt.user_data.fbc || null,
    value: evt.custom_data.value || null,
    currency: evt.custom_data.currency || null,
    custom_data: evt.custom_data,
    test_event_code: __DEV__ ? 'TEST48268' : null,
    sent_at: new Date().toISOString(),
    response_data: { events_received: apiResponse.events_received },
  }));

  const { error } = await supabase
    .from('meta_conversion_event')
    .insert(rows);

  if (error) {
    if (__DEV__) console.warn('[MetaAppEvents] Supabase insert error:', error.message);
  } else if (__DEV__) {
    console.log('[MetaAppEvents] Logged', rows.length, 'events to Supabase');
  }
}

// ============================================================================
// Persistence
// ============================================================================

/**
 * Load persisted parameters from AsyncStorage.
 * Called during init to ensure fbp, IP, and user data are available immediately.
 */
async function loadPersistedParams(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    const pairs = await AsyncStorage.multiGet(keys);
    const store = Object.fromEntries(pairs.filter(([, v]) => v !== null) as [string, string][]);

    // fbp — always keep (device-level, survives logout and restart)
    if (store[STORAGE_KEYS.fbp]) {
      _fbp = store[STORAGE_KEYS.fbp];
    } else {
      // Generate new fbp and persist
      _fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`;
      AsyncStorage.setItem(STORAGE_KEYS.fbp, _fbp).catch(() => {});
    }

    // fbc — only if within 7-day window
    if (store[STORAGE_KEYS.fbc] && store[STORAGE_KEYS.fbc_timestamp]) {
      const fbcAge = Date.now() - parseInt(store[STORAGE_KEYS.fbc_timestamp], 10);
      if (fbcAge < FBC_MAX_AGE_MS) {
        _fbc = store[STORAGE_KEYS.fbc];
      } else {
        // Expired — clean up
        AsyncStorage.multiRemove([STORAGE_KEYS.fbc, STORAGE_KEYS.fbc_timestamp]).catch(() => {});
      }
    }

    // Cached IP (will be refreshed by fetchClientIp, but this gives instant availability)
    if (store[STORAGE_KEYS.client_ip]) {
      _clientIpAddress = store[STORAGE_KEYS.client_ip];
    }

    // User-level hashed values (survive app restart if user didn't logout)
    if (store[STORAGE_KEYS.user_id]) _userId = store[STORAGE_KEYS.user_id];
    if (store[STORAGE_KEYS.hashed_email]) _hashedEmail = store[STORAGE_KEYS.hashed_email];
    if (store[STORAGE_KEYS.hashed_phone]) _hashedPhone = store[STORAGE_KEYS.hashed_phone];
    if (store[STORAGE_KEYS.hashed_fn]) _hashedFn = store[STORAGE_KEYS.hashed_fn];
    if (store[STORAGE_KEYS.hashed_ln]) _hashedLn = store[STORAGE_KEYS.hashed_ln];
    if (store[STORAGE_KEYS.hashed_ct]) _hashedCt = store[STORAGE_KEYS.hashed_ct];
    if (store[STORAGE_KEYS.hashed_st]) _hashedSt = store[STORAGE_KEYS.hashed_st];
    if (store[STORAGE_KEYS.hashed_zp]) _hashedZp = store[STORAGE_KEYS.hashed_zp];
    if (store[STORAGE_KEYS.hashed_country]) _hashedCountry = store[STORAGE_KEYS.hashed_country];
  } catch {
    // AsyncStorage failure — generate fbp as fallback
    if (!_fbp) {
      _fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`;
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

  // Device-level identifiers (always included — not gated by ATT)
  if (_fbp) userData.fbp = _fbp;
  if (_clientIpAddress) userData.client_ip_address = _clientIpAddress;

  // User-identifying data — ONLY included when ATT consent is granted (Apple requirement)
  // Per Apple FAQ: hashed emails, phone numbers, and cross-app identifiers
  // require ATT permission before being sent to third parties for tracking.
  if (_advertisingTrackingEnabled) {
    if (_hashedEmail) userData.em = [_hashedEmail];
    if (_hashedPhone) userData.ph = [_hashedPhone];
    if (_userId) userData.external_id = [_userId];
    if (_fbc) userData.fbc = _fbc;

    // Profile data (hashed) — improves Event Match Quality score
    if (_hashedFn) userData.fn = [_hashedFn];
    if (_hashedLn) userData.ln = [_hashedLn];
    if (_hashedCt) userData.ct = [_hashedCt];
    if (_hashedSt) userData.st = [_hashedSt];
    if (_hashedZp) userData.zp = [_hashedZp];
    if (_hashedCountry) userData.country = [_hashedCountry];
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
 * Persisted to AsyncStorage (valid for 7 days).
 */
export function captureClickId(url: string): void {
  try {
    const urlObj = new URL(url);
    const fbclid = urlObj.searchParams.get('fbclid');
    if (fbclid) {
      // fbc format: fb.1.{timestamp}.{fbclid}
      _fbc = `fb.1.${Date.now()}.${fbclid}`;
      AsyncStorage.multiSet([
        [STORAGE_KEYS.fbc, _fbc],
        [STORAGE_KEYS.fbc_timestamp, Date.now().toString()],
      ]).catch(() => {});
      console.log('[MetaAppEvents] Click ID captured from URL');
    }
  } catch {
    // URL parsing failed — ignore
  }
}

/**
 * Fetch client IP address for Event Match Quality.
 * Persists to AsyncStorage so it's instantly available on next session.
 * Returns a promise that resolves when IP is available (or after 3s timeout).
 */
async function fetchClientIp(): Promise<void> {
  // Race: IP fetch vs 3-second timeout (so events aren't held forever)
  const ipFetch = (async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        _clientIpAddress = data.ip || null;
        if (_clientIpAddress) {
          AsyncStorage.setItem(STORAGE_KEYS.client_ip, _clientIpAddress).catch(() => {});
        }
        if (__DEV__) {
          console.log('[MetaAppEvents] Client IP captured:', _clientIpAddress?.substring(0, 8) + '...');
        }
      }
    } catch {
      // Non-critical — use cached IP from AsyncStorage
    }
  })();

  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
  await Promise.race([ipFetch, timeout]);
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
    
    // Paywall funnel
    'paywall_viewed': {
      metaEvent: 'ViewContent',
      mapper: (p) => ({ content_name: 'paywall', content_type: 'paywall', content_category: p.source || p.trigger }),
    },
    
    // RevenueCat-specific events
    'revenuecat_purchase_started': {
      metaEvent: 'InitiateCheckout',
      mapper: (p) => ({ content_name: p.plan_id || 'subscription', content_type: 'subscription', content_category: p.offering_id }),
    },
    'revenuecat_restore_success': {
      metaEvent: 'Subscribe',
      mapper: (p) => ({ content_name: 'restore', content_type: 'subscription', content_category: 'restore' }),
    },
    
    // Purchases (critical for ROAS measurement)
    'purchase_completed': {
      metaEvent: 'Purchase',
      mapper: (p) => ({ value: p.amount || p.value || 0, currency: p.currency || 'USD', content_name: p.plan || p.product_id, content_type: 'subscription' }),
    },
    'payment_info_added': {
      metaEvent: 'AddPaymentInfo',
      mapper: (p) => ({ content_category: p.payment_method || 'apple_pay', currency: 'USD', value: 0 }),
    },
    
    // AI features (custom events)
    'ai_message_generated': {
      metaEvent: 'CustomizeProduct',
      mapper: (p) => ({ content_name: 'ai_message', content_category: p.goal_type }),
    },
    'message_generated': {
      metaEvent: 'CustomizeProduct',
      mapper: (p) => ({ content_name: 'ai_message', content_category: p.goal || p.goalId, content_type: p.channel }),
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
