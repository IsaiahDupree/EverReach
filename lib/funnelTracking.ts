/**
 * Funnel Tracking Client Library
 * Handles session management and event tracking for the waitlist funnel
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ever-reach-be.vercel.app';
const SESSION_KEY = 'everreach_session_id';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get or create session ID from localStorage
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return generateSessionId();
  }
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Parse URL parameters for UTM and Meta tracking
 */
function parseTrackingParams(): Record<string, string | undefined> {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_content: params.get('utm_content') || undefined,
    utm_term: params.get('utm_term') || undefined,
    meta_ad_id: params.get('ad_id') || undefined,
    meta_adset_id: params.get('adset_id') || undefined,
    meta_campaign_id: params.get('campaign_id') || undefined,
  };
}

/**
 * Get Meta Pixel cookies (fbp, fbc)
 */
function getMetaCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {};
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return {
    fbp: cookies['_fbp'],
    fbc: cookies['_fbc'],
  };
}

interface InitSessionOptions {
  idea_id?: string;
  funnel_id?: string;
}

/**
 * Initialize or update a tracking session
 */
export async function initializeSession(options: InitSessionOptions = {}): Promise<{ success: boolean; session_id: string }> {
  const session_id = getSessionId();
  const trackingParams = parseTrackingParams();
  const metaCookies = getMetaCookies();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/funnel/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        idea_id: options.idea_id || 'everreach_waitlist',
        funnel_id: options.funnel_id || 'everreach_waitlist_v01',
        ...trackingParams,
        ...metaCookies,
        landing_url: typeof window !== 'undefined' ? window.location.href : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      }),
    });
    
    if (!response.ok) {
      console.error('[FunnelTracking] Failed to initialize session:', response.status);
      return { success: false, session_id };
    }
    
    return { success: true, session_id };
  } catch (error) {
    console.error('[FunnelTracking] Error initializing session:', error);
    return { success: false, session_id };
  }
}

interface TrackEventOptions {
  event_id?: string;
  [key: string]: any;
}

/**
 * Track a funnel event
 */
export async function trackFunnelEvent(
  eventName: string,
  properties: TrackEventOptions = {}
): Promise<{ success: boolean; event_id?: string }> {
  const session_id = getSessionId();
  const { event_id, ...eventProperties } = properties;
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/funnel/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        event_name: eventName,
        event_properties: eventProperties,
        event_id,
      }),
    });
    
    if (!response.ok) {
      console.error('[FunnelTracking] Failed to track event:', response.status);
      return { success: false };
    }
    
    const data = await response.json();
    return { success: true, event_id: data.event_id };
  } catch (error) {
    console.error('[FunnelTracking] Error tracking event:', error);
    return { success: false };
  }
}

interface WaitlistSignupData {
  email: string;
  pain_point?: string;
  network_size?: string;
  urgency?: string;
  event_id?: string;
}

interface WaitlistResponse {
  success: boolean;
  is_high_intent?: boolean;
  intent_score?: number;
  message?: string;
}

/**
 * Store a waitlist signup
 */
export async function storeWaitlistSignup(data: WaitlistSignupData): Promise<WaitlistResponse> {
  const session_id = getSessionId();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/funnel/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        ...data,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[FunnelTracking] Failed to store waitlist signup:', response.status, errorData);
      return { success: false };
    }
    
    const responseData = await response.json();
    return {
      success: true,
      is_high_intent: responseData.is_high_intent,
      intent_score: responseData.intent_score,
      message: responseData.message,
    };
  } catch (error) {
    console.error('[FunnelTracking] Error storing waitlist signup:', error);
    return { success: false };
  }
}

/**
 * Check if email is already on waitlist
 */
export async function checkWaitlistEmail(email: string): Promise<{ exists: boolean }> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/funnel/waitlist?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      return { exists: false };
    }
    
    const data = await response.json();
    return { exists: data.exists };
  } catch (error) {
    console.error('[FunnelTracking] Error checking waitlist email:', error);
    return { exists: false };
  }
}
