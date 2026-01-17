/**
 * Analytics Ingest Proxy
 * Proxies PostHog events to beat ad-blockers
 * 
 * POST /api/ingest
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
const POSTHOG_PROJECT_KEY = process.env.POSTHOG_PROJECT_KEY;

// Rate limiting (simple in-memory, move to Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetAt) {
    // Reset or create new limit (100 requests per minute)
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + 60000, // 1 minute
    });
    return true;
  }

  if (limit.count >= 100) {
    return false; // Rate limit exceeded
  }

  limit.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const real = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || real || 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    // Get client IP
    const clientIp = getClientIp(req);

    // Rate limit check
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Validate PostHog is configured
    if (!POSTHOG_PROJECT_KEY) {
      console.error('[Ingest] PostHog not configured');
      return NextResponse.json(
        { error: 'Analytics not configured' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await req.json();

    // Validate batch format
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Forward to PostHog
    const posthogResponse = await fetch(`${POSTHOG_HOST}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers.get('user-agent') || 'EverReach-Proxy/1.0',
      },
      body: JSON.stringify({
        ...body,
        api_key: POSTHOG_PROJECT_KEY,
      }),
    });

    // Return PostHog response
    if (posthogResponse.ok) {
      return new NextResponse(await posthogResponse.text(), {
        status: posthogResponse.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      console.error('[Ingest] PostHog error:', posthogResponse.status);
      return NextResponse.json(
        { error: 'Analytics service error' },
        { status: posthogResponse.status }
      );
    }
  } catch (error) {
    console.error('[Ingest] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
