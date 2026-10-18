/**
 * Meta Server-Side Events - Frontend Helper
 * 
 * Sends events to our backend, which forwards them to Meta Conversions API.
 * This provides better attribution than client-side pixel alone.
 */

import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';
import { getFbc, getFbp } from '@/lib/metaPixel';

// Only run on web
const IS_WEB = Platform.OS === 'web';

export type MetaEventName = 
  | 'Purchase'
  | 'Subscribe'
  | 'StartTrial'
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'ViewContent'
  | 'ContactImported'
  | 'VoiceNoteCreated'
  | 'TrialExpired';

export interface MetaEventUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  externalId?: string; // User ID
}

export interface MetaEventCustomData {
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  billingPeriod?: 'monthly' | 'annual';
  planTier?: string;
  trialDays?: number;
  registrationMethod?: string;
  contactCount?: number;
  [key: string]: any;
}

/**
 * Generate a unique event ID for deduplication between client and server
 */
function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Send a server-side event to Meta via our backend
 */
export async function sendServerEvent(
  eventName: MetaEventName,
  userData: MetaEventUserData,
  customData?: MetaEventCustomData,
  eventId?: string
): Promise<{ success: boolean; eventId: string }> {
  // Skip on non-web platforms
  if (!IS_WEB) {
    return { success: false, eventId: eventId || '' };
  }

  const finalEventId = eventId || generateEventId();

  try {
    // Get Facebook click/browser IDs if available
    const fbc = getFbc();
    const fbp = getFbp();

    const response = await apiFetch('/api/v1/events/meta', {
      method: 'POST',
      body: JSON.stringify({
        eventName,
        eventId: finalEventId,
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        userData: {
          ...userData,
          clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          fbc: fbc || undefined,
          fbp: fbp || undefined,
        },
        customData,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[MetaServerEvents] Failed:', error);
      return { success: false, eventId: finalEventId };
    }

    const result = await response.json();
    console.log('[MetaServerEvents] Success:', eventName, result.eventId);
    return { success: true, eventId: result.eventId || finalEventId };
  } catch (error) {
    console.error('[MetaServerEvents] Error sending event:', error);
    return { success: false, eventId: finalEventId };
  }
}

/**
 * Track both client-side pixel AND server-side event for deduplication
 */
export async function trackEventDual(
  eventName: MetaEventName,
  userData: MetaEventUserData,
  customData?: MetaEventCustomData
): Promise<void> {
  if (!IS_WEB) return;

  // Generate a shared event ID for deduplication
  const eventId = generateEventId();

  // Fire client-side pixel (if available)
  if (typeof window !== 'undefined' && (window as any).fbq) {
    try {
      (window as any).fbq('track', eventName, {
        ...customData,
        eventID: eventId, // Facebook uses this for deduplication
      });
      console.log('[MetaServerEvents] Client pixel fired:', eventName);
    } catch (e) {
      console.error('[MetaServerEvents] Client pixel error:', e);
    }
  }

  // Fire server-side event (async, don't await to avoid blocking)
  sendServerEvent(eventName, userData, customData, eventId).catch(console.error);
}

// ============================================
// Convenience functions for common events
// ============================================

/**
 * Track waitlist signup
 */
export function trackLeadEvent(email: string, source?: string): void {
  trackEventDual(
    'Lead',
    { email },
    { contentName: source || 'Waitlist' }
  );
}

/**
 * Track account registration
 */
export function trackRegistrationEvent(
  email: string,
  userId?: string,
  method: 'email' | 'google' | 'apple' = 'email'
): void {
  trackEventDual(
    'CompleteRegistration',
    { email, externalId: userId },
    { registrationMethod: method, contentName: 'Account Created' }
  );
}

/**
 * Track trial start
 */
export function trackTrialStartEvent(
  email: string,
  userId?: string,
  trialDays: number = 7
): void {
  trackEventDual(
    'StartTrial',
    { email, externalId: userId },
    { value: 0, currency: 'USD', trialDays, contentName: 'Free Trial' }
  );
}

/**
 * Track checkout initiation
 */
export function trackCheckoutEvent(
  email: string,
  userId: string,
  planName: string,
  price: number,
  billingPeriod: 'monthly' | 'annual'
): void {
  trackEventDual(
    'InitiateCheckout',
    { email, externalId: userId },
    { value: price, currency: 'USD', contentName: planName, billingPeriod }
  );
}

/**
 * Track successful purchase
 */
export function trackPurchaseEvent(
  email: string,
  userId: string,
  planName: string,
  price: number,
  billingPeriod: 'monthly' | 'annual'
): void {
  trackEventDual(
    'Purchase',
    { email, externalId: userId },
    { value: price, currency: 'USD', contentName: planName, billingPeriod }
  );
}

/**
 * Track pricing page view
 */
export function trackViewPricingEvent(email?: string, userId?: string): void {
  trackEventDual(
    'ViewContent',
    { email, externalId: userId },
    { contentName: 'Pricing Page', contentCategory: 'subscription' }
  );
}

/**
 * Track contact import
 */
export function trackContactImportEvent(
  email: string,
  userId: string,
  contactCount: number
): void {
  trackEventDual(
    'ContactImported',
    { email, externalId: userId },
    { contactCount, contentName: 'Contact Import' }
  );
}

/**
 * Track first voice note
 */
export function trackVoiceNoteEvent(email: string, userId: string): void {
  trackEventDual(
    'VoiceNoteCreated',
    { email, externalId: userId },
    { contentName: 'Voice Note' }
  );
}
