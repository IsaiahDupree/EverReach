/**
 * Meta Pixel client-side integration
 *
 * Usage:
 * import { trackMetaEvent } from '@/lib/meta-pixel-client';
 *
 * // Track an event
 * await trackMetaEvent('Purchase', {
 *   value: 99.99,
 *   currency: 'USD',
 *   userData: { email: 'user@example.com' },
 * });
 */

import { generateEventId } from '@/lib/meta-conversions';

interface TrackEventOptions {
  value?: number;
  currency?: string;
  userData?: {
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
  };
  customData?: Record<string, any>;
  testEventCode?: string;
}

/**
 * Track a Meta event via server-side API
 */
export async function trackMetaEvent(
  eventName: string,
  options: TrackEventOptions
): Promise<{ success: boolean; error?: string }> {
  // Check if Meta token is configured
  if (!process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN) {
    console.warn('[Meta] Conversions API token not configured, skipping event');
    return { success: false, error: 'Meta token not configured' };
  }

  const eventId = generateEventId(eventName.toLowerCase());

  try {
    const response = await fetch('/api/v1/events/meta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        eventId,
        value: options.value,
        currency: options.currency,
        userData: {
          ...options.userData,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        },
        customData: options.customData,
        testEventCode: options.testEventCode,
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error(`[Meta] Event error: ${data.error}`);
      return { success: false, error: data.error };
    }

    console.log(`[Meta] Event tracked: ${eventName}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Meta] Failed to track event: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Track a purchase event
 */
export async function trackPurchase(
  amount: number,
  options: {
    currency?: string;
    email?: string;
    customData?: Record<string, any>;
    testEventCode?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  return trackMetaEvent('Purchase', {
    value: amount,
    currency: options.currency || 'USD',
    userData: {
      email: options.email,
    },
    customData: {
      content_name: 'Subscription',
      ...options.customData,
    },
    testEventCode: options.testEventCode,
  });
}

/**
 * Track a subscription event
 */
export async function trackSubscribe(
  amount: number,
  planName: string,
  options: {
    currency?: string;
    email?: string;
    testEventCode?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  return trackMetaEvent('Subscribe', {
    value: amount,
    currency: options.currency || 'USD',
    userData: {
      email: options.email,
    },
    customData: {
      content_name: planName,
    },
    testEventCode: options.testEventCode,
  });
}

/**
 * Track a trial start event
 */
export async function trackStartTrial(
  options: {
    email?: string;
    trialDays?: number;
    testEventCode?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  return trackMetaEvent('StartTrial', {
    value: 0,
    currency: 'USD',
    userData: {
      email: options.email,
    },
    customData: {
      content_name: 'Free Trial',
      trial_days: options.trialDays || 7,
    },
    testEventCode: options.testEventCode,
  });
}

/**
 * Track a registration event
 */
export async function trackCompleteRegistration(
  options: {
    email?: string;
    method?: string;
    testEventCode?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  return trackMetaEvent('CompleteRegistration', {
    userData: {
      email: options.email,
    },
    customData: {
      content_name: 'Registration',
      registration_method: options.method || 'email',
    },
    testEventCode: options.testEventCode,
  });
}

/**
 * Track a lead event
 */
export async function trackLead(
  options: {
    email?: string;
    source?: string;
    testEventCode?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  return trackMetaEvent('Lead', {
    userData: {
      email: options.email,
    },
    customData: {
      content_name: 'Lead',
      source: options.source || 'app',
    },
    testEventCode: options.testEventCode,
  });
}

/**
 * Track a content view event
 */
export async function trackViewContent(
  contentName: string,
  options: {
    email?: string;
    contentType?: string;
    testEventCode?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  return trackMetaEvent('ViewContent', {
    userData: {
      email: options.email,
    },
    customData: {
      content_name: contentName,
      content_type: options.contentType || 'page',
    },
    testEventCode: options.testEventCode,
  });
}
