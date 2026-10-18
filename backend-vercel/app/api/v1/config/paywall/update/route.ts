/**
 * Paywall Configuration Update API
 * Admin endpoint to update feature flags
 * 
 * POST /api/v1/config/paywall/update
 */

import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

interface UpdatePaywallRequest {
  hard_paywall_mode?: boolean;
  show_paywall_after_onboarding?: boolean;
  show_paywall_on_trial_end?: boolean;
  show_video_onboarding_on_gate?: boolean;
  show_review_prompt_after_payment?: boolean;
  paywall_variant?: string;
  video_onboarding_url?: string;
  review_prompt_delay_ms?: number;
  change_reason?: string;
}

export async function POST(request: Request) {
  try {
    // Auth check - require authenticated user
    const user = await getUser(request);
    if (!user) {
      return unauthorized('Authentication required', request);
    }

    // Parse request body
    let body: UpdatePaywallRequest;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON', request);
    }

    const supabase = getClientOrThrow(request);

    // Get user email for history tracking
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .single();

    const userEmail = profile?.email || 'unknown';

    // Update each feature flag
    const updates: Array<{ key: string; value: string; value_type: string }> = [];

    if (body.hard_paywall_mode !== undefined) {
      updates.push({
        key: 'hard_paywall_mode',
        value: String(body.hard_paywall_mode),
        value_type: 'boolean'
      });
    }

    if (body.show_paywall_after_onboarding !== undefined) {
      updates.push({
        key: 'show_paywall_after_onboarding',
        value: String(body.show_paywall_after_onboarding),
        value_type: 'boolean'
      });
    }

    if (body.show_paywall_on_trial_end !== undefined) {
      updates.push({
        key: 'show_paywall_on_trial_end',
        value: String(body.show_paywall_on_trial_end),
        value_type: 'boolean'
      });
    }

    if (body.show_video_onboarding_on_gate !== undefined) {
      updates.push({
        key: 'show_video_onboarding_on_gate',
        value: String(body.show_video_onboarding_on_gate),
        value_type: 'boolean'
      });
    }

    if (body.show_review_prompt_after_payment !== undefined) {
      updates.push({
        key: 'show_review_prompt_after_payment',
        value: String(body.show_review_prompt_after_payment),
        value_type: 'boolean'
      });
    }

    if (body.paywall_variant !== undefined) {
      updates.push({
        key: 'paywall_variant',
        value: body.paywall_variant,
        value_type: 'string'
      });
    }

    if (body.video_onboarding_url !== undefined) {
      updates.push({
        key: 'video_onboarding_url',
        value: body.video_onboarding_url,
        value_type: 'string'
      });
    }

    if (body.review_prompt_delay_ms !== undefined) {
      updates.push({
        key: 'review_prompt_delay_ms',
        value: String(body.review_prompt_delay_ms),
        value_type: 'number'
      });
    }

    if (updates.length === 0) {
      return badRequest('No updates provided', request);
    }

    // Update each flag
    const results = [];
    for (const update of updates) {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({
          value: update.value,
          value_type: update.value_type,
          updated_at: new Date().toISOString()
        })
        .eq('key', update.key)
        .select()
        .single();

      if (error) {
        console.error(`[PaywallUpdate] Error updating ${update.key}:`, error);
        return serverError(`Failed to update ${update.key}`, request);
      }

      // Log to history
      await supabase
        .from('feature_flag_history')
        .insert({
          flag_id: data.id,
          flag_key: update.key,
          old_value: data.value,
          new_value: update.value,
          changed_by: user.id,
          changed_by_email: userEmail,
          change_reason: body.change_reason || 'Dashboard update'
        });

      results.push(data);
    }

    console.log(`[PaywallUpdate] Updated ${updates.length} flags by ${userEmail}`);

    return ok({
      success: true,
      updated: results.length,
      flags: results,
      message: `Successfully updated ${results.length} configuration${results.length > 1 ? 's' : ''}`
    }, request);

  } catch (error: any) {
    console.error('[PaywallUpdate] Unexpected error:', error);
    return serverError(error?.message || 'Internal server error', request);
  }
}
