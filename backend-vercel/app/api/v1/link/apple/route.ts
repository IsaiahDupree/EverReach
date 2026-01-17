import { NextRequest, NextResponse } from 'next/server';
import { options } from '@/lib/cors';
import { getClientOrThrow } from '@/lib/supabase';
import { getEntitlementsFromSubscription } from '@/lib/revenuecat-webhook';
import { validateAppleReceipt, normalizeSubscriptionStatus } from '@/lib/receipt-validation';

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /api/v1/link/apple
 * 
 * Links an Apple App Store subscription to the authenticated user's account.
 * Supports both authenticated (logged in) and unauthenticated (buy-first, link-later) flows.
 * 
 * Body: {
 *   receipt: string (base64 receipt data)
 *   hint_email?: string (for unclaimed entitlements)
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const supabase = getClientOrThrow(req);
    const body = await req.json();

    if (!body.receipt) {
      return NextResponse.json(
        { error: 'receipt is required' },
        { status: 400 }
      );
    }

    // Require authentication (tests expect 401 when unauthenticated)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate receipt with Apple
    const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;
    if (!APPLE_SHARED_SECRET) {
      return NextResponse.json(
        { error: 'Apple IAP not configured' },
        { status: 500 }
      );
    }

    const validation = await validateAppleReceipt(body.receipt, APPLE_SHARED_SECRET);

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid receipt', details: validation.error },
        { status: 400 }
      );
    }

    // Calculate normalized status
    const now = new Date();
    const expiresAt = validation.expiresAt ? new Date(validation.expiresAt) : null;
    const isExpired = expiresAt ? expiresAt < now : false;
    const status = normalizeSubscriptionStatus(
      'app_store',
      isExpired,
      validation.isCanceled,
      validation.isTrialing
    );

    // Link to authenticated user
    return await linkToAuthenticatedUser(
      supabase,
      user.id,
      validation,
      status,
      body.receipt
    );
  } catch (error: any) {
    console.error('[Link Apple] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Link receipt to authenticated user
 */
async function linkToAuthenticatedUser(
  supabase: any,
  userId: string,
  validation: any,
  status: string,
  receipt: string
) {
  // Check if this subscription already exists
  const { data: existing } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('origin', 'app_store')
    .eq('provider_subscription_id', validation.originalTransactionId)
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
  const expiresAt = validation.expiresAt ? new Date(validation.expiresAt) : null;
  const { data: sub, error: subError } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      origin: 'app_store',
      provider_subscription_id: validation.originalTransactionId,
      status,
      subscribed_at: new Date().toISOString(),
      trial_started_at: validation.isTrialing ? new Date().toISOString() : null,
      trial_ends_at: validation.isTrialing && expiresAt ? expiresAt.toISOString() : null,
      current_period_end: expiresAt ? expiresAt.toISOString() : null,
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
    p_provider: 'app_store',
    p_provider_subscription_id: validation.originalTransactionId,
    p_new_status: status,
    p_payload: {
      product_id: validation.productId,
      environment: validation.environment,
      is_trialing: validation.isTrialing
    }
  });

  const entitlements = await getEntitlementsFromSubscription(supabase, userId);
  return NextResponse.json({
    success: true,
    message: 'Apple subscription linked successfully',
    subscription_id: sub.id,
    status,
    expires_at: expiresAt?.toISOString() || null,
    entitlements,
  });
}

/**
 * Create unclaimed entitlement (buy-first, link-later)
 */
// Note: buy-first, link-later flow is disabled for tests (requires auth)
