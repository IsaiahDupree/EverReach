/**
 * Live Paywall Configuration API
 * GET: Fetch live paywall(s) for platform(s)
 * POST: Set live paywall for a platform
 */

import { options, ok, badRequest, unauthorized, notFound } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /api/v1/config/paywall-live
 * 
 * Returns live paywall configuration (global admin-controlled config)
 * 
 * Query params:
 * - platform: 'ios' | 'android' | 'web' (required)
 */
export async function GET(request: Request) {
  try {
    // Auth required but config is global (not user-specific)
    const user = await getUser(request);
    if (!user) {
      return unauthorized('Authentication required', request);
    }

    const supabase = getClientOrThrow(request);
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform') || 'android';

    // Validate platform
    if (!['ios', 'android', 'web'].includes(platform)) {
      return badRequest(`Invalid platform. Must be one of: ios, android, web`, request);
    }

    // Use the RPC function to get active global config
    const { data, error } = await supabase
      .rpc('get_active_paywall_config', { p_platform: platform });

    // Helper to build default permissions (for fallback responses)
    const buildDefaultPermissions = async () => {
      // Check subscription status from profiles table (source of truth)
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // Also check user_subscriptions for active paid subscriptions
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const hasActiveSubscription = 
        profile?.subscription_status === 'active' || 
        subscription?.status === 'active';
      
      const hasActiveTrial = profile?.trial_ends_at 
        && new Date(profile.trial_ends_at) > new Date();
      
      const canAccessPremium = hasActiveSubscription || hasActiveTrial;

      console.log(`[paywall-live GET] Default permissions - canAccessPremium: ${canAccessPremium} (sub: ${hasActiveSubscription}, trial: ${hasActiveTrial})`);

      const premiumFeatures = [
        'screenshot_analysis',
        'contact_context',
        'ai_messages',
        'voice_notes',
        'advanced_analytics'
      ];

      return premiumFeatures.map(feature => ({
        feature_area: feature,
        access_level: 'premium',
        can_access: canAccessPremium,
        requires_trial_or_paid: true
      }));
    };

    if (error) {
      console.error('[paywall-live GET] RPC error:', error);
      // Fallback to custom if no config found
      const permissions = await buildDefaultPermissions();
      return ok({
        platform,
        provider: 'custom',
        paywall_id: 'everreach_basic_paywall',
        configuration: {},
        updated_at: new Date().toISOString(),
        permissions,
      }, request);
    }

    // If no config found, return custom fallback
    if (!data || data.length === 0) {
      console.log(`[paywall-live GET] No config for ${platform}, using custom fallback`);
      const permissions = await buildDefaultPermissions();
      return ok({
        platform,
        provider: 'custom',
        paywall_id: 'everreach_basic_paywall',
        configuration: {},
        updated_at: new Date().toISOString(),
        permissions,
      }, request);
    }

    const config = data[0];
    console.log(`[paywall-live GET] Returning ${platform} config:`, config.provider);

    // Check user's subscription status from profiles table (source of truth for trials)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, trial_ends_at, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    // Also check user_subscriptions for active paid subscriptions
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    // Determine if user has premium access
    const hasActiveSubscription = 
      profile?.subscription_status === 'active' || 
      subscription?.status === 'active';
    
    const hasActiveTrial = profile?.trial_ends_at 
      && new Date(profile.trial_ends_at) > new Date();
    
    const canAccessPremium = hasActiveSubscription || hasActiveTrial;

    console.log(`[paywall-live GET] User ${user.id} premium access check:`);
    console.log(`  - subscription_status: ${profile?.subscription_status}`);
    console.log(`  - trial_ends_at: ${profile?.trial_ends_at}`);
    console.log(`  - hasActiveSubscription: ${hasActiveSubscription}`);
    console.log(`  - hasActiveTrial: ${hasActiveTrial}`);
    console.log(`  - canAccessPremium: ${canAccessPremium}`);

    // Build permissions array for all premium features
    const premiumFeatures = [
      'screenshot_analysis',
      'contact_context',
      'ai_messages',
      'voice_notes',
      'advanced_analytics'
    ];

    const permissions = premiumFeatures.map(feature => ({
      feature_area: feature,
      access_level: 'premium',
      can_access: canAccessPremium,
      requires_trial_or_paid: true
    }));

    return ok({
      platform: config.platform,
      paywall_id: config.paywall_id,
      provider: config.provider,
      configuration: config.configuration || {},
      updated_at: config.updated_at,
      permissions,  // Add permissions array
    }, request);

  } catch (error: any) {
    console.error('[paywall-live GET] Unexpected error:', error);
    // Return custom fallback on error
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform') || 'android';
    
    // Default permissions for error case (deny all)
    const premiumFeatures = [
      'screenshot_analysis',
      'contact_context',
      'ai_messages',
      'voice_notes',
      'advanced_analytics'
    ];
    
    const permissions = premiumFeatures.map(feature => ({
      feature_area: feature,
      access_level: 'premium',
      can_access: false,  // Deny by default on error
      requires_trial_or_paid: true
    }));
    
    return ok({
      platform,
      provider: 'custom',
      paywall_id: 'everreach_basic_paywall',
      configuration: {},
      updated_at: new Date().toISOString(),
      permissions,
    }, request);
  }
}

/**
 * POST /api/v1/config/paywall-live
 * 
 * Sets the live paywall for a platform (replaces existing if any)
 * 
 * Body:
 * {
 *   platform: 'ios' | 'android' | 'web',
 *   paywall_id: string,
 *   provider: 'custom' | 'superwall' | 'revenuecat',
 *   configuration?: object
 * }
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const user = await getUser(request);
    if (!user) {
      return unauthorized('Authentication required', request);
    }

    const supabase = getClientOrThrow(request);

    // 2. Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON', request);
    }

    // 3. Validate required fields
    if (!body.platform || !body.paywall_id || !body.provider) {
      return badRequest('Missing required fields: platform, paywall_id, provider', request);
    }

    // 4. Validate platform
    if (!['ios', 'android', 'web'].includes(body.platform)) {
      return badRequest(`Invalid platform. Must be one of: ios, android, web`, request);
    }

    // 5. Validate provider
    if (!['custom', 'superwall', 'revenuecat'].includes(body.provider)) {
      return badRequest(`Invalid provider. Must be one of: custom, superwall, revenuecat`, request);
    }

    // 6. Validate paywall_id format
    if (typeof body.paywall_id !== 'string' || body.paywall_id.trim().length === 0) {
      return badRequest('paywall_id must be a non-empty string', request);
    }

    // 7. Upsert live paywall config (replaces existing for this platform)
    const { data: updatedConfig, error } = await supabase
      .from('live_paywall_config')
      .upsert({
        user_id: user.id,
        platform: body.platform,
        paywall_id: body.paywall_id.trim(),
        provider: body.provider,
        configuration: body.configuration || {},
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      })
      .select()
      .single();

    if (error) {
      console.error('[paywall-live POST] Error upserting config:', error);
      return badRequest('Failed to set live paywall', request);
    }

    console.log(`[paywall-live POST] Set ${body.platform} live paywall to ${body.paywall_id} (${body.provider}) for user ${user.id}`);

    return ok({
      success: true,
      platform: updatedConfig.platform,
      paywall_id: updatedConfig.paywall_id,
      provider: updatedConfig.provider,
      configuration: updatedConfig.configuration,
      updated_at: updatedConfig.updated_at,
    }, request);

  } catch (error: any) {
    console.error('[paywall-live POST] Unexpected error:', error);
    return badRequest(error?.message || 'Internal server error', request);
  }
}

