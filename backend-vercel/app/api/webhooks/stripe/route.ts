import { ok, options, badRequest, serverError } from "@/lib/cors";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendMetaEvent, normalizeUserData, createRevenueEvent, generateEventId } from "@/lib/meta-conversions";

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

/**
 * Send a Meta Conversions API event for a subscription/purchase
 */
async function sendMetaSubscriptionEvent(
  stripe: Stripe,
  eventName: 'Purchase' | 'Subscribe' | 'StartTrial',
  customerId: string,
  subscription: Stripe.Subscription | null,
  amount: number
) {
  try {
    // Get customer email
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    if (!customer.email) {
      console.warn(`[Meta] No email for customer ${customerId}, skipping event`);
      return;
    }

    // Generate unique event ID for deduplication
    const eventId = generateEventId(eventName.toLowerCase());

    // Determine value and currency
    const currency = subscription?.items?.data?.[0]?.price?.currency?.toUpperCase() || 'USD';
    const value = amount / 100; // Convert cents to dollars

    // Create Meta event
    const userData = normalizeUserData({
      email: customer.email,
      externalId: customerId,
    });

    const event = createRevenueEvent(eventName, {
      eventId,
      value,
      currency,
      userData,
      customData: {
        content_name: eventName === 'StartTrial' ? 'Free Trial' : 'Subscription',
      },
    });

    // Send to Meta
    const result = await sendMetaEvent(event);
    if (result.success) {
      console.log(`[Meta] ${eventName} event sent for customer ${customerId}`);
    } else {
      console.warn(`[Meta] Failed to send ${eventName} event: ${result.error}`);
    }
  } catch (err: any) {
    console.error(`[Meta] Error sending ${eventName} event:`, err.message);
  }
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
  if (!STRIPE_SECRET_KEY) {
    return serverError('Server misconfigured: STRIPE_SECRET_KEY not set');
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

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
        let subscriptionObj: Stripe.Subscription | null = null;
        let amount = 0;

        if (STRIPE_SECRET_KEY && subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            subscriptionObj = sub;
            priceId = sub.items?.data?.[0]?.price?.id ?? null;
            status = sub.status ?? null;
            if (sub.current_period_end) {
              currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
            }
            // Get amount from the line item
            amount = sub.items?.data?.[0]?.price?.unit_amount ?? 0;
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

        // Send Meta event for successful purchase
        if (customerId && status === 'trialing') {
          await sendMetaSubscriptionEvent(stripe, 'StartTrial', customerId, subscriptionObj, amount);
        } else if (customerId && (status === 'active' || status === 'past_due')) {
          await sendMetaSubscriptionEvent(stripe, 'Subscribe', customerId, subscriptionObj, amount);
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
        const amount = sub.items?.data?.[0]?.price?.unit_amount ?? 0;

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

        // Send Meta event for subscription state changes
        if (customerId && event.type === 'customer.subscription.created') {
          if (status === 'trialing') {
            await sendMetaSubscriptionEvent(stripe, 'StartTrial', customerId, sub, amount);
          } else if (status === 'active') {
            await sendMetaSubscriptionEvent(stripe, 'Subscribe', customerId, sub, amount);
          }
        }
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
