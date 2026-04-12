// POST /api/v1/badge-evaluator
// Called after a session insert to check and award eligible badges.
// Input: { user_id: string }
// Checks: streak_days, session_count, total_iu, spots_visited, coach_messages
// Awards any badges not yet earned; returns array of newly awarded badge codes.

import { ok, badRequest, unauthorized, serverError, options } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

type BadgeRow = {
  id: string;
  code: string;
  name: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
};

type UserStats = {
  streak_count: number;
  session_count: number;
  total_iu: number;
  spots_visited: number;
  coach_messages: number;
};

async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = getServiceClient();

  // Fetch profile streak
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_count')
    .eq('user_id', userId)
    .single();

  // Total session count
  const { count: sessionCount } = await supabase
    .from('sun_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Total vitamin D produced across all sessions
  const { data: iuData } = await supabase
    .from('sun_sessions')
    .select('estimated_vitamin_d_iu')
    .eq('user_id', userId);
  const totalIu = (iuData ?? []).reduce(
    (sum: number, row: any) => sum + (row.estimated_vitamin_d_iu ?? 0),
    0
  );

  // Distinct sun spots visited (distinct location_name values)
  const { data: spotsData } = await supabase
    .from('sun_sessions')
    .select('location_name')
    .eq('user_id', userId)
    .not('location_name', 'is', null);
  const uniqueSpots = new Set((spotsData ?? []).map((r: any) => r.location_name)).size;

  // Total coach messages sent by user
  const { count: coachCount } = await supabase
    .from('coach_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user');

  return {
    streak_count: profile?.streak_count ?? 0,
    session_count: sessionCount ?? 0,
    total_iu: totalIu,
    spots_visited: uniqueSpots,
    coach_messages: coachCount ?? 0,
  };
}

function meetsRequirement(
  stats: UserStats,
  requirement_type: string,
  requirement_value: number
): boolean {
  switch (requirement_type) {
    case 'streak_days':     return stats.streak_count >= requirement_value;
    case 'session_count':   return stats.session_count >= requirement_value;
    case 'total_iu':        return stats.total_iu >= requirement_value;
    case 'spots_visited':   return stats.spots_visited >= requirement_value;
    case 'coach_messages':  return stats.coach_messages >= requirement_value;
    default:                return false;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    if (!user) return unauthorized('Authentication required', req);

    const body = await req.json().catch(() => ({}));
    const target_user_id: string = body.user_id ?? user.id;

    // Only allow users to evaluate their own badges (or service calls with valid JWT)
    if (target_user_id !== user.id) {
      return unauthorized('Cannot evaluate badges for another user', req);
    }

    const supabase = getServiceClient();

    // Fetch all badges
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('id, code, name, icon, requirement_type, requirement_value');

    if (badgesError) {
      console.error('[badge-evaluator] Failed to load badges:', badgesError.message);
      return serverError('Failed to load badge definitions', req);
    }

    // Fetch already-earned badge IDs for this user
    const { data: earned, error: earnedError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', target_user_id);

    if (earnedError) {
      console.error('[badge-evaluator] Failed to load earned badges:', earnedError.message);
      return serverError('Failed to load earned badges', req);
    }

    const earnedIds = new Set((earned ?? []).map((r: any) => r.badge_id));
    const unearnedBadges = (allBadges ?? []).filter(
      (b: BadgeRow) => !earnedIds.has(b.id)
    ) as BadgeRow[];

    if (unearnedBadges.length === 0) {
      return ok({ awarded: [], message: 'All badges already earned' }, req);
    }

    // Compute current user stats
    const stats = await getUserStats(target_user_id);

    // Determine which badges are now earned
    const newlyEarned = unearnedBadges.filter((b) =>
      meetsRequirement(stats, b.requirement_type, b.requirement_value)
    );

    if (newlyEarned.length === 0) {
      return ok({ awarded: [], stats }, req);
    }

    // Insert new user_badges rows
    const rows = newlyEarned.map((b) => ({
      user_id: target_user_id,
      badge_id: b.id,
      earned_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('user_badges')
      .insert(rows)
      .select();

    if (insertError) {
      console.error('[badge-evaluator] Failed to award badges:', insertError.message);
      return serverError('Failed to award badges', req);
    }

    const awarded = newlyEarned.map((b) => ({
      code: b.code,
      name: b.name,
      icon: b.icon,
    }));

    console.log(
      `[badge-evaluator] Awarded ${awarded.length} badge(s) to user ${target_user_id}:`,
      awarded.map((b) => b.code).join(', ')
    );

    return ok({ awarded, stats }, req);
  } catch (err: any) {
    console.error('[badge-evaluator] Unexpected error:', err?.message ?? err);
    return serverError(err?.message ?? 'Internal error', req);
  }
}
