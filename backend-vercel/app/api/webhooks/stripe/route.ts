import { ok, options, badRequest, serverError } from "@/lib/cors";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';

export async function OPTIONS(){ return options(); }

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function updateProfileByUserId(supabaseUrl: string, serviceKey: string, userId: string, patch: Record<string, any>) {
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  await supabase.from('profiles').upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
}

async function updateProfileByCustomerId(supabaseUrl: string, serviceKey: string, customerId: string, patch: Record<string, any>) {
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  await supabase.from('profiles').update(patch).eq('stripe_customer_id', customerId);
}

export async function POST(req: Request){
  const sig = req.headers.get('stripe-signature');
  if (!sig) return badRequest('Missing stripe-signature');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return serverError('Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const raw = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return serverError('Server misconfigured: STRIPE_WEBHOOK_SECRET not set');
  }

  // We don't actually need the Stripe secret key to verify signatures, but we may use it to expand objects if needed
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : new Stripe('sk_test_dummy', { apiVersion: '2023-10-16' });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    return badRequest(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string) || '';
        const subscriptionId = (session.subscription as string) || '';
        const userId = (session.metadata as any)?.userId || '';

        let priceId: string | null = null;
        let status: string | null = null;
        let currentPeriodEnd: string | null = null;

        if (STRIPE_SECRET_KEY && subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            priceId = sub.items?.data?.[0]?.price?.id ?? null;
            status = sub.status ?? null;
            if (sub.current_period_end) {
              currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
            }
          } catch (_) {
            // ignore
          }
        }

        // Determine subscription tier based on status
        let subscriptionTier: string | undefined;
        if (status === 'active' || status === 'trialing') {
          subscriptionTier = 'pro';
        } else if (status === 'canceled' || status === 'unpaid' || !status) {
          subscriptionTier = 'free';
        }

        const patch: Record<string, any> = {
          stripe_customer_id: customerId || undefined,
          stripe_subscription_id: subscriptionId || undefined,
          stripe_price_id: priceId || undefined,
          subscription_status: status || undefined,
          subscription_tier: subscriptionTier, // FIX: Update tier based on status
          current_period_end: currentPeriodEnd || undefined,
        };

        if (userId) {
          await updateProfileByUserId(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, userId, patch);
        } else if (customerId) {
          // fallback by customer id
          await updateProfileByCustomerId(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, customerId, patch);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = (sub.customer as string) || '';
        const subscriptionId = sub.id;
        const priceId = sub.items?.data?.[0]?.price?.id ?? null;
        const status = sub.status ?? null;
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

        // Determine subscription tier based on status
        let subscriptionTier: string | undefined;
        if (status === 'active' || status === 'trialing') {
          subscriptionTier = 'pro';
        } else if (status === 'canceled' || status === 'unpaid' || event.type === 'customer.subscription.deleted') {
          subscriptionTier = 'free';
        }

        const patch: Record<string, any> = {
          stripe_customer_id: customerId || undefined,
          stripe_subscription_id: event.type === 'customer.subscription.deleted' ? null : subscriptionId || undefined,
          stripe_price_id: priceId || undefined,
          subscription_status: status || undefined,
          subscription_tier: subscriptionTier, // FIX: Update tier based on status
          current_period_end: currentPeriodEnd || undefined,
        };
        await updateProfileByCustomerId(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, customerId, patch);
        break;
      }

      default:
        // Do nothing for other event types
        break;
    }
  } catch (err: any) {
    return serverError(`Handler error: ${err.message}`);
  }

  return ok({ received: true });
}
