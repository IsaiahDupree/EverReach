import { options, ok, unauthorized, serverError, badRequest } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export function OPTIONS(req: Request) { return options(req); }

// POST /api/v1/billing/portal
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  try {
    const supabase = getServiceClient();

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

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      return badRequest('Stripe not configured', req);
    }
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
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://everreach.app'}/admin/billing`,
    });

    return ok({ url: session.url }, req);
  } catch (error: any) {
    console.error('[Billing Portal] Error:', error);
    return serverError('Internal server error', req);
  }
}

// GET /api/v1/billing/portal
// Delegate to POST to satisfy clients that use GET
export async function GET(req: Request) {
  return POST(req);
}
