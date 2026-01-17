/**
 * Track Review Prompt API
 * Records when review prompts are shown and user actions
 */

import { options, ok, badRequest, unauthorized } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';
import type { TrackReviewPromptRequest, TrackReviewPromptResponse } from '@/types/paywall-strategy';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * POST /api/v1/paywall/track-review-prompt
 * Records review prompt display and user action
 * 
 * Body:
 * - platform: 'mobile_ios' | 'mobile_android' | 'web'
 * - prompt_type: 'after_purchase' | 'after_usage'
 * - action_taken: 'reviewed' | 'dismissed' | 'later'
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
    let body: Omit<TrackReviewPromptRequest, 'user_id'>;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON', request);
    }

    if (!body.platform || !body.prompt_type || !body.action_taken) {
      return badRequest('Missing required fields: platform, prompt_type, action_taken', request);
    }

    // Insert review prompt record
    const { error: insertError } = await supabase
      .from('review_prompt_history')
      .insert({
        user_id: user.id,
        platform: body.platform,
        prompt_type: body.prompt_type,
        action_taken: body.action_taken,
        dismissed: body.action_taken !== 'reviewed',
        shown_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[TrackReviewPrompt] Error inserting:', insertError);
      return badRequest('Failed to track review prompt', request);
    }

    // Count prompts shown this year
    const currentYear = new Date().getFullYear();
    const { data: prompts } = await supabase
      .from('review_prompt_history')
      .select('id, shown_at')
      .eq('user_id', user.id)
      .gte('shown_at', `${currentYear}-01-01T00:00:00Z`)
      .lte('shown_at', `${currentYear}-12-31T23:59:59Z`);

    const promptsShownThisYear = prompts?.length || 0;

    // Check if user can show prompt again
    const { data: canShow } = await supabase
      .rpc('can_show_review_prompt', {
        p_user_id: user.id,
        p_platform: body.platform,
      });

    // Calculate next eligible date (90 days from now)
    const nextEligibleDate = new Date();
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);

    const response: TrackReviewPromptResponse = {
      success: true,
      prompts_shown_this_year: promptsShownThisYear,
      can_show_again: canShow || false,
      next_eligible_date: nextEligibleDate.toISOString(),
    };

    console.log(`[TrackReviewPrompt] User ${user.id} ${body.action_taken} review prompt on ${body.platform}`);

    return ok(response, request);

  } catch (error: any) {
    console.error('[TrackReviewPrompt] Unexpected error:', error);
    return badRequest(error?.message || 'Internal server error', request);
  }
}
