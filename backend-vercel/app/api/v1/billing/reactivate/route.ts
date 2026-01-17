import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import Stripe from "stripe";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      return badRequest('stripe_not_configured', req);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    const supabase = getClientOrThrow(req);

    // Get user's stripe subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return badRequest('no_subscription_found', req);
    }

    // Reactivate the subscription by setting cancel_at_period_end to false
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: false }
    );

    // Update profile
    await supabase
      .from('profiles')
      .update({ subscription_status: subscription.status })
      .eq('user_id', user.id);

    return ok({ 
      subscription_id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end
    }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Failed to reactivate subscription', req);
  }
}
