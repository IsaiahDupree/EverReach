import { options, badRequest, serverError, ok } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import Stripe from "stripe";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;

  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const STRIPE_SECRET_KEY = requireEnv('STRIPE_SECRET_KEY').trim();
    const PRICE_ID = (
      process.env.STRIPE_PRICE_PRO_MONTHLY ||
      process.env.STRIPE_PRICE_ID ||
      process.env.STRIPE_PRICE_EverReach_Core_MONTHLY || ''
    ).trim();
    const SUCCESS_URL = requireEnv('STRIPE_SUCCESS_URL').trim();
    const CANCEL_URL = requireEnv('STRIPE_CANCEL_URL').trim();
    if (!PRICE_ID || !PRICE_ID.startsWith('price_')) {
      return badRequest('Server misconfigured: STRIPE_PRICE_PRO_MONTHLY must be a price_ id', req);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    // Ensure we have a profile and a stripe customer id for this user
    const supabase = getClientOrThrow(req);
    // Upsert minimal profile row if it doesn't exist
    // profiles_insert_self policy allows insert when user_id = auth.uid()
    await supabase.from('profiles').upsert({ user_id: user.id }, { onConflict: 'user_id' });

    // Fetch profile for customer id
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('user_id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id || '';
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { userId: user.id } });
      customerId = customer.id;
      // Save to profile
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('user_id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      allow_promotion_codes: true,
      line_items: [ { price: PRICE_ID, quantity: 1 } ],
      metadata: { userId: user.id },
    });

    if (!session.url) return serverError('Failed to create checkout session', req);
    return ok({ url: session.url }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Stripe error', req);
  }
}
