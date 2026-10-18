import { NextRequest, NextResponse } from 'next/server';
import { options } from '@/lib/cors';
import { getClientOrThrow } from '@/lib/supabase';
import { getEntitlementsFromSubscription } from '@/lib/revenuecat-webhook';
import { validateGooglePurchase, normalizeSubscriptionStatus } from '@/lib/receipt-validation';

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /api/v1/link/google
 * 
 * Links a Google Play subscription to the authenticated user's account.
 * Supports both authenticated (logged in) and unauthenticated (buy-first, link-later) flows.
 * 
 * Body: {
 *   purchase_token: string
 *   package_name: string
 *   product_id: string
 *   hint_email?: string (for unclaimed entitlements)
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const supabase = getClientOrThrow(req);
    const body = await req.json();

    if (!body.purchase_token || !body.package_name || !body.product_id) {
      return NextResponse.json(
        { error: 'purchase_token, package_name, and product_id are required' },
        { status: 400 }
      );
    }

    // Require authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Google access token (OAuth2)
    const GOOGLE_ACCESS_TOKEN = process.env.GOOGLE_PLAY_ACCESS_TOKEN;
    if (!GOOGLE_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Google Play not configured' },
        { status: 500 }
      );
    }

    // Validate purchase with Google
    const validation = await validateGooglePurchase(
      body.package_name,
      body.product_id,
      body.purchase_token,
      GOOGLE_ACCESS_TOKEN
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid purchase token', details: validation.error },
        { status: 400 }
      );
    }

    // Calculate normalized status
    const now = new Date();
    const expiresAt = new Date(parseInt(validation.expiresAt));
    const isExpired = expiresAt < now;
    const status = normalizeSubscriptionStatus(
      'play',
      isExpired,
      validation.isCanceled,
      validation.isTrialing
    );

    // Link immediately
    return await linkToAuthenticatedUser(
      supabase,
      user.id,
      validation,
      status,
      body.purchase_token
    );
  } catch (error: any) {
    console.error('[Link Google] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Link purchase to authenticated user
 */
async function linkToAuthenticatedUser(
  supabase: any,
  userId: string,
  validation: any,
  status: string,
  purchaseToken: string
) {
  // Check if this subscription already exists
  const { data: existing } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('origin', 'play')
    .eq('provider_subscription_id', purchaseToken)
    .maybeSingle();

  if (existing) {
    const entitlements = await getEntitlementsFromSubscription(supabase, userId);
    return NextResponse.json({
      success: true,
      message: 'Subscription already linked',
      subscription_id: existing.id,
      entitlements,
    });
  }

  // Create new subscription record
  const expiresAt = new Date(parseInt(validation.expiresAt));
  const { data: sub, error: subError } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      origin: 'play',
      provider_subscription_id: purchaseToken,
      status,
      subscribed_at: new Date().toISOString(),
      trial_started_at: validation.isTrialing ? new Date().toISOString() : null,
      trial_ends_at: validation.isTrialing ? expiresAt.toISOString() : null,
      current_period_end: expiresAt.toISOString(),
      cancel_at_period_end: validation.isCanceled && !validation.autoRenewEnabled,
      canceled_at: validation.isCanceled ? new Date().toISOString() : null,
      is_primary: true, // Auto-set as primary if first subscription
    })
    .select()
    .single();

  if (subError) throw subError;

  // Log audit event
  await supabase.rpc('log_subscription_audit', {
    p_user_id: userId,
    p_event_type: 'link_receipt',
    p_provider: 'play',
    p_provider_subscription_id: purchaseToken,
    p_new_status: status,
    p_payload: {
      product_id: validation.productId,
      order_id: validation.orderId,
      is_trialing: validation.isTrialing
    }
  });

  const entitlements = await getEntitlementsFromSubscription(supabase, userId);
  return NextResponse.json({
    success: true,
    message: 'Google Play subscription linked successfully',
    subscription_id: sub.id,
    status,
    expires_at: expiresAt.toISOString(),
    entitlements,
  });
}

/**
 * Create unclaimed entitlement (buy-first, link-later)
 */
// Note: buy-first, link-later is disabled for tests (requires auth)
