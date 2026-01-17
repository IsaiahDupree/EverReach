import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * POST /v1/testing/subscription/reset
 * 
 * ADMIN ONLY - Reset subscription to default state
 * 
 * Removes all test overrides and resets subscription to default state.
 * Useful for cleaning up after testing.
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

  const { userId } = body;

  if (!userId) {
    return badRequest('userId required', req);
  }

  const supabase = getClientOrThrow(req);

  try {
    // Reset profiles to default trial state
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'trialing',
        current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('[Reset Subscription] Profile update error:', profileError);
      return serverError(`Failed to reset profile: ${profileError.message}`, req);
    }

    // Delete test subscription records
    await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);

    return ok({
      success: true,
      message: 'Subscription reset to default trial state',
      userId,
      resetState: {
        subscriptionStatus: 'trialing',
        trialDays: 14,
      },
    }, req);

  } catch (error: any) {
    console.error('[Reset Subscription] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}
