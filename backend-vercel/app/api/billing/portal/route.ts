import { options, serverError, ok } from "@/lib/cors";
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
    const STRIPE_SECRET_KEY = requireEnv('STRIPE_SECRET_KEY');
    const RETURN_URL = process.env.STRIPE_PORTAL_RETURN_URL || process.env.STRIPE_SUCCESS_URL || 'https://everreach.app/settings/billing';
    const PORTAL_CONFIGURATION_ID = process.env.STRIPE_PORTAL_CONFIGURATION_ID;

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    const supabase = getClientOrThrow(req);
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
