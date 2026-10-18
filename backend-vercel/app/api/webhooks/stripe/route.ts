import { ok, options, badRequest, serverError } from "@/lib/cors";
import Stripe from "stripe";
import { getServiceClient } from "@/lib/supabase";
import { getProductIdForStoreSku, insertSubscriptionSnapshot, recomputeEntitlementsForUser } from "@/lib/entitlements";

export const runtime = 'nodejs';

export async function OPTIONS(){ return options(); }

async function updateProfileByUserId(supabase: any, userId: string, patch: Record<string, any>) {
  await supabase.from('profiles').upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
}

async function updateProfileByCustomerId(supabase: any, customerId: string, patch: Record<string, any>) {
  await supabase.from('profiles').update(patch).eq('stripe_customer_id', customerId);
}

async function getUserIdByCustomerId(supabase: any, customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return (data as any)?.user_id || null;
}

function mapStripeStatusToLogical(status: string | null): string | null {
  if (!status) return null;
  switch (status) {
    case 'trialing':
      return 'trial';
    case 'active':
      return 'active';
    case 'past_due':
      return 'grace';
    case 'paused':
      return 'paused';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    default:
      return status;
  }
}

export async function POST(req: Request){
  const sig = req.headers.get('stripe-signature');
  if (!sig) return badRequest('Missing stripe-signature');

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
    const serviceSupabase = getServiceClient();
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

        const patch: Record<string, any> = {
          stripe_customer_id: customerId || undefined,
          stripe_subscription_id: subscriptionId || undefined,
          stripe_price_id: priceId || undefined,
          subscription_status: status || undefined,
          current_period_end: currentPeriodEnd || undefined,
        };

        if (userId) {
          await updateProfileByUserId(serviceSupabase, userId, patch);
        } else if (customerId) {
          // fallback by customer id
          await updateProfileByCustomerId(serviceSupabase, customerId, patch);
        }

        // Insert snapshot + recompute entitlements when we can resolve user
        const resolvedUserId = userId || (customerId ? await getUserIdByCustomerId(serviceSupabase, customerId) : null);
        if (resolvedUserId) {
          const productId = await getProductIdForStoreSku(serviceSupabase as any, 'stripe', priceId);
          const logicalStatus = mapStripeStatusToLogical(status);
          await insertSubscriptionSnapshot(serviceSupabase as any, {
            userId: resolvedUserId,
            productId,
            store: 'stripe',
            storeAccountId: customerId || 'unknown',
            status: logicalStatus,
            currentPeriodEndISO: currentPeriodEnd,
          });
          await recomputeEntitlementsForUser(serviceSupabase as any, resolvedUserId);
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

        const patch: Record<string, any> = {
          stripe_customer_id: customerId || undefined,
          stripe_subscription_id: subscriptionId || undefined,
          stripe_price_id: priceId || undefined,
          subscription_status: status || undefined,
          current_period_end: currentPeriodEnd || undefined,
        };
        await updateProfileByCustomerId(serviceSupabase, customerId, patch);

        const resolvedUserId = customerId ? await getUserIdByCustomerId(serviceSupabase, customerId) : null;
        if (resolvedUserId) {
          const productId = await getProductIdForStoreSku(serviceSupabase as any, 'stripe', priceId);
          const logicalStatus = mapStripeStatusToLogical(status);
          await insertSubscriptionSnapshot(serviceSupabase as any, {
            userId: resolvedUserId,
            productId,
            store: 'stripe',
            storeAccountId: customerId || 'unknown',
            status: logicalStatus,
            currentPeriodEndISO: currentPeriodEnd,
          });
          await recomputeEntitlementsForUser(serviceSupabase as any, resolvedUserId);
        }
        break;
      }

      default:
        // Do nothing for other event types
        break;
    }
  } catch (err: any) {
    console.error('[stripe-webhook] Handler error:', err);
    return serverError('Webhook processing failed');
  }

  return ok({ received: true });
}
