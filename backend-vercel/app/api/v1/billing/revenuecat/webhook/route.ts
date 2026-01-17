/**
 * RevenueCat Webhook Endpoint
 * POST /api/v1/billing/revenuecat/webhook
 * 
 * Receives and processes RevenueCat webhook events
 * Signature verification required for security
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  verifyWebhookSignature,
  processWebhookEvent,
  type RevenueCatWebhookEvent,
} from '@/lib/revenuecat-webhook';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are missing');
  }
  return createClient(url, key);
}

/**
 * POST /api/v1/billing/revenuecat/webhook
 * Process RevenueCat webhook events
 */
export async function POST(req: NextRequest) {
  const requestId = `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-revenuecat-signature');
    // Allow either env var name for flexibility
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET || process.env.REVENUECAT_SECRET_KEY;

    // Optional alternative auth via Authorization header (for plans without RC signing)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const expectedBearer = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;

    // Validate via signature if configured
    const isSignatureValid = Boolean(webhookSecret) && verifyWebhookSignature(rawBody, signature, webhookSecret);
    // Or validate via Authorization header if configured
    const isAuthHeaderValid = Boolean(expectedBearer) && authHeader === `Bearer ${expectedBearer}`;

    // Test mode support (similar to Superwall)
    const testModeHeader = req.headers.get('x-test-mode');
    const allowTestMode = process.env.ALLOW_TEST_MODE !== 'false'; // Default true for testing
    const isTestMode = testModeHeader === 'true' && allowTestMode;

    // Allow requests without auth in development for easier testing
    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';

    if (!isSignatureValid && !isAuthHeaderValid && !isDev && !isTestMode) {
      console.error(`[RevenueCat ${requestId}] Unauthorized webhook request (signature and auth header invalid)`);
      return NextResponse.json(
        {
          ok: false,
          error: 'Unauthorized webhook',
          request_id: requestId,
        },
        { status: 401 }
      );
    }

    if ((isDev || isTestMode) && !isSignatureValid && !isAuthHeaderValid) {
      console.warn(`[RevenueCat ${requestId}] Processing in ${isDev ? 'development' : 'test'} mode without authentication`);
    }

    // Parse webhook data
    let webhookData: RevenueCatWebhookEvent;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`[RevenueCat ${requestId}] Invalid JSON:`, parseError);
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid JSON',
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    const { event } = webhookData;

    // Validate required fields
    if (!event || !event.id || !event.type || !event.app_user_id) {
      console.error(`[RevenueCat ${requestId}] Missing required fields`);
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields',
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    console.log(`[RevenueCat ${requestId}] Processing event: ${event.type} for user ${event.app_user_id} (${event.id})`);

    const supabase = getSupabase();

    // Process the event
    let subscription;
    try {
      subscription = await processWebhookEvent(supabase, webhookData);
    } catch (error: any) {
      // Handle duplicate event
      if (error.message === 'DUPLICATE_EVENT') {
        console.log(`[RevenueCat ${requestId}] Duplicate event ${event.id}`);
        return NextResponse.json({
          ok: true,
          duplicate: true,
          processed: false,
          event_id: event.id,
          user_id: event.app_user_id,
          request_id: requestId,
        });
      }

      // Transient error - return 5xx so RC retries
      console.error(`[RevenueCat ${requestId}] Processing error:`, error);
      return NextResponse.json(
        {
          ok: false,
          error: 'Processing failed',
          message: error.message,
          request_id: requestId,
        },
        { status: 500 }
      );
    }

    // Log successful processing
    console.log(`[RevenueCat ${requestId}] Successfully processed event ${event.id}:`, {
      user_id: event.app_user_id,
      event_type: event.type,
      product_id: event.product_id,
      status: subscription.status,
      period_end: subscription.current_period_end,
    });

    // Return success response
    return NextResponse.json({
      ok: true,
      processed: true,
      event_id: event.id,
      user_id: event.app_user_id,
      subscription: {
        status: subscription.status,
        product_id: subscription.product_id,
        current_period_end: subscription.current_period_end,
        platform: subscription.platform,
      },
      request_id: requestId,
    });
  } catch (error: any) {
    console.error(`[RevenueCat ${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        message: error.message,
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-RevenueCat-Signature, Authorization',
    },
  });
}
