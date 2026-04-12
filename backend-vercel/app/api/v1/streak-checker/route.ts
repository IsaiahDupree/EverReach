// POST /api/v1/streak-checker
// Cron job: runs nightly at 3 AM UTC via Vercel Cron.
// Resets streak_count to 0 for any user who has no session today or yesterday.
// Uses service-role client (bypasses RLS) — auth is via CRON_SECRET.
//
// Vercel cron config (vercel.json):
//   { "path": "/api/v1/streak-checker", "schedule": "0 3 * * *" }

import { ok, serverError, options } from '@/lib/cors';
import { verifyCron } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

type StreakResetResult = {
  user_id: string;
  previous_streak: number;
};

export async function POST(req: Request) {
  try {
    // Fail-closed: throws 401 if CRON_SECRET is missing or wrong
    verifyCron(req);

    const supabase = getServiceClient();
    const now = new Date();

    // Compute today and yesterday in UTC date strings (YYYY-MM-DD)
    const todayUTC = now.toISOString().slice(0, 10);
    const yesterdayUTC = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

    // Fetch all profiles that have a non-zero streak and have not been updated today by a session
    // We consider a streak valid if last_session_date is today OR yesterday.
    // Any profile where last_session_date is older than yesterday gets reset.
    const { data: staleProfiles, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, streak_count, last_session_date')
      .gt('streak_count', 0)
      .not('last_session_date', 'in', `("${todayUTC}","${yesterdayUTC}")`);

    if (fetchError) {
      console.error('[streak-checker] Failed to fetch profiles:', fetchError.message);
      return serverError('Failed to fetch profiles', req);
    }

    if (!staleProfiles || staleProfiles.length === 0) {
      console.log('[streak-checker] No streaks to reset.');
      return ok({ reset_count: 0, message: 'No streaks required resetting' }, req);
    }

    // Batch reset streak_count to 0 for all stale users
    const userIds = staleProfiles.map((p: any) => p.user_id);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ streak_count: 0, updated_at: now.toISOString() })
      .in('user_id', userIds);

    if (updateError) {
      console.error('[streak-checker] Failed to reset streaks:', updateError.message);
      return serverError('Failed to reset streaks', req);
    }

    const resetDetails: StreakResetResult[] = staleProfiles.map((p: any) => ({
      user_id: p.user_id,
      previous_streak: p.streak_count,
    }));

    console.log(
      `[streak-checker] Reset ${resetDetails.length} streak(s). ` +
      `Users: ${userIds.join(', ')}`
    );

    return ok({
      reset_count: resetDetails.length,
      run_at: now.toISOString(),
      today_utc: todayUTC,
      yesterday_utc: yesterdayUTC,
      resets: resetDetails,
    }, req);
  } catch (err: any) {
    // verifyCron throws a Response — re-throw so Next.js returns it as-is
    if (err instanceof Response) throw err;
    console.error('[streak-checker] Unexpected error:', err?.message ?? err);
    return serverError(err?.message ?? 'Internal error', req);
  }
}

// Support GET for Vercel Cron (Vercel sends GET for scheduled jobs by default)
export async function GET(req: Request) {
  return POST(req);
}
