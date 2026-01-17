import { options, ok, serverError } from "@/lib/cors";
import { createClient } from '@supabase/supabase-js';

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /api/v1/config/paywall-strategy
 * 
 * Alias for /api/v1/config/paywall with platform parameter support.
 * Returns remote paywall configuration from database.
 * 
 * Query params:
 * - platform: 'mobile' | 'web' | 'ios' | 'android' (optional, for analytics)
 * 
 * No authentication required - public configuration endpoint.
 */
export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract platform from query params
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform') || 'mobile';
    
    // Map platform to valid values for RPC
    let rpcPlatform = 'ios'; // default
    if (platform === 'android' || platform === 'mobile') {
      rpcPlatform = 'android';
    } else if (platform === 'ios') {
      rpcPlatform = 'ios';
    } else if (platform === 'web') {
      rpcPlatform = 'web';
    }

    // Get active paywall config from database with platform parameter
    const { data, error } = await supabase.rpc('get_active_paywall_config', { 
      p_platform: rpcPlatform 
    });

    if (error) {
      console.error('[Paywall Strategy] Database error:', error);
      // Return safe defaults on error
      return ok({
        config_name: 'default_fallback',
        strategy: 'soft',
        hard_paywall_mode: false,
        show_paywall_after_onboarding: false,
        show_paywall_on_trial_end: false,
        gate_voice_notes: true,
        gate_compose_runs: true,
        gate_screenshot_ocr: true,
        gate_advanced_analytics: true,
        gate_unlimited_contacts: true,
        trial_duration_days: 7,
        show_trial_countdown: true,
        trial_grace_period_hours: 0,
        paywall_variant: 'default',
        show_video_onboarding_on_gate: false,
        video_onboarding_url: '',
        show_review_prompt_after_payment: true,
        review_prompt_delay_ms: 2000,
      }, req);
    }

    // If no active config found, return safe defaults (soft paywall)
    if (!data || data.length === 0) {
      console.warn('[Paywall Strategy] No active config found, using defaults');
      return ok({
        config_name: 'default_fallback',
        strategy: 'soft',
        hard_paywall_mode: false,
        show_paywall_after_onboarding: false,
        show_paywall_on_trial_end: false,
        gate_voice_notes: true,
        gate_compose_runs: true,
        gate_screenshot_ocr: true,
        gate_advanced_analytics: true,
        gate_unlimited_contacts: true,
        trial_duration_days: 7,
        show_trial_countdown: true,
        trial_grace_period_hours: 0,
        paywall_variant: 'default',
        show_video_onboarding_on_gate: false,
        video_onboarding_url: '',
        show_review_prompt_after_payment: true,
        review_prompt_delay_ms: 2000,
      }, req);
    }

    const config = data[0];
    
    console.log('[Paywall Strategy] Returning config:', config.config_name || config.platform, 'strategy:', config.strategy || config.provider, 'platform:', platform);

    return ok(config, req);
  } catch (e: any) {
    console.error('[Paywall Strategy] Error:', e);
    return serverError(e?.message || 'Internal error', req);
  }
}
