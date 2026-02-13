/**
 * RevenueCat Webhook Handler
 * 
 * Receives subscription events from RevenueCat and updates backend database.
 * Triggered on purchase, renewal, cancellation, etc.
 * 
 * DB Tables Updated:
 *   - subscriptions (id, user_id, product_id, store, store_account_id, status,
 *                    started_at, current_period_end, cancel_at, canceled_at, updated_at)
 *   - entitlements  (user_id, plan, valid_until, source, updated_at, subscription_id)
 *   - subscription_events (audit log of every webhook — see migration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { options } from '@/lib/cors';
import { verifyWebhookSignature } from '@/lib/revenuecat-webhook';

export const runtime = 'nodejs'; // Need Node for crypto.createHmac in signature verification

export function OPTIONS(req: Request) {
  return options(req);
}

// RevenueCat webhook event types
type RevenueCatEventType =
    | 'INITIAL_PURCHASE'
    | 'RENEWAL'
    | 'CANCELLATION'
    | 'UNCANCELLATION'
    | 'NON_RENEWING_PURCHASE'
    | 'SUBSCRIPTION_PAUSED'
    | 'EXPIRATION'
    | 'BILLING_ISSUE'
    | 'PRODUCT_CHANGE'
    | 'REFUND'
    | 'SUBSCRIBER_ALIAS';

interface RevenueCatWebhookEvent {
    api_version: string;
    event: {
        type: RevenueCatEventType;
        app_user_id: string;
        original_app_user_id: string;
        product_id: string;
        period_type: 'NORMAL' | 'TRIAL' | 'INTRO';
        purchased_at_ms: number;
        expiration_at_ms: number | null;
        environment: 'PRODUCTION' | 'SANDBOX';
        entitlement_ids: string[];
        presented_offering_id?: string;
        is_trial_conversion?: boolean;
        transaction_id: string;
        original_transaction_id: string;
        store?: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | string;
        price_in_purchased_currency?: number;
        currency?: string;
        country_code?: string;
    };
}

// Map RC product_id to plan tier
function derivePlan(event: RevenueCatWebhookEvent['event']): 'free' | 'core' | 'pro' | 'team' {
    const pid = event.product_id?.toLowerCase() || '';
    const ents = event.entitlement_ids || [];
    if (ents.includes('pro') || pid.includes('pro')) return 'pro';
    if (ents.includes('core') || pid.includes('core')) return 'core';
    if (ents.includes('team') || pid.includes('team')) return 'team';
    return 'free';
}

// Map RC store to our DB enum
function deriveStore(event: RevenueCatWebhookEvent['event']): string {
    if (!event.store) return 'app_store';
    switch (event.store) {
        case 'PLAY_STORE': case 'GOOGLE_PLAY': case 'ANDROID': return 'play';
        case 'STRIPE': return 'stripe';
        default: return 'app_store';
    }
}

// Map RC event type to subscription status
function deriveStatus(event: RevenueCatWebhookEvent['event']): string {
    switch (event.type) {
        case 'CANCELLATION': return 'canceled';
        case 'EXPIRATION': case 'REFUND': return 'expired';
        case 'UNCANCELLATION': case 'INITIAL_PURCHASE': case 'RENEWAL':
        case 'PRODUCT_CHANGE': case 'BILLING_ISSUE': case 'NON_RENEWING_PURCHASE':
            return event.period_type === 'TRIAL' ? 'trial' : 'active';
        default: return 'active';
    }
}

export async function POST(req: NextRequest) {
    try {
        // ── Auth: verify signature or bearer token ──
        const rawBody = await req.text();
        const signature = req.headers.get('x-revenuecat-signature');
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');

        const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
        const expectedBearer = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;

        const isSignatureValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
        const isBearerValid = Boolean(expectedBearer) && authHeader === `Bearer ${expectedBearer}`;
        const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';

        if (!isSignatureValid && !isBearerValid && !isDev) {
            console.error('[RevenueCat Webhook] Unauthorized: signature and bearer both invalid');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (isDev && !isSignatureValid && !isBearerValid) {
            console.warn('[RevenueCat Webhook] Processing without auth (dev/preview mode)');
        }

        // Parse the raw body we already read
        let payload: RevenueCatWebhookEvent;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }
        const event = payload.event;

        if (!event || !event.type || !event.app_user_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log('[RevenueCat Webhook] Received:', {
            type: event.type,
            user_id: event.app_user_id,
            product_id: event.product_id,
            environment: event.environment,
        });

        const supabase = getServiceClient();
        const userId = event.app_user_id;
        const plan = derivePlan(event);
        const store = deriveStore(event);
        const status = deriveStatus(event);
        const now = new Date().toISOString();

        // SUBSCRIBER_ALIAS is informational only — log but skip DB update
        if (event.type === 'SUBSCRIBER_ALIAS') {
            await logSubscriptionEvent(supabase, event, payload, plan, status, store);
            console.log('[RevenueCat Webhook] SUBSCRIBER_ALIAS logged, skipping DB update');
            return NextResponse.json({ success: true, skipped: 'subscriber_alias' });
        }

        // ── 0. Idempotency: log event first, skip if duplicate ──
        const isDuplicate = await logSubscriptionEvent(supabase, event, payload, plan, status, store);
        if (isDuplicate) {
            return NextResponse.json({ success: true, duplicate: true, transaction_id: event.transaction_id });
        }

        // ── 1. Update subscriptions table ──
        // Schema: id, user_id, product_id, store, store_account_id, status,
        //         started_at, current_period_end, cancel_at, canceled_at, updated_at
        const subData: Record<string, any> = {
            user_id: userId,
            product_id: event.product_id,
            store,
            status,
            current_period_end: event.expiration_at_ms
                ? new Date(event.expiration_at_ms).toISOString()
                : null,
            updated_at: now,
        };

        // Set started_at only on initial purchase
        if (event.type === 'INITIAL_PURCHASE' || event.type === 'NON_RENEWING_PURCHASE') {
            subData.started_at = event.purchased_at_ms
                ? new Date(event.purchased_at_ms).toISOString()
                : now;
        }

        // Set cancel timestamps for cancellation events
        if (event.type === 'CANCELLATION') {
            subData.canceled_at = now;
            subData.cancel_at = event.expiration_at_ms
                ? new Date(event.expiration_at_ms).toISOString()
                : null;
        }

        // Clear cancel flags on uncancellation
        if (event.type === 'UNCANCELLATION') {
            subData.canceled_at = null;
            subData.cancel_at = null;
        }

        // Refund: also clear cancel fields, status is already 'expired'
        if (event.type === 'REFUND') {
            subData.canceled_at = now;
        }

        // Use store_account_id for RC original_transaction_id (closest match)
        if (event.original_transaction_id) {
            subData.store_account_id = event.original_transaction_id;
        }

        const { error: subError } = await supabase
            .from('subscriptions')
            .upsert(subData, { onConflict: 'user_id,store' });

        if (subError) {
            console.error('[RevenueCat Webhook] subscriptions upsert error:', subError);
            // Continue to entitlements — don't bail completely
        }

        // ── 2. Update entitlements table ──
        // Schema: user_id, plan, valid_until, source, updated_at, subscription_id
        const entPlan = (event.type === 'REFUND' || event.type === 'EXPIRATION') ? 'free' : plan;
        const { error: entError } = await supabase
            .from('entitlements')
            .upsert({
                user_id: userId,
                plan: entPlan,
                valid_until: event.expiration_at_ms
                    ? new Date(event.expiration_at_ms).toISOString()
                    : null,
                source: 'revenuecat',
                updated_at: now,
            }, { onConflict: 'user_id' });

        if (entError) {
            console.error('[RevenueCat Webhook] entitlements upsert error:', entError);
        }

        // (Event already logged in step 0 for idempotency)

        const hasErrors = subError || entError;
        console.log(`[RevenueCat Webhook] ${hasErrors ? '⚠️ Partial' : '✅'} Processed:`, {
            type: event.type, user_id: userId, plan: entPlan, status, store,
        });

        return NextResponse.json({
            success: !hasErrors,
            partial: !!hasErrors,
            type: event.type,
            plan: entPlan,
            status,
        });
    } catch (error: any) {
        console.error('[RevenueCat Webhook] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Log webhook event to subscription_events table for audit trail.
 * Returns true if this is a duplicate event (idempotency check via unique index).
 */
async function logSubscriptionEvent(
    supabase: any,
    event: RevenueCatWebhookEvent['event'],
    payload: RevenueCatWebhookEvent,
    plan: string,
    status: string,
    store: string,
): Promise<boolean> {
    try {
        const { error } = await supabase.from('subscription_events').insert({
            user_id: event.app_user_id,
            event_type: event.type,
            product_id: event.product_id,
            store,
            environment: event.environment,
            period_type: event.period_type,
            plan,
            status,
            transaction_id: event.transaction_id || null,
            original_transaction_id: event.original_transaction_id || null,
            revenue: event.price_in_purchased_currency ?? null,
            currency: event.currency || 'USD',
            entitlement_ids: event.entitlement_ids || [],
            is_trial_conversion: event.is_trial_conversion || false,
            raw_payload: payload,
            occurred_at: event.purchased_at_ms
                ? new Date(event.purchased_at_ms).toISOString()
                : new Date().toISOString(),
        });

        // 23505 = unique_violation → duplicate event
        if (error?.code === '23505') {
            console.log('[RevenueCat Webhook] Duplicate event skipped:', event.transaction_id, event.type);
            return true;
        }
        if (error) {
            console.warn('[RevenueCat Webhook] subscription_events insert failed:', error.message);
        }
        return false;
    } catch (err: any) {
        console.warn('[RevenueCat Webhook] subscription_events insert error:', err?.message);
        return false;
    }
}
