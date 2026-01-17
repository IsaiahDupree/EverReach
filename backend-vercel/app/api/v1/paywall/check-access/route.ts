/**
 * Check Feature Access API
 * Determines if a user can access a specific feature based on paywall strategy
 */

import { options, ok, badRequest, unauthorized } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';
import type { CheckFeatureAccessResponse, Platform, FeatureArea } from '@/types/paywall-strategy';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * POST /api/v1/paywall/check-access
 * Checks if user can access a feature
 * 
 * Body:
 * - feature_area: 'login_auth' | 'onboarding' | 'contacts_list' | 'contact_detail' | 'settings' | 'pro_features'
 * - platform: 'mobile' | 'web' (optional, auto-detected from header)
 */
export async function POST(request: Request) {
  try {
    // Require authentication
    const user = await getUser(request);
    if (!user) {
      return unauthorized('Authentication required', request);
    }

    const supabase = getClientOrThrow(request);

    // Parse request body
    let body: { feature_area: FeatureArea; platform?: Platform };
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON', request);
    }

    if (!body.feature_area) {
      return badRequest('Missing required field: feature_area', request);
    }

    // Detect platform from header or use provided value
    let platform = body.platform || request.headers.get('X-Platform') as Platform || 'web';

    // 1. Get active config for platform
    const { data: activeConfig } = await supabase
      .from('active_paywall_config')
      .select('*')
      .or(`platform.eq.${platform},platform.eq.all`)
      .order('platform', { ascending: false })
      .limit(1)
      .single();

    if (!activeConfig) {
      return badRequest('No active paywall config found', request);
    }

    // 2. Get strategy details
    const { data: strategy } = await supabase
      .from('paywall_strategies')
      .select('*')
      .eq('id', activeConfig.strategy_id)
      .single();

    if (!strategy) {
      return badRequest('Strategy not found', request);
    }

    // 3. Check if trial has ended
    const { data: trialEnded } = await supabase
      .rpc('has_trial_ended', {
        p_user_id: user.id,
        p_trial_type_id: activeConfig.trial_type_id,
      });

    // 4. Get permission for this feature
    const { data: permission } = await supabase
      .from('paywall_access_permissions')
      .select('*')
      .eq('strategy_id', activeConfig.strategy_id)
      .eq('feature_area', body.feature_area)
      .single();

    // 5. Determine access
    let canAccess = false;
    let shouldShowPaywall = false;
    
    if (!trialEnded) {
      // Trial still active - full access
      canAccess = true;
      shouldShowPaywall = false;
    } else {
      // Trial ended - check permissions
      canAccess = permission?.can_access || false;
      shouldShowPaywall = !canAccess;
    }

    // 6. Calculate trial status details
    const { data: trial } = await supabase
      .from('trial_types')
      .select('*')
      .eq('id', activeConfig.trial_type_id)
      .single();

    let daysRemaining: number | undefined;
    let hoursRemaining: number | undefined;

    if (trial && !trialEnded) {
      if (trial.type === 'time' && trial.duration_days) {
        const { data: userData } = await supabase
          .from('auth.users')
          .select('created_at')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          const createdAt = new Date(userData.created_at);
          const expiresAt = new Date(createdAt.getTime() + trial.duration_days * 24 * 60 * 60 * 1000);
          daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
        }
      } else if (trial.type === 'usage' && trial.usage_hours) {
        const { data: usage } = await supabase
          .from('user_usage_tracking')
          .select('total_active_minutes')
          .eq('user_id', user.id)
          .single();
        
        if (usage) {
          const hoursUsed = Math.floor(usage.total_active_minutes / 60);
          hoursRemaining = Math.max(0, trial.usage_hours - hoursUsed);
        }
      }
    }

    const response: CheckFeatureAccessResponse = {
      can_access: canAccess,
      access_level: permission?.access_level || 'none',
      should_show_paywall: shouldShowPaywall,
      can_skip_paywall: strategy.can_skip,
      strategy: {
        id: strategy.id,
        name: strategy.name,
        mode: strategy.mode,
      },
      trial_status: {
        trial_ended: trialEnded || false,
        trial_type: trial?.name || 'Unknown',
        days_remaining: daysRemaining,
        hours_remaining: hoursRemaining,
      },
    };

    return ok(response, request);

  } catch (error: any) {
    console.error('[CheckAccess] Unexpected error:', error);
    return badRequest(error?.message || 'Internal server error', request);
  }
}
