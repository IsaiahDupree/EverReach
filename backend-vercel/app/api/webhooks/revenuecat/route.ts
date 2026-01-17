/**
 * RevenueCat Webhook Handler
 * 
 * Receives subscription events from RevenueCat and updates backend database.
 * Triggered on purchase, renewal, cancellation, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { options } from '@/lib/cors';

export const runtime = 'edge';

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
    | 'PRODUCT_CHANGE';

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
        store?: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | string; // Store/platform identifier
    };
}

export async function POST(req: NextRequest) {
    try {
        // Get webhook payload
        const payload: RevenueCatWebhookEvent = await req.json();

        console.log('[RevenueCat Webhook] Received event:', {
            type: payload.event.type,
            user_id: payload.event.app_user_id,
            product_id: payload.event.product_id,
        });

        // Get Supabase client (use service key for webhook)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const userId = payload.event.app_user_id;
        const event = payload.event;

        // Determine subscription tier from product_id or entitlements
        let tier: 'free' | 'core' | 'pro' | 'team' = 'free';
        if (event.entitlement_ids.includes('pro') || event.product_id.includes('pro')) {
            tier = 'pro';
        } else if (event.entitlement_ids.includes('core') || event.product_id.includes('core')) {
            tier = 'core';
        } else if (event.entitlement_ids.includes('team') || event.product_id.includes('team')) {
            tier = 'team';
        }

        // Determine subscription status
        let subscriptionStatus: 'active' | 'trial' | 'canceled' | 'expired' = 'active';
        if (event.type === 'CANCELLATION') {
            subscriptionStatus = 'canceled';
        } else if (event.type === 'EXPIRATION') {
            subscriptionStatus = 'expired';
        } else if (event.period_type === 'TRIAL') {
            subscriptionStatus = 'trial';
        }

        // CRITICAL: Map RevenueCat product_id to App Store product_id
        // RevenueCat sends their internal product_id (e.g., "everreach_core_annual")
        // We need to fetch the product details to get the App Store product_id (e.g., "com.everreach.core.annual")
        let appStoreProductId = event.product_id; // Default fallback
        
        try {
            const revenueCatApiKey = process.env.REVENUECAT_API_KEY || process.env.REVENUECAT_V2_API_KEY;
            const revenueCatProjectId = process.env.REVENUECAT_PROJECT_ID || 'projf143188e';
            
            if (revenueCatApiKey && event.product_id) {
                console.log('[RevenueCat Webhook] Fetching product details for:', event.product_id);
                
                // Fetch product from RevenueCat API to get store_identifier
                const productResponse = await fetch(
                    `https://api.revenuecat.com/v2/projects/${revenueCatProjectId}/products/${event.product_id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${revenueCatApiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                
                if (productResponse.ok) {
                    const productData = await productResponse.json();
                    console.log('[RevenueCat Webhook] Product data:', JSON.stringify(productData, null, 2));
                    
                    // Get the App Store product identifier (store_identifier for iOS)
                    // RevenueCat V2 API structure: productData.store_identifier
                    if (productData.store_identifier) {
                        appStoreProductId = productData.store_identifier;
                        console.log('[RevenueCat Webhook] ✅ Mapped to App Store product_id:', appStoreProductId);
                    } else {
                        // Try alternative field names
                        const altId = productData.app_store_product_id || 
                                     productData.ios_product_id || 
                                     productData.identifier;
                        if (altId) {
                            appStoreProductId = altId;
                            console.log('[RevenueCat Webhook] ✅ Mapped to App Store product_id (alt):', appStoreProductId);
                        } else {
                            console.warn('[RevenueCat Webhook] ⚠️ No store_identifier found, using RevenueCat product_id:', event.product_id);
                        }
                    }
                } else {
                    console.warn('[RevenueCat Webhook] ⚠️ Could not fetch product details, using RevenueCat product_id:', event.product_id);
                }
            }
        } catch (productError: any) {
            console.warn('[RevenueCat Webhook] ⚠️ Error fetching product details:', productError.message);
            console.warn('[RevenueCat Webhook] Using RevenueCat product_id as fallback:', event.product_id);
        }

        // Determine store/platform from event data
        // RevenueCat webhook event.store can be 'APP_STORE', 'PLAY_STORE', etc.
        // If not provided, infer from product_id or default to app_store
        let store: 'app_store' | 'play' | 'stripe' = 'app_store'; // Default to app_store
        
        if (event.store) {
            if (event.store === 'PLAY_STORE' || event.store === 'GOOGLE_PLAY' || event.store === 'ANDROID') {
                store = 'play';
            } else if (event.store === 'STRIPE') {
                store = 'stripe';
            } else {
                store = 'app_store'; // APP_STORE or default
            }
        } else {
            // Fallback: infer from product_id or environment
            // iOS products typically have 'com.' prefix, Android might have different patterns
            if (appStoreProductId.includes('android') || appStoreProductId.includes('play')) {
                store = 'play';
            } else {
                store = 'app_store'; // Default to iOS/App Store
            }
        }

        console.log('[RevenueCat Webhook] Determined store:', store, 'from event.store:', event.store || 'inferred');

        // Update or create subscription record
        const { error: subError } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: userId,
                tier,
                status: subscriptionStatus,
                product_id: appStoreProductId, // Use mapped App Store product_id
                store: store, // Use determined store (app_store, play, or stripe)
                current_period_end: event.expiration_at_ms
                    ? new Date(event.expiration_at_ms).toISOString()
                    : null,
                transaction_id: event.transaction_id,
                original_transaction_id: event.original_transaction_id,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,store', // Match on both user_id and store
            });

        if (subError) {
            console.error('[RevenueCat Webhook] Error updating subscription:', subError);
            return NextResponse.json(
                { error: 'Failed to update subscription' },
                { status: 500 }
            );
        }

        // Update entitlements
        const features = tier === 'pro'
            ? { compose_runs: 1000, voice_minutes: 300, messages: 2000, contacts: -1 }
            : tier === 'core'
                ? { compose_runs: 200, voice_minutes: 120, messages: 1000, contacts: 500 }
                : { compose_runs: 50, voice_minutes: 30, messages: 200, contacts: 100 };

        const { error: entError } = await supabase
            .from('entitlements')
            .upsert({
                user_id: userId,
                tier,
                subscription_status: subscriptionStatus,
                payment_platform: 'revenuecat',
                environment: event.environment,
                trial_ends_at: event.period_type === 'TRIAL' && event.expiration_at_ms
                    ? new Date(event.expiration_at_ms).toISOString()
                    : null,
                current_period_end: event.expiration_at_ms
                    ? new Date(event.expiration_at_ms).toISOString()
                    : null,
                features,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

        if (entError) {
            console.error('[RevenueCat Webhook] Error updating entitlements:', entError);
            return NextResponse.json(
                { error: 'Failed to update entitlements' },
                { status: 500 }
            );
        }

        console.log('[RevenueCat Webhook] Successfully processed event:', {
            type: payload.event.type,
            user_id: userId,
            tier,
            status: subscriptionStatus,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[RevenueCat Webhook] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
