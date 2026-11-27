/**
 * Meta Pixel Integration with Event Deduplication
 * Handles both client-side Pixel and prepares for server-side CAPI
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const META_PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID || '';

/**
 * Generate a unique event ID for deduplication
 */
function generateEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if Meta Pixel is loaded
 */
function isPixelLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/**
 * Initialize Meta Pixel
 * Call this once on app load
 */
export function initMetaPixel(pixelId?: string): void {
  if (typeof window === 'undefined') return;
  
  const id = pixelId || META_PIXEL_ID;
  if (!id) {
    console.warn('[MetaPixel] No Pixel ID provided');
    return;
  }
  
  // Check if already initialized
  if (isPixelLoaded()) {
    return;
  }
  
  // Initialize Facebook Pixel
  (function(f: any, b: Document, e: string, v: string, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  
  window.fbq?.('init', id);
  window.fbq?.('track', 'PageView');
}

interface TrackEventParams {
  event_id?: string;
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  predicted_ltv?: number;
  status?: string;
  [key: string]: any;
}

/**
 * Track a Meta Pixel event with deduplication support
 * Returns the event_id for use with server-side CAPI
 */
export function trackEvent(
  eventName: string,
  params: TrackEventParams = {}
): string | null {
  // Generate event_id for deduplication if not provided
  const eventId = params.event_id || generateEventId();
  
  if (!isPixelLoaded()) {
    console.warn('[MetaPixel] Pixel not loaded, event not tracked:', eventName);
    return eventId;
  }
  
  try {
    // Standard Meta Pixel parameters
    const pixelParams: Record<string, any> = {
      ...params,
      eventID: eventId, // Meta's deduplication key
    };
    
    // Remove our custom event_id to avoid confusion
    delete pixelParams.event_id;
    
    // Track the event
    window.fbq?.('track', eventName, pixelParams);
    
    console.log('[MetaPixel] Event tracked:', eventName, { eventId });
    
    return eventId;
  } catch (error) {
    console.error('[MetaPixel] Error tracking event:', error);
    return eventId;
  }
}

/**
 * Track PageView event
 */
export function trackPageView(): string | null {
  return trackEvent('PageView');
}

/**
 * Track Lead event (waitlist signup)
 */
export function trackLead(params: {
  value?: number;
  currency?: string;
  content_name?: string;
  event_id?: string;
} = {}): string | null {
  return trackEvent('Lead', {
    currency: params.currency || 'USD',
    ...params,
  });
}

/**
 * Track CompleteRegistration event (thank you page)
 */
export function trackCompleteRegistration(params: {
  value?: number;
  currency?: string;
  content_name?: string;
  status?: string;
  event_id?: string;
} = {}): string | null {
  return trackEvent('CompleteRegistration', {
    currency: params.currency || 'USD',
    status: params.status || 'registered',
    ...params,
  });
}

/**
 * Track ViewContent event (viewing playbook, etc.)
 */
export function trackViewContent(params: {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  event_id?: string;
} = {}): string | null {
  return trackEvent('ViewContent', {
    currency: params.currency || 'USD',
    ...params,
  });
}

/**
 * Track custom event
 */
export function trackCustomEvent(
  eventName: string,
  params: TrackEventParams = {}
): string | null {
  if (!isPixelLoaded()) {
    console.warn('[MetaPixel] Pixel not loaded, custom event not tracked:', eventName);
    return null;
  }
  
  const eventId = params.event_id || generateEventId();
  
  try {
    window.fbq?.('trackCustom', eventName, {
      ...params,
      eventID: eventId,
    });
    
    return eventId;
  } catch (error) {
    console.error('[MetaPixel] Error tracking custom event:', error);
    return eventId;
  }
}

/**
 * Track InitiateCheckout event
 */
export function trackInitiateCheckout(params: {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  event_id?: string;
} = {}): string | null {
  return trackEvent('InitiateCheckout', {
    currency: params.currency || 'USD',
    ...params,
  });
}

/**
 * Track Purchase event
 */
export function trackPurchase(params: {
  value: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  event_id?: string;
}): string | null {
  return trackEvent('Purchase', {
    currency: params.currency || 'USD',
    ...params,
  });
}
