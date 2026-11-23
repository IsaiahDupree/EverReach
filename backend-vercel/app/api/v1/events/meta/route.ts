import { NextRequest, NextResponse } from 'next/server';
import { sendMetaEvent, normalizeUserData, createRevenueEvent, createFunnelEvent } from '@/lib/meta-conversions';
import { requireAuth } from '@/lib/auth-utils';

export const runtime = 'nodejs';

/**
 * POST /api/v1/events/meta
 *
 * Send server-side events to Meta Conversions API
 *
 * Request body:
 * {
 *   eventName: string;
 *   eventId: string;
 *   value?: number;
 *   currency?: string;
 *   userData: {
 *     email?: string;
 *     phone?: string;
 *     firstName?: string;
 *     lastName?: string;
 *     externalId?: string;
 *     userAgent?: string;
 *     clientIp?: string;
 *     fbp?: string;
 *     fbc?: string;
 *   };
 *   customData?: Record<string, any>;
 *   testEventCode?: string; // e.g., TEST6473
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   eventsReceived?: number;
 *   error?: string;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Require auth
    const auth = await requireAuth(req);
    if (!auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json() as any;

    const {
      eventName,
      eventId,
      value,
      currency,
      userData,
      customData,
      testEventCode,
    } = body;

    // Validate required fields
    if (!eventName || !eventId || !userData) {
      return NextResponse.json(
        { error: 'Missing required fields: eventName, eventId, userData' },
        { status: 400 }
      );
    }

    // Normalize user data with hashing
    const normalizedUserData = normalizeUserData({
      email: userData.email,
      phone: userData.phone,
      firstName: userData.firstName,
      lastName: userData.lastName,
      city: userData.city,
      state: userData.state,
      zip: userData.zip,
      country: userData.country,
      externalId: userData.externalId || auth.userId,
      userAgent: userData.userAgent,
      clientIp: userData.clientIp,
      fbp: userData.fbp,
      fbc: userData.fbc,
    });

    // Determine event type and create appropriate event
    let event;

    if (['Purchase', 'Subscribe', 'StartTrial'].includes(eventName)) {
      event = createRevenueEvent(eventName as 'Purchase' | 'Subscribe' | 'StartTrial', {
        eventId,
        value,
        currency,
        userData: normalizedUserData,
        customData,
      });
    } else {
      event = createFunnelEvent(eventName, {
        eventId,
        userData: normalizedUserData,
        customData,
      });
    }

    // Send to Meta
    const result = await sendMetaEvent(event, testEventCode);

    if (!result.success) {
      console.error('Meta event error:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to send event to Meta' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      eventsReceived: result.eventsReceived,
    });
  } catch (error: any) {
    console.error('Meta events endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Meta events endpoint' });
}
