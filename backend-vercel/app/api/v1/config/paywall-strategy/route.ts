/**
 * Paywall Strategy Configuration API
 * GET: Fetch active paywall config for platform
 * POST: Update paywall config (admin only)
 */

import { options, ok, badRequest, unauthorized } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';
import type {
  GetPaywallConfigResponse,
  UpdatePaywallConfigRequest,
  UpdatePaywallConfigResponse,
  Platform,
} from '@/types/paywall-strategy';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /api/v1/config/paywall-strategy
 * Fetches active paywall configuration for a platform
 * 
 * Query params:
 * - platform: 'mobile' | 'web' | 'all' (default: 'all')
 * - user_id: optional, for checking trial status
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const platformParam = url.searchParams.get('platform') as Platform || 'all';
    const userId = url.searchParams.get('user_id');

    const supabase = getClientOrThrow(request);

    // 1. Fetch active config for platform
    const { data: activeConfig, error: configError } = await supabase
      .from('active_paywall_config')
      .select('*')
      .or(`platform.eq.${platformParam},platform.eq.all`)
      .order('platform', { ascending: false }) // Prefer specific platform over 'all'
      .limit(1)
      .single();

    if (configError || !activeConfig) {
      console.error('[PaywallStrategy] Error fetching config:', configError);
      return badRequest('Failed to fetch paywall config', request);
    }

    // 2. Fetch strategy details
    const { data: strategy } = await supabase
      .from('paywall_strategies')
      .select('*')
      .eq('id', activeConfig.strategy_id)
      .single();

    // 3. Fetch presentation details
    const { data: presentation } = await supabase
      .from('paywall_presentations')
      .select('*')
      .eq('id', activeConfig.presentation_id)
      .single();

    // 4. Fetch trial type details
    const { data: trial } = await supabase
      .from('trial_types')
      .select('*')
      .eq('id', activeConfig.trial_type_id)
      .single();

    // 5. Fetch permissions for this strategy
    const { data: permissions } = await supabase
      .from('paywall_access_permissions')
      .select('*')
      .eq('strategy_id', activeConfig.strategy_id);

    // 6. Check trial status if user_id provided
    let trialEnded = false;
    let canShowReviewPrompt = false;
    let usageStats = undefined;

    if (userId) {
      // Check if trial has ended using database function
      const { data: trialData } = await supabase
        .rpc('has_trial_ended', {
          p_user_id: userId,
          p_trial_type_id: activeConfig.trial_type_id,
        });
      
      trialEnded = trialData || false;

      // Check if can show review prompt
      const mobilePlatform = platformParam === 'mobile' ? 'mobile_ios' : platformParam;
      const { data: reviewData } = await supabase
        .rpc('can_show_review_prompt', {
          p_user_id: userId,
          p_platform: mobilePlatform,
        });
      
      canShowReviewPrompt = reviewData || false;

      // Get usage stats if trial is usage-based
      if (trial?.type === 'usage') {
        const { data: usage } = await supabase
          .from('user_usage_tracking')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (usage) {
          const hoursUsed = Math.floor(usage.total_active_minutes / 60);
          usageStats = {
            total_active_minutes: usage.total_active_minutes,
            total_sessions: usage.total_sessions,
            hours_remaining: trial.usage_hours 
              ? Math.max(0, trial.usage_hours - hoursUsed)
              : undefined,
            sessions_remaining: trial.usage_sessions
              ? Math.max(0, trial.usage_sessions - usage.total_sessions)
              : undefined,
          };
        }
      }
    }

    const response: GetPaywallConfigResponse = {
      strategy: strategy || {} as any,
      presentation: presentation || {} as any,
      trial: trial || {} as any,
      permissions: permissions || [],
      trial_ended: trialEnded,
      can_show_review_prompt: canShowReviewPrompt,
      usage_stats: usageStats,
    };

    return ok(response, request, { 'Cache-Control': 'public, max-age=60' });

  } catch (error: any) {
    console.error('[PaywallStrategy] Unexpected error:', error);
    return badRequest(error?.message || 'Internal server error', request);
  }
}

/**
 * POST /api/v1/config/paywall-strategy
 * Updates active paywall configuration (admin only)
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
    let body: UpdatePaywallConfigRequest;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON', request);
    }

    // Validate required fields
    if (!body.platform || !body.strategy_id || !body.presentation_id || !body.trial_type_id) {
      return badRequest('Missing required fields: platform, strategy_id, presentation_id, trial_type_id', request);
    }

    // Verify strategy, presentation, and trial exist
    const { data: strategy } = await supabase
      .from('paywall_strategies')
      .select('id')
      .eq('id', body.strategy_id)
      .single();

    if (!strategy) {
      return badRequest(`Strategy '${body.strategy_id}' not found`, request);
    }

    const { data: presentation } = await supabase
      .from('paywall_presentations')
      .select('id')
      .eq('id', body.presentation_id)
      .single();

    if (!presentation) {
      return badRequest(`Presentation '${body.presentation_id}' not found`, request);
    }

    const { data: trial } = await supabase
      .from('trial_types')
      .select('id')
      .eq('id', body.trial_type_id)
      .single();

    if (!trial) {
      return badRequest(`Trial type '${body.trial_type_id}' not found`, request);
    }

    // Get current config before updating (for change history)
    const { data: oldConfig } = await supabase
      .from('active_paywall_config')
      .select('*')
      .eq('platform', body.platform)
      .single();

    // Upsert config
    const { data: updatedConfig, error } = await supabase
      .from('active_paywall_config')
      .upsert({
        platform: body.platform,
        strategy_id: body.strategy_id,
        presentation_id: body.presentation_id,
        trial_type_id: body.trial_type_id,
        enable_mobile_review_prompts: body.enable_mobile_review_prompts ?? true,
        enable_web_review_prompts: body.enable_web_review_prompts ?? true,
        review_prompt_delay_minutes: body.review_prompt_delay_minutes ?? 1440,
        review_prompts_per_year: body.review_prompts_per_year ?? 4,
        review_prompt_min_sessions: body.review_prompt_min_sessions ?? 5,
        usage_cap_hours: body.usage_cap_hours ?? null,
        usage_cap_sessions: body.usage_cap_sessions ?? null,
        enable_hard_hard_for_flagged: body.enable_hard_hard_for_flagged ?? false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'platform',
      })
      .select()
      .single();

    if (error) {
      console.error('[PaywallStrategy] Error updating config:', error);
      return badRequest('Failed to update config', request);
    }

    // Log config change to history
    if (oldConfig) {
      const oldConfigJson = {
        strategy_id: oldConfig.strategy_id,
        presentation_id: oldConfig.presentation_id,
        trial_type_id: oldConfig.trial_type_id,
        review_prompt_delay_minutes: oldConfig.review_prompt_delay_minutes,
      };

      const newConfigJson = {
        strategy_id: body.strategy_id,
        presentation_id: body.presentation_id,
        trial_type_id: body.trial_type_id,
        review_prompt_delay_minutes: body.review_prompt_delay_minutes ?? 1440,
      };

      const summaryOld = `${oldConfig.strategy_id} + ${oldConfig.presentation_id} + ${oldConfig.trial_type_id}`;
      const summaryNew = `${body.strategy_id} + ${body.presentation_id} + ${body.trial_type_id}`;

      // Determine change type
      let changeType = 'full_config';
      if (oldConfig.strategy_id !== body.strategy_id) changeType = 'strategy';
      else if (oldConfig.presentation_id !== body.presentation_id) changeType = 'presentation';
      else if (oldConfig.trial_type_id !== body.trial_type_id) changeType = 'trial';

      await supabase.from('paywall_config_changes').insert({
        change_type: changeType,
        platform: body.platform,
        old_config: oldConfigJson,
        new_config: newConfigJson,
        changed_by: user.id,
        environment: 'production',
        notes: body.notes || null,
        summary_old: summaryOld,
        summary_new: summaryNew,
      });

      console.log(`[PaywallStrategy] Logged config change: ${changeType} for ${body.platform}`);
    }

    const response: UpdatePaywallConfigResponse = {
      success: true,
      config: updatedConfig,
    };

    console.log(`[PaywallStrategy] Updated ${body.platform} config to strategy=${body.strategy_id}, presentation=${body.presentation_id}, trial=${body.trial_type_id}`);

    return ok(response, request);

  } catch (error: any) {
    console.error('[PaywallStrategy] Unexpected error:', error);
    return badRequest(error?.message || 'Internal server error', request);
  }
}
