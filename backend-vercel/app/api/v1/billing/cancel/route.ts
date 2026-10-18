import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from '@/lib/supabase';
import Stripe from 'stripe';

/**
 * POST /api/v1/billing/cancel
 * 
 * Unified cancellation endpoint across all providers (Stripe, Apple, Google)
 * 
 * Body: {
 *   scope?: 'primary' | 'provider:stripe' | 'provider:app_store' | 'provider:play'
 *   when?: 'period_end' | 'now'
 *   reason?: string
 * }
 */

type CancelRequest = {
  scope?: string;
  when?: 'period_end' | 'now';
  reason?: string;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = getClientOrThrow(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CancelRequest = await req.json();
    const scope = body.scope || 'primary';
    const when = body.when || 'period_end';
    const reason = body.reason || 'user_request';

    // Resolve which subscription to cancel
    let targetProvider: string | null = null;
    let targetSubscription: any = null;

    if (scope === 'primary') {
      // Find primary active subscription
      const { data: subs, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['trialing', 'active', 'in_grace'])
        .order('is_primary', { ascending: false })
        .order('subscribed_at', { ascending: false })
        .limit(1);

      if (subError) throw subError;
      if (!subs || subs.length === 0) {
        return NextResponse.json(
          { error: 'No active subscription found' },
          { status: 404 }
        );
      }

      targetSubscription = subs[0];
      targetProvider = targetSubscription.origin;
    } else if (scope.startsWith('provider:')) {
      // Specific provider requested
      targetProvider = scope.replace('provider:', '');
      const { data: subs, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('origin', targetProvider)
        .in('status', ['trialing', 'active', 'in_grace'])
        .order('subscribed_at', { ascending: false })
        .limit(1);

      if (subError) throw subError;
      if (!subs || subs.length === 0) {
        return NextResponse.json(
          { error: `No active ${targetProvider} subscription found` },
          { status: 404 }
        );
      }

      targetSubscription = subs[0];
    } else {
      return NextResponse.json(
        { error: 'Invalid scope parameter' },
        { status: 400 }
      );
    }

    // Check if already canceled
    if (targetSubscription.cancel_at_period_end) {
      return NextResponse.json({
        status: 'already_scheduled',
        message: 'Subscription is already scheduled for cancellation',
        current_period_end: targetSubscription.current_period_end,
        provider: targetProvider
      });
    }

    // Handle based on provider
    if (targetProvider === 'stripe') {
      return await handleStripeCancellation(
        supabase,
        user.id,
        targetSubscription,
        when,
        reason
      );
    } else if (targetProvider === 'app_store' || targetProvider === 'play') {
      return await handleStoreCancellation(
        supabase,
        user.id,
        targetSubscription,
        targetProvider,
        reason
      );
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${targetProvider}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Cancel Subscription] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle Stripe cancellation via API
 */
async function handleStripeCancellation(
  supabase: any,
  userId: string,
  subscription: any,
  when: string,
  reason: string
) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  const subscriptionId = subscription.provider_subscription_id;

  if (!subscriptionId) {
    return NextResponse.json(
      { error: 'Subscription ID not found' },
      { status: 400 }
    );
  }

  try {
    if (when === 'now') {
      // Cancel immediately with proration
      await stripe.subscriptions.cancel(subscriptionId, {
        prorate: true
      });

      // Update database
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: false,
          canceled_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      // Log audit event
      await supabase.rpc('log_subscription_audit', {
        p_user_id: userId,
        p_event_type: 'cancel_immediate',
        p_provider: 'stripe',
        p_provider_subscription_id: subscriptionId,
        p_old_status: subscription.status,
        p_new_status: 'canceled',
        p_payload: { reason, when: 'now' }
      });

      return NextResponse.json({
        cancel_method: 'server',
        status: 'canceled',
        message: 'Subscription canceled immediately',
        effective_date: new Date().toISOString()
      });
    } else {
      // Cancel at period end (default)
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: { comment: reason }
      });

      // Update database
      await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      // Log audit event
      await supabase.rpc('log_subscription_audit', {
        p_user_id: userId,
        p_event_type: 'cancel_scheduled',
        p_provider: 'stripe',
        p_provider_subscription_id: subscriptionId,
        p_old_status: subscription.status,
        p_new_status: subscription.status,
        p_payload: { reason, when: 'period_end', period_end: subscription.current_period_end }
      });

      return NextResponse.json({
        cancel_method: 'server',
        status: 'scheduled',
        message: 'Subscription will cancel at the end of the billing period',
        current_period_end: subscription.current_period_end,
        access_until: subscription.entitlement_active_until
      });
    }
  } catch (stripeError: any) {
    console.error('[Stripe Cancel] Error:', stripeError);
    return NextResponse.json(
      { error: 'Failed to cancel with Stripe', details: stripeError.message },
      { status: 500 }
    );
  }
}

/**
 * Handle App Store / Google Play cancellation (redirect to store)
 */
async function handleStoreCancellation(
  supabase: any,
  userId: string,
  subscription: any,
  provider: string,
  reason: string
) {
  // Log the cancel request
  await supabase.rpc('log_subscription_audit', {
    p_user_id: userId,
    p_event_type: 'cancel_request',
    p_provider: provider,
    p_provider_subscription_id: subscription.provider_subscription_id,
    p_old_status: subscription.status,
    p_new_status: subscription.status,
    p_payload: { reason, method: 'store_redirect' }
  });

  // Return store management URL
  const manageUrl = provider === 'app_store'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

  return NextResponse.json({
    cancel_method: 'store',
    status: 'pending_user_action',
    message: `Please manage your ${provider === 'app_store' ? 'Apple' : 'Google Play'} subscription through the store`,
    manage_url: manageUrl,
    instructions: `We'll automatically update your status once you cancel through the ${provider === 'app_store' ? 'App Store' : 'Play Store'}.`,
    current_period_end: subscription.current_period_end,
    access_until: subscription.entitlement_active_until
  });
}
