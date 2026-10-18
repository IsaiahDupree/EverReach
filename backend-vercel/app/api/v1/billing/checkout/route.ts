import { options, ok, badRequest, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import Stripe from "stripe";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// POST /api/v1/billing/checkout
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim();
    if (!STRIPE_SECRET_KEY) return badRequest("Stripe not configured", req);

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    // Parse body (tests pass price_id, success_url, cancel_url)
    let body: any = {};
    try { body = await req.json(); } catch {}
    const priceId: string = (body?.price_id || process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_ID || '').trim();
    const successUrl: string = (body?.success_url || process.env.STRIPE_SUCCESS_URL || '').trim();
    const cancelUrl: string = (body?.cancel_url || process.env.STRIPE_CANCEL_URL || '').trim();

    if (!priceId || !priceId.startsWith('price_')) {
      return badRequest('invalid_price_id', req);
    }
    if (!successUrl || !cancelUrl) {
      return badRequest('missing_redirect_urls', req);
    }

    const supabase = getClientOrThrow(req);
    // Ensure profile and stripe customer
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

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      line_items: [ { price: priceId, quantity: 1 } ],
      metadata: { userId: user.id },
    });

    if (!session.url) return serverError('failed_to_create_checkout', req);
    return ok({ url: session.url }, req);
  } catch (e: any) {
    return serverError(e?.message || 'stripe_error', req);
  }
}
