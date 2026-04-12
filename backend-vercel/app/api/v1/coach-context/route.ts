// POST /api/v1/coach-context
// Builds a structured context object used as the system prompt payload for the AI coach.
//
// Input:  { include_uv?: boolean }  (optional; fetches live UV if location available)
// Output: CoachContext — last 7 sessions, current streak, skin type, today's UV,
//         supplement log, recent badges, daily stats.
//
// Auth: Bearer JWT (user's Supabase access token)

import { ok, unauthorized, serverError, options } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

// ── Types ────────────────────────────────────────────────────────────────

export type RecentSession = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  location_name: string | null;
  uv_index_at_time: number | null;
  cloud_cover_pct: number | null;
  skin_areas_exposed: string[];
  sunscreen_applied: boolean;
  estimated_vitamin_d_iu: number;
};

export type TodayStats = {
  total_minutes: number;
  total_vitamin_d_iu: number;
  target_minutes: number;
  target_iu: number;
  sessions_count: number;
  max_uv_index: number;
  pct_of_goal: number;
};

export type RecentBadge = {
  code: string;
  name: string;
  icon: string;
  earned_at: string;
};

export type TodayUV = {
  uv_index_max: number;
  uv_index_clear_sky_max: number;
  sunrise: string;
  sunset: string;
  cloud_cover_avg_pct: number | null;
  source: 'live' | 'unavailable';
};

export type CoachContext = {
  user_id: string;
  profile: {
    skin_type: number;
    age: number | null;
    timezone: string;
    daily_target_minutes: number;
    streak_count: number;
    vitamin_d_supplements: boolean;
    health_sync_enabled: boolean;
  } | null;
  recent_sessions: RecentSession[];
  today_stats: TodayStats | null;
  today_uv: TodayUV | null;
  supplement_today: {
    vitamin_d_iu: number;
    vitamin_k2_mcg: number;
  } | null;
  recent_badges: RecentBadge[];
  coach_message_count: number;
  generated_at: string;
};

// ── UV forecast helper ───────────────────────────────────────────────────

async function fetchTodayUV(lat: number, lng: number): Promise<TodayUV | null> {
  try {
    const params = new URLSearchParams({
      latitude:  String(lat),
      longitude: String(lng),
      daily: 'uv_index_max,uv_index_clear_sky_max,sunrise,sunset,sunshine_duration',
      hourly: 'cloud_cover',
      forecast_days: '1',
      timezone: 'UTC',
    });

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) return null;

    const json: any = await res.json();
    const daily = json.daily;
    if (!daily?.time?.[0]) return null;

    const hourlyCover: number[] | undefined = json.hourly?.cloud_cover;
    let cloud_cover_avg_pct: number | null = null;
    if (hourlyCover?.length) {
      const slice = hourlyCover.filter((v: any) => v != null);
      if (slice.length) {
        cloud_cover_avg_pct = Math.round(
          slice.reduce((a: number, b: number) => a + b, 0) / slice.length
        );
      }
    }

    return {
      uv_index_max:           daily.uv_index_max?.[0]          ?? 0,
      uv_index_clear_sky_max: daily.uv_index_clear_sky_max?.[0] ?? 0,
      sunrise:                daily.sunrise?.[0]                ?? '',
      sunset:                 daily.sunset?.[0]                 ?? '',
      cloud_cover_avg_pct,
      source: 'live',
    };
  } catch {
    return null;
  }
}

// ── Handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    if (!user) return unauthorized('Authentication required', req);

    const body = await req.json().catch(() => ({}));
    const include_uv: boolean = body.include_uv !== false; // default true

    const supabase = getClientOrThrow(req);
    const userId = user.id;
    const today = new Date().toISOString().slice(0, 10);

    // ── Fetch in parallel ────────────────────────────────────────────────

    const [
      profileResult,
      sessionsResult,
      todayStatsResult,
      supplementResult,
      badgesResult,
      coachCountResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('skin_type, age, timezone, daily_target_minutes, streak_count, vitamin_d_supplements, health_sync_enabled, location_lat, location_lng')
        .eq('user_id', userId)
        .single(),

      supabase
        .from('sun_sessions')
        .select('id, started_at, ended_at, duration_minutes, location_name, uv_index_at_time, cloud_cover_pct, skin_areas_exposed, sunscreen_applied, estimated_vitamin_d_iu')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(7),

      supabase
        .from('daily_stats')
        .select('total_minutes, total_vitamin_d_iu, target_minutes, target_iu, sessions_count, max_uv_index')
        .eq('user_id', userId)
        .eq('date', today)
        .single(),

      supabase
        .from('supplement_logs')
        .select('vitamin_d_iu, vitamin_k2_mcg')
        .eq('user_id', userId)
        .eq('date', today)
        .single(),

      supabase
        .from('user_badges')
        .select('earned_at, badges(code, name, icon)')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(5),

      supabase
        .from('coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('role', 'user'),
    ]);

    // ── Build profile section ────────────────────────────────────────────

    const profile = profileResult.data
      ? {
          skin_type:            profileResult.data.skin_type,
          age:                  profileResult.data.age ?? null,
          timezone:             profileResult.data.timezone ?? 'UTC',
          daily_target_minutes: profileResult.data.daily_target_minutes ?? 20,
          streak_count:         profileResult.data.streak_count ?? 0,
          vitamin_d_supplements:profileResult.data.vitamin_d_supplements ?? false,
          health_sync_enabled:  profileResult.data.health_sync_enabled ?? false,
        }
      : null;

    // ── Build recent sessions ────────────────────────────────────────────

    const recent_sessions: RecentSession[] = (sessionsResult.data ?? []).map((s: any) => ({
      id:                    s.id,
      started_at:            s.started_at,
      ended_at:              s.ended_at ?? null,
      duration_minutes:      s.duration_minutes ?? null,
      location_name:         s.location_name ?? null,
      uv_index_at_time:      s.uv_index_at_time ?? null,
      cloud_cover_pct:       s.cloud_cover_pct ?? null,
      skin_areas_exposed:    s.skin_areas_exposed ?? [],
      sunscreen_applied:     s.sunscreen_applied ?? false,
      estimated_vitamin_d_iu:s.estimated_vitamin_d_iu ?? 0,
    }));

    // ── Build today stats ────────────────────────────────────────────────

    const ts = todayStatsResult.data;
    const today_stats: TodayStats | null = ts
      ? {
          total_minutes:    ts.total_minutes ?? 0,
          total_vitamin_d_iu: ts.total_vitamin_d_iu ?? 0,
          target_minutes:   ts.target_minutes ?? 20,
          target_iu:        ts.target_iu ?? 1000,
          sessions_count:   ts.sessions_count ?? 0,
          max_uv_index:     ts.max_uv_index ?? 0,
          pct_of_goal:      ts.target_minutes
            ? Math.round(((ts.total_minutes ?? 0) / ts.target_minutes) * 100)
            : 0,
        }
      : null;

    // ── Build supplement data ────────────────────────────────────────────

    const sd = supplementResult.data;
    const supplement_today = sd
      ? { vitamin_d_iu: sd.vitamin_d_iu ?? 0, vitamin_k2_mcg: sd.vitamin_k2_mcg ?? 0 }
      : null;

    // ── Build recent badges ──────────────────────────────────────────────

    const recent_badges: RecentBadge[] = (badgesResult.data ?? [])
      .map((ub: any) => {
        const badge = ub.badges;
        if (!badge) return null;
        return {
          code:      badge.code,
          name:      badge.name,
          icon:      badge.icon,
          earned_at: ub.earned_at,
        };
      })
      .filter(Boolean) as RecentBadge[];

    // ── Fetch live UV if requested and location is available ─────────────

    let today_uv: TodayUV | null = null;
    if (include_uv && profileResult.data?.location_lat && profileResult.data?.location_lng) {
      today_uv = await fetchTodayUV(
        profileResult.data.location_lat,
        profileResult.data.location_lng
      );
    }
    if (!today_uv) {
      today_uv = { uv_index_max: 0, uv_index_clear_sky_max: 0, sunrise: '', sunset: '', cloud_cover_avg_pct: null, source: 'unavailable' };
    }

    // ── Assemble final context ───────────────────────────────────────────

    const context: CoachContext = {
      user_id: userId,
      profile,
      recent_sessions,
      today_stats,
      today_uv,
      supplement_today,
      recent_badges,
      coach_message_count: coachCountResult.count ?? 0,
      generated_at: new Date().toISOString(),
    };

    return ok(context, req);
  } catch (err: any) {
    console.error('[coach-context] Unexpected error:', err?.message ?? err);
    return serverError(err?.message ?? 'Internal error', req);
  }
}
