import { options, serverError, ok, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import Stripe from "stripe";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function OPTIONS(req: Request) { return options(req); }

// GET redirects to POST for convenience
export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const supabase = getClientOrThrow(req);

    // Check subscription source before attempting Stripe portal
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('store, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    // If user has an active non-Stripe subscription, return 400
    if (subscription) {
      const now = Date.now();
      const periodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end).getTime() 
        : 0;
      const isActive = subscription.status === 'active' && periodEnd > now;
      
      if (isActive && subscription.store !== 'stripe') {
        const sourceMap: Record<string, string> = {
          'app_store': 'app_store',
          'play': 'play',
        };
        const subscriptionSource = sourceMap[subscription.store] || subscription.store;
        
        return badRequest(JSON.stringify({
          error: 'Cannot create portal for non-Stripe subscription',
          code: 'INVALID_SUBSCRIPTION_SOURCE',
          subscription_source: subscriptionSource,
        }), req);
      }
    }

    const STRIPE_SECRET_KEY = requireEnv('STRIPE_SECRET_KEY');
    const RETURN_URL = process.env.STRIPE_PORTAL_RETURN_URL || process.env.STRIPE_SUCCESS_URL || 'https://everreach.app/settings/billing';
    const PORTAL_CONFIGURATION_ID = process.env.STRIPE_PORTAL_CONFIGURATION_ID;

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    // Ensure profile exists
    await supabase.from('profiles').upsert({ user_id: user.id }, { onConflict: 'user_id' });
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id || '';
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { userId: user.id } });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('user_id', user.id);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: RETURN_URL,
      ...(PORTAL_CONFIGURATION_ID ? { configuration: PORTAL_CONFIGURATION_ID } : {}),
    });

    if (!session.url) return serverError('Failed to create portal session', req);
    return ok({ url: session.url }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Stripe error', req);
  }
}
