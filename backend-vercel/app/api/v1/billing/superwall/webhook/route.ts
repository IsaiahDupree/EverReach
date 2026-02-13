/**
 * Superwall Webhook Endpoint
 * POST /api/v1/billing/superwall/webhook
 * 
 * Receives and processes Superwall webhook events
 * Tracks ALL subscription events from Superwall
 * Integrates with existing RevenueCat subscription system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import {
  verifySuperwallSignature,
  processSuperwallEvent,
  type SuperwallWebhookEvent,
} from '@/lib/superwall-webhook';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max


/**
 * POST /api/v1/billing/superwall/webhook
 * Process Superwall webhook events
 */
export async function POST(req: NextRequest) {
  const requestId = `sw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const webhookSecret = process.env.SUPERWALL_WEBHOOK_SECRET;

    // Svix headers (used by Superwall)
    const svixHeaders = {
      id: req.headers.get('svix-id'),
      timestamp: req.headers.get('svix-timestamp'),
      signature: req.headers.get('svix-signature'),
    };
    
    // Legacy header support
    const legacySignature = req.headers.get('x-superwall-signature') || req.headers.get('X-Superwall-Signature');

    // Alternative auth via Authorization header (if no signature configured)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const expectedBearer = process.env.SUPERWALL_WEBHOOK_AUTH_TOKEN;

    // Log incoming webhook for debugging
    console.log(`[Superwall ${requestId}] Webhook received`);
    console.log(`[Superwall ${requestId}] Svix headers present:`, { id: !!svixHeaders.id, timestamp: !!svixHeaders.timestamp, signature: !!svixHeaders.signature });
    console.log(`[Superwall ${requestId}] Legacy signature present:`, !!legacySignature);
    console.log(`[Superwall ${requestId}] Secret configured:`, !!webhookSecret);
    console.log(`[Superwall ${requestId}] Auth header present:`, !!authHeader);
    
    // Validate via Svix signature (primary method for Superwall)
    const isSignatureValid = Boolean(webhookSecret) && verifySuperwallSignature(rawBody, svixHeaders, webhookSecret);
    // Or validate via Authorization header if configured (check both dedicated token AND webhook secret)
    const isAuthHeaderValid = Boolean(expectedBearer) && authHeader === `Bearer ${expectedBearer}`;
    // Also accept webhook secret as Bearer token for simpler integration
    const isSecretAsBearerValid = Boolean(webhookSecret) && authHeader === `Bearer ${webhookSecret}`;

    console.log(`[Superwall ${requestId}] Svix signature valid:`, isSignatureValid);
    console.log(`[Superwall ${requestId}] Auth header valid:`, isAuthHeaderValid);
    console.log(`[Superwall ${requestId}] Secret as bearer valid:`, isSecretAsBearerValid);

    // Allow requests without auth in development for easier testing
    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
    
    // Test mode support (similar to warmth time-travel)
    const testModeHeader = req.headers.get('x-test-mode');
    const allowTestMode = process.env.ALLOW_TEST_MODE !== 'false'; // Default true for testing
    const isTestMode = testModeHeader === 'true' && allowTestMode;
    
    // Fail-closed: reject in production when no secret is configured
    const noSecretConfigured = !webhookSecret && !expectedBearer;
    if (noSecretConfigured && !isDev) {
      console.error(`[Superwall ${requestId}] SUPERWALL_WEBHOOK_SECRET and SUPERWALL_WEBHOOK_AUTH_TOKEN not set — rejecting in production`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', request_id: requestId },
        { status: 500 }
      );
    }
    
    console.log(`[Superwall ${requestId}] isDev:`, isDev, 'isTestMode:', isTestMode);
    
    // Accept any valid auth method (dev/test allowed without signature)
    const isAuthenticated = isSignatureValid || isAuthHeaderValid || isSecretAsBearerValid || isDev || isTestMode;
    
    if (!isAuthenticated) {
      console.error(`[Superwall ${requestId}] Unauthorized webhook request - all auth methods failed`);
      console.error(`[Superwall ${requestId}] Svix signature received:`, svixHeaders.signature?.substring(0, 30) + '...');
      console.error(`[Superwall ${requestId}] Legacy signature received:`, legacySignature?.substring(0, 30) + '...');
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
      console.warn(`[Superwall ${requestId}] Processing in ${isDev ? 'development' : 'test'} mode without authentication`);
    }

    // Parse webhook data
    let webhookData: SuperwallWebhookEvent;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`[Superwall ${requestId}] Invalid JSON:`, parseError);
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid JSON',
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!webhookData.event_name || !webhookData.user_id || !webhookData.timestamp) {
      console.error(`[Superwall ${requestId}] Missing required fields`, webhookData);
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields (event_name, user_id, timestamp)',
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    console.log(`[Superwall ${requestId}] Processing event: ${webhookData.event_name} for user ${webhookData.user_id}`);

    const supabase = getServiceClient();

    // Process the event
    let result;
    try {
      result = await processSuperwallEvent(supabase, webhookData);
    } catch (error: any) {
      // Handle duplicate event
      if (error.message === 'DUPLICATE_EVENT') {
        console.log(`[Superwall ${requestId}] Duplicate event for user ${webhookData.user_id}`);
        return NextResponse.json({
          ok: true,
          duplicate: true,
          processed: false,
          event_name: webhookData.event_name,
          user_id: webhookData.user_id,
          request_id: requestId,
        });
      }

      // Transient error - return 5xx so Superwall retries
      console.error(`[Superwall ${requestId}] Processing error:`, error);
      return NextResponse.json(
        {
          ok: false,
          error: 'Processing failed',
          request_id: requestId,
        },
        { status: 500 }
      );
    }

    // Log successful processing
    console.log(`[Superwall ${requestId}] Successfully processed event ${webhookData.event_name}:`, {
      user_id: webhookData.user_id,
      event_name: webhookData.event_name,
      updated: result.updated !== false,
      subscription_status: result.status,
    });

    // Return success response
    return NextResponse.json({
      ok: true,
      processed: true,
      event_name: webhookData.event_name,
      user_id: webhookData.user_id,
      subscription: result.status ? {
        status: result.status,
        product_id: result.product_id,
        platform: result.platform,
      } : undefined,
      request_id: requestId,
    });
  } catch (error: any) {
    console.error(`[Superwall ${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Superwall-Signature, Authorization',
    },
  });
}
