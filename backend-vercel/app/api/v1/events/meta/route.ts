import { NextRequest } from 'next/server';
import { options, ok, badRequest, serverError } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';
import {
  generateEventId,
  trackPurchase,
  trackSubscribe,
  trackStartTrial,
  trackLead,
  trackCompleteRegistration,
  trackInitiateCheckout,
  trackViewContent,
  trackCustomEvent,
} from '@/lib/meta-conversions';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * POST /api/v1/events/meta
 * 
 * Send server-side events to Meta Conversions API
 * 
 * Body:
 * {
 *   event_name: string;  // Required: Purchase, Subscribe, Lead, CompleteRegistration, etc.
 *   event_id?: string;   // Optional: For deduplication with client-side pixel
 *   email?: string;      // Optional: User email (used if not authenticated)
 *   value?: number;      // Optional: Event value (for Purchase, Subscribe, InitiateCheckout)
 *   currency?: string;   // Optional: Currency code (default: USD)
 *   content_name?: string; // Optional: Content/plan name
 *   custom_data?: object;  // Optional: Additional custom data
 *   fbc?: string;        // Optional: Facebook click ID
 *   fbp?: string;        // Optional: Facebook browser ID
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_name, event_id, email: bodyEmail, value, currency, content_name, custom_data, fbc, fbp } = body;

    if (!event_name) {
      return badRequest('Missing event_name', req);
    }

    // Get user info if authenticated
    const user = await getUser(req);
    const userId = user?.id;
    
    // Try to get email from auth user profile or use body email
    let email = bodyEmail;
    if (userId && !email) {
      try {
        const supabase = getClientOrThrow(req);
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', userId)
          .maybeSingle();
        email = profile?.email;
      } catch (e) {
        // Profile lookup failed, continue without email
      }
    }

    // Extract client info from headers
    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || 
                      undefined;

    // Common params for all events
    const commonParams = {
      email,
      userId,
      eventId: event_id || generateEventId(),
      userAgent,
      ipAddress,
      fbc,
      fbp,
    };

    let result;

    // Route to appropriate handler based on event type
    switch (event_name) {
      case 'Purchase':
        result = await trackPurchase({
          ...commonParams,
          value: value || 0,
          currency: currency || 'USD',
          contentName: content_name || 'Subscription',
        });
        break;

      case 'Subscribe':
        result = await trackSubscribe({
          ...commonParams,
          value: value || 0,
          currency: currency || 'USD',
          planName: content_name || custom_data?.plan_name || 'Subscription',
          billingPeriod: custom_data?.billing_period || 'monthly',
        });
        break;

      case 'StartTrial':
        result = await trackStartTrial({
          ...commonParams,
          trialDays: custom_data?.trial_days || 7,
        });
        break;

      case 'Lead':
        result = await trackLead({
          ...commonParams,
          contentName: content_name || 'Waitlist',
        });
        break;

      case 'CompleteRegistration':
        result = await trackCompleteRegistration({
          ...commonParams,
          registrationMethod: custom_data?.registration_method || 'email',
        });
        break;

      case 'InitiateCheckout':
        result = await trackInitiateCheckout({
          ...commonParams,
          value: value || 0,
          currency: currency || 'USD',
          planName: content_name || custom_data?.plan_name || 'Subscription',
        });
        break;

      case 'ViewContent':
        result = await trackViewContent({
          ...commonParams,
          contentName: content_name || custom_data?.content_name || 'Page',
        });
        break;

      default:
        // Custom event
        result = await trackCustomEvent({
          ...commonParams,
          eventName: event_name,
          customData: {
            value,
            currency,
            content_name,
            ...custom_data,
          },
        });
    }

    if (!result.success) {
      console.error('[Meta Events API] Failed to send event:', result.error);
      return serverError(result.error || 'Failed to send event', req);
    }

    return ok({
      success: true,
      event_name,
      event_id: commonParams.eventId,
      events_received: result.events_received,
      fbtrace_id: result.fbtrace_id,
    }, req);

  } catch (error: any) {
    console.error('[Meta Events API] Error:', error);
    return serverError("Internal server error", req);
  }
}

/**
 * GET /api/v1/events/meta
 * 
 * Health check / info endpoint
 */
export async function GET(req: NextRequest) {
  const hasToken = !!process.env.META_CONVERSIONS_API_TOKEN;
  const pixelId = process.env.EXPO_PUBLIC_META_PIXEL_ID || '1191876055285693';
  const testMode = !!process.env.META_TEST_EVENT_CODE;

  return ok({
    status: 'ok',
    pixel_id: pixelId,
    token_configured: hasToken,
    test_mode: testMode,
    supported_events: [
      'Purchase',
      'Subscribe',
      'StartTrial',
      'Lead',
      'CompleteRegistration',
      'InitiateCheckout',
      'ViewContent',
      'Custom events (any name)',
    ],
  }, req);
}
