/**
 * Update User Usage API
 * Tracks user session time and count for usage-based trials
 */

import { options, ok, badRequest, unauthorized } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';
import type { UpdateUsageRequest, UpdateUsageResponse } from '@/types/paywall-strategy';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * POST /api/v1/paywall/update-usage
 * Updates user usage tracking for trial limits
 * 
 * Body:
 * - session_minutes: number (optional, minutes to add to total)
 * - increment_sessions: boolean (optional, whether to increment session count)
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
    let body: Omit<UpdateUsageRequest, 'user_id'>;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON', request);
    }

    // Get or create usage record
    const { data: existingUsage } = await supabase
      .from('user_usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let totalActiveMinutes = existingUsage?.total_active_minutes || 0;
    let totalSessions = existingUsage?.total_sessions || 0;

    // Update usage
    if (body.session_minutes && body.session_minutes > 0) {
      totalActiveMinutes += body.session_minutes;
    }

    if (body.increment_sessions) {
      totalSessions += 1;
    }

    // Upsert usage record
    const { data: updatedUsage, error } = await supabase
      .from('user_usage_tracking')
      .upsert({
        user_id: user.id,
        total_active_minutes: totalActiveMinutes,
        total_sessions: totalSessions,
        last_session_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[UpdateUsage] Error updating usage:', error);
      return badRequest('Failed to update usage', request);
    }

    // Get active config to check trial type
    const platform = request.headers.get('X-Platform') || 'web';
    const { data: activeConfig } = await supabase
      .from('active_paywall_config')
      .select('trial_type_id')
      .or(`platform.eq.${platform},platform.eq.all`)
      .order('platform', { ascending: false })
      .limit(1)
      .single();

    // Check if trial has ended
    let trialEnded = false;
    if (activeConfig?.trial_type_id) {
      const { data: trialEndedData } = await supabase
        .rpc('has_trial_ended', {
          p_user_id: user.id,
          p_trial_type_id: activeConfig.trial_type_id,
        });
      
      trialEnded = trialEndedData || false;
    }

    const response: UpdateUsageResponse = {
      success: true,
      total_active_minutes: updatedUsage.total_active_minutes,
      total_sessions: updatedUsage.total_sessions,
      trial_ended: trialEnded,
    };

    if (trialEnded) {
      console.log(`[UpdateUsage] Trial ended for user ${user.id} (${totalActiveMinutes} min, ${totalSessions} sessions)`);
    }

    return ok(response, request);

  } catch (error: any) {
    console.error('[UpdateUsage] Unexpected error:', error);
    return badRequest(error?.message || 'Internal server error', request);
  }
}
