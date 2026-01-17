/**
 * Subscription Sync Endpoint
 * 
 * Allows mobile app to manually trigger subscription sync with backend.
 * Fetches RevenueCat customer info and updates backend entitlements.
 */

import { NextRequest } from 'next/server';
import { options, ok, unauthorized, badRequest } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
    return options(req);
}

// POST /api/v1/subscriptions/sync
export async function POST(req: NextRequest) {
    const user = await getUser(req);
    if (!user) return unauthorized('Unauthorized', req);

    try {
        const body = await req.json();
        const { platform, customer_info } = body;

        if (!customer_info) {
            return badRequest('Missing customer_info', req);
        }

        console.log('[Subscription Sync] Syncing for user:', user.id, {
            platform,
            entitlements: customer_info.entitlements,
        });

        const supabase = getClientOrThrow(req);

        // Determine tier from entitlements
        let tier: 'free' | 'core' | 'pro' | 'team' = 'free';
        const entitlements = customer_info.entitlements || [];

        if (entitlements.includes('pro')) {
            tier = 'pro';
        } else if (entitlements.includes('core')) {
            tier = 'core';
        } else if (entitlements.includes('team')) {
            tier = 'team';
        }

        // Determine status
        const hasActiveSubscription = customer_info.active_subscriptions?.length > 0;
        const status = hasActiveSubscription ? 'active' : 'trial';

        // Update subscriptions table
        const { error: subError } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                tier,
                status,
                platform: 'revenuecat',
                environment: 'PRODUCTION', // Could be passed from mobile
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

        if (subError) {
            console.error('[Subscription Sync] Error updating subscription:', subError);
            return ok({
                success: false,
                error: 'Failed to update subscription',
            }, req);
        }

        // Update entitlements table
        const features = tier === 'pro'
            ? { compose_runs: 1000, voice_minutes: 300, messages: 2000, contacts: -1 }
            : tier === 'core'
                ? { compose_runs: 200, voice_minutes: 120, messages: 1000, contacts: 500 }
                : { compose_runs: 50, voice_minutes: 30, messages: 200, contacts: 100 };

        const { error: entError } = await supabase
            .from('entitlements')
            .upsert({
                user_id: user.id,
                tier,
                subscription_status: status,
                payment_platform: 'revenuecat',
                features,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

        if (entError) {
            console.error('[Subscription Sync] Error updating entitlements:', entError);
            return ok({
                success: false,
                error: 'Failed to update entitlements',
            }, req);
        }

        console.log('[Subscription Sync] Successfully synced:', {
            user_id: user.id,
            tier,
            status,
        });

        return ok({
            success: true,
            tier,
            synced_at: new Date().toISOString(),
        }, req);
    } catch (error: any) {
        console.error('[Subscription Sync] Error:', error);
        return ok({
            success: false,
            error: error.message || 'Internal server error',
        }, req);
    }
}
