import { options, ok, unauthorized, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * DELETE /api/v1/me/subscription
 * Cancels the user's subscription and resets entitlements to free tier
 */
export async function DELETE(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const supabase = getClientOrThrow(req);

  try {
    // Reset entitlements to free tier
    const { error } = await supabase
      .from('entitlements')
      .upsert({
        user_id: user.id,
        plan: 'free',
        valid_until: null,
        source: 'manual',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('[Subscription DELETE] Error updating entitlements:', error);
      return badRequest('Failed to cancel subscription', req);
    }

    return ok({ 
      message: 'Subscription cancelled successfully',
      plan: 'free',
      cancelled_at: new Date().toISOString()
    }, req);
  } catch (err) {
    console.error('[Subscription DELETE] Unexpected error:', err);
    return badRequest('Failed to cancel subscription', req);
  }
}

/**
 * POST /api/v1/me/subscription/reset
 * Dev endpoint to reset subscription state for testing
 */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const supabase = getClientOrThrow(req);
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  try {
    if (action === 'reset_to_free') {
      // Reset to free tier
      const { error } = await supabase
        .from('entitlements')
        .upsert({
          user_id: user.id,
          plan: 'free',
          valid_until: null,
          source: 'manual',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      return ok({ 
        message: 'Subscription reset to free tier',
        plan: 'free'
      }, req);
    } else if (action === 'set_pro') {
      // Set to pro tier (for testing)
      const { error } = await supabase
        .from('entitlements')
        .upsert({
          user_id: user.id,
          plan: 'pro',
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          source: body.source || 'manual',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      return ok({ 
        message: 'Subscription set to pro tier',
        plan: 'pro'
      }, req);
    } else {
      return badRequest('Invalid action. Use "reset_to_free" or "set_pro"', req);
    }
  } catch (err) {
    console.error('[Subscription POST] Error:', err);
    return badRequest('Failed to update subscription', req);
  }
}
