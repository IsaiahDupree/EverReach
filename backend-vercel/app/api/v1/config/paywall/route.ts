/**
 * Paywall Configuration API
 * 
 * GET /api/v1/config/paywall
 * Returns remote paywall configuration from feature flags
 */

import { options, ok, serverError } from '@/lib/cors';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';


interface PaywallConfig {
  hard_paywall_mode: boolean;
  show_paywall_after_onboarding: boolean;
  show_paywall_on_trial_end: boolean;
  show_video_onboarding_on_gate: boolean;
  show_review_prompt_after_payment: boolean;
  paywall_variant: string;
  video_onboarding_url: string;
  review_prompt_delay_ms: number;
}

const DEFAULT_CONFIG: PaywallConfig = {
  hard_paywall_mode: false,
  show_paywall_after_onboarding: false,
  show_paywall_on_trial_end: true,
  show_video_onboarding_on_gate: false,
  show_review_prompt_after_payment: true,
  paywall_variant: 'default',
  video_onboarding_url: '',
  review_prompt_delay_ms: 2000,
};

/**
 * GET /api/v1/config/paywall
 * Fetches paywall configuration from feature flags
 */
export async function GET(request: Request) {
  try {
    const supabase = getServiceClient();

    // Fetch all feature flags
    const { data: flags, error } = await supabase
      .from('feature_flags')
      .select('key, value, value_type')
      .in('key', [
        'hard_paywall_mode',
        'show_paywall_after_onboarding',
        'show_paywall_on_trial_end',
        'show_video_onboarding_on_gate',
        'show_review_prompt_after_payment',
        'paywall_variant',
        'video_onboarding_url',
        'review_prompt_delay_ms',
      ])
      .eq('enabled', true);

    if (error) {
      console.error('[PaywallConfig] Database error:', error);
      // Return default config on error
      return ok(DEFAULT_CONFIG, request, { 'Cache-Control': 'public, max-age=60' });
    }

    // Build config from flags
    const config: PaywallConfig = { ...DEFAULT_CONFIG };

    if (flags) {
      for (const flag of flags) {
        const key = flag.key as keyof PaywallConfig;
        
        // Parse value based on type and assign with proper typing
        if (flag.value_type === 'boolean') {
          (config as any)[key] = flag.value === 'true' || flag.value === true;
        } else if (flag.value_type === 'number') {
          (config as any)[key] = parseInt(flag.value, 10);
        } else {
          (config as any)[key] = flag.value;
        }
      }
    }

    return ok(config, request, { 'Cache-Control': 'public, max-age=60' });
  } catch (error: any) {
    console.error('[PaywallConfig] Unexpected error:', error);
    
    // Return default config on error with proper CORS
    return ok(DEFAULT_CONFIG, request, { 'Cache-Control': 'public, max-age=60' });
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export function OPTIONS(request: Request) {
  return options(request);
}
