import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * POST /v1/testing/subscription/set
 * 
 * ADMIN ONLY - Set subscription state for testing
 * 
 * Simulates subscription states without touching actual payment providers.
 * Useful for QA testing trial expiry, payment failures, etc.
 * 
 * Security: Requires ADMIN_TEST_TOKEN header
 */
export async function POST(req: NextRequest) {
  // Admin auth check
  const adminToken = req.headers.get('x-admin-token');
  if (adminToken !== process.env.ADMIN_TEST_TOKEN) {
    return unauthorized('Admin token required', req);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON', req);
  }

  const {
    userId,
    subscriptionStatus, // Enhanced status: TRIAL_ACTIVE, ACTIVE, ACTIVE_CANCELED, etc.
    tier,                // Tier: free, core, pro, team, lifetime
    trialEndsAt,
    currentPeriodEnd,
    graceEndsAt,
    canceledAt,
    pausedAt,
    billingSource,
    productId,
  } = body;

  if (!userId) {
    return badRequest('userId required', req);
  }

  const supabase = getClientOrThrow(req);

  try {
    // Determine product_id from tier if not provided
    const derivedProductId = productId || 
      (tier === 'lifetime' ? 'com.everreach.lifetime' :
       tier === 'team' ? 'com.everreach.team.monthly' :
       tier === 'pro' ? 'com.everreach.pro.monthly' :
       tier === 'core' ? 'com.everreach.core.monthly' :
       'com.everreach.free');

    // Create/update user_subscriptions record for testing
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        status: subscriptionStatus || 'ACTIVE',
        platform: billingSource || 'app_store',
        product_id: derivedProductId,
        trial_ends_at: trialEndsAt || null,
        current_period_end: currentPeriodEnd || null,
        grace_ends_at: graceEndsAt || null,
        canceled_at: canceledAt || null,
        paused_at: pausedAt || null,
        environment: 'SANDBOX',
        original_transaction_id: `test_${userId}_${Date.now()}`,
        transaction_id: `test_${userId}_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (subError) {
      console.error('[Test Subscription] Subscription upsert error:', subError);
      return serverError(`Failed to update subscription: ${subError.message}`, req);
    }

    return ok({
      success: true,
      message: 'Test subscription state set',
      userId,
      appliedState: {
        subscriptionStatus: subscriptionStatus || 'ACTIVE',
        tier: tier || 'free',
        trialEndsAt: trialEndsAt || null,
        currentPeriodEnd: currentPeriodEnd || null,
        graceEndsAt: graceEndsAt || null,
        canceledAt: canceledAt || null,
        pausedAt: pausedAt || null,
        billingSource: billingSource || 'app_store',
        productId: derivedProductId,
      },
    }, req);

  } catch (error: any) {
    console.error('[Test Subscription] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}
