/**
 * SunTrace - API Service
 *
 * All operations use real Supabase endpoints.
 * Auth is enforced on every call — RLS policies handle row-level access.
 * UV forecast data is fetched from Open-Meteo (no API key required).
 */

import { supabase } from '@/lib/supabase';
import { APP_CONFIG } from '@/constants/config';
import {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
  SunSession,
  CreateSessionInput,
  UpdateSessionInput,
  DailyStats,
  SunSpot,
  CreateSpotInput,
  Badge,
  UserBadge,
  SupplementLog,
  CoachMessage,
  CoachRole,
  DailyForecast,
  UVForecast,
  FitzpatrickSkinType,
} from '@/types/models';

// ============================================
// Auth helper
// ============================================

async function getAuthenticatedUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user;
}

// ============================================
// Profile operations
// ============================================

export async function getProfile(): Promise<Profile | null> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_profiles')
    .insert({
      user_id: user.id,
      skin_type: input.skin_type,
      age: input.age ?? null,
      daily_d_target_iu: input.daily_d_target_iu ?? 1000,
      notifications_enabled: input.notifications_enabled ?? false,
      healthkit_enabled: input.healthkit_enabled ?? false,
      location_enabled: input.location_enabled ?? false,
      streak_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_profiles')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Session operations
// ============================================

export async function createSession(input: CreateSessionInput): Promise<SunSession> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_sessions')
    .insert({
      user_id: user.id,
      started_at: input.started_at,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      location_name: input.location_name ?? null,
      uv_index_avg: input.uv_index_avg ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSession(id: string, input: UpdateSessionInput): Promise<SunSession> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_sessions')
    .update({ ...input })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSessions(limit = 50): Promise<SunSession[]> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getSessionsByDateRange(from: string, to: string): Promise<SunSession[]> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_sessions')
    .select('*')
    .eq('user_id', user.id)
    .gte('started_at', from)
    .lte('started_at', to)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ============================================
// Daily stats operations
// ============================================

export async function getDailyStats(date?: string): Promise<DailyStats | null> {
  const user = await getAuthenticatedUser();
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sun_daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', targetDate)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getWeeklyStats(): Promise<DailyStats[]> {
  const user = await getAuthenticatedUser();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const fromDate = sevenDaysAgo.toISOString().split('T')[0];
  const toDate = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sun_daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function upsertDailyStats(date: string, sessionData: Partial<DailyStats>): Promise<DailyStats> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_daily_stats')
    .upsert(
      {
        user_id: user.id,
        date,
        ...sessionData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// UV Forecast operations (Open-Meteo, no API key required)
// ============================================

export async function fetchUVForecast(lat: number, lng: number): Promise<DailyForecast[]> {
  const url = new URL(`${APP_CONFIG.API.OPEN_METEO_BASE}/forecast`);
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lng.toString());
  url.searchParams.set('hourly', 'uv_index,cloudcover,temperature_2m');
  url.searchParams.set('daily', 'uv_index_max,sunrise,sunset');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.API.TIMEOUT);

  let response: Response;
  try {
    response = await fetch(url.toString(), { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo fetch failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  // Parse hourly arrays from Open-Meteo response
  const hourlyTimes: string[] = json.hourly?.time ?? [];
  const hourlyUV: number[] = json.hourly?.uv_index ?? [];
  const hourlyCloud: number[] = json.hourly?.cloudcover ?? [];
  const hourlyTemp: number[] = json.hourly?.temperature_2m ?? [];

  const dailyDates: string[] = json.daily?.time ?? [];
  const dailyMaxUV: number[] = json.daily?.uv_index_max ?? [];
  const dailySunrise: string[] = json.daily?.sunrise ?? [];
  const dailySunset: string[] = json.daily?.sunset ?? [];

  // Group hourly entries by date
  const hoursByDate = new Map<string, UVForecast[]>();

  for (let i = 0; i < hourlyTimes.length; i++) {
    const isoTime = hourlyTimes[i]; // e.g. "2025-04-12T14:00"
    const date = isoTime.split('T')[0];
    const hour = parseInt(isoTime.split('T')[1]?.split(':')[0] ?? '0', 10);
    const uvIndex = hourlyUV[i] ?? 0;
    const cloudCover = hourlyCloud[i] ?? 0;
    const tempC = hourlyTemp[i] ?? 0;

    const entry: UVForecast = {
      date,
      hour,
      uv_index: uvIndex,
      cloud_cover_pct: cloudCover,
      temperature_c: tempC,
      is_best_window: false, // will be set below
    };

    if (!hoursByDate.has(date)) hoursByDate.set(date, []);
    hoursByDate.get(date)!.push(entry);
  }

  // Mark best windows: hours where UV >= LOW_MAX threshold and cloud cover < 50%
  for (const [, hours] of hoursByDate) {
    const peakUV = Math.max(...hours.map((h) => h.uv_index));
    const threshold = Math.max(APP_CONFIG.UV.LOW_MAX, peakUV * 0.6);

    for (const h of hours) {
      h.is_best_window = h.uv_index >= threshold && h.cloud_cover_pct < 50;
    }
  }

  // Assemble DailyForecast array
  const forecasts: DailyForecast[] = dailyDates.map((date, idx) => {
    const hours = hoursByDate.get(date) ?? [];
    const bestHours = hours.filter((h) => h.is_best_window);

    const avgUV =
      hours.length > 0
        ? hours.reduce((sum, h) => sum + h.uv_index, 0) / hours.length
        : 0;

    const avgCloud =
      hours.length > 0
        ? hours.reduce((sum, h) => sum + h.cloud_cover_pct, 0) / hours.length
        : 0;

    let bestWindowStart: string | undefined;
    let bestWindowEnd: string | undefined;

    if (bestHours.length > 0) {
      const firstBest = bestHours[0];
      const lastBest = bestHours[bestHours.length - 1];
      bestWindowStart = `${date}T${String(firstBest.hour).padStart(2, '0')}:00`;
      bestWindowEnd = `${date}T${String(lastBest.hour + 1).padStart(2, '0')}:00`;
    }

    return {
      date,
      max_uv: dailyMaxUV[idx] ?? 0,
      avg_uv: Math.round(avgUV * 10) / 10,
      best_window_start: bestWindowStart,
      best_window_end: bestWindowEnd,
      cloud_cover_pct: Math.round(avgCloud),
      sunrise: dailySunrise[idx],
      sunset: dailySunset[idx],
      forecast_hours: hours,
    };
  });

  return forecasts;
}

// ============================================
// Sun spots operations
// ============================================

export async function getSunSpots(lat?: number, lng?: number, radiusKm?: number): Promise<SunSpot[]> {
  const user = await getAuthenticatedUser();

  let query = supabase
    .from('sun_spots')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter by user's submitted spots or verified community spots
  query = query.or(`submitted_by.eq.${user.id},is_verified.eq.true`);

  if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
    // Approximate bounding box filter (1 degree lat ≈ 111 km)
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    query = query
      .gte('latitude', lat - latDelta)
      .lte('latitude', lat + latDelta)
      .gte('longitude', lng - lngDelta)
      .lte('longitude', lng + lngDelta);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createSunSpot(input: CreateSpotInput): Promise<SunSpot> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_spots')
    .insert({
      submitted_by: user.id,
      name: input.name,
      description: input.description ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country ?? null,
      spot_type: input.spot_type ?? null,
      is_verified: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Badges operations
// ============================================

export async function getUserBadges(): Promise<UserBadge[]> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_user_badges')
    .select('*, badge:sun_badges(*)')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserBadge[];
}

export async function checkAndAwardBadges(): Promise<UserBadge[]> {
  const user = await getAuthenticatedUser();

  // Fetch all badges and current user stats in parallel
  const [badgesResult, profileResult, existingBadgesResult, statsResult, sessionsResult] =
    await Promise.all([
      supabase.from('sun_badges').select('*'),
      supabase.from('sun_profiles').select('streak_count').eq('user_id', user.id).single(),
      supabase.from('sun_user_badges').select('badge_id').eq('user_id', user.id),
      supabase
        .from('sun_daily_stats')
        .select('total_d_earned_iu')
        .eq('user_id', user.id),
      supabase
        .from('sun_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

  if (badgesResult.error) throw badgesResult.error;
  if (profileResult.error) throw profileResult.error;
  if (existingBadgesResult.error) throw existingBadgesResult.error;

  const allBadges: Badge[] = badgesResult.data ?? [];
  const streakCount: number = profileResult.data?.streak_count ?? 0;
  const alreadyEarnedIds = new Set((existingBadgesResult.data ?? []).map((b) => b.badge_id));
  const totalVitaminD = (statsResult.data ?? []).reduce(
    (sum, row) => sum + (row.total_d_earned_iu ?? 0),
    0
  );
  const totalSessions = sessionsResult.count ?? 0;

  const newlyEarned: UserBadge[] = [];

  for (const badge of allBadges) {
    if (alreadyEarnedIds.has(badge.id)) continue;

    let qualifies = false;

    switch (badge.requirement_type) {
      case 'streak_days':
        qualifies = streakCount >= badge.requirement_value;
        break;
      case 'total_vitamin_d_iu':
        qualifies = totalVitaminD >= badge.requirement_value;
        break;
      case 'total_sessions':
        qualifies = totalSessions >= badge.requirement_value;
        break;
      default:
        // spots_visited and spots_submitted require separate logic — skip for now
        break;
    }

    if (qualifies) {
      const { data, error } = await supabase
        .from('sun_user_badges')
        .insert({
          user_id: user.id,
          badge_id: badge.id,
          earned_at: new Date().toISOString(),
        })
        .select('*, badge:sun_badges(*)')
        .single();

      if (!error && data) {
        newlyEarned.push(data as UserBadge);
      }
    }
  }

  return newlyEarned;
}

// ============================================
// Supplement log operations
// ============================================

export async function getSupplementLogs(days = 30): Promise<SupplementLog[]> {
  const user = await getAuthenticatedUser();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (days - 1));
  const fromStr = fromDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sun_supplement_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', fromStr)
    .order('date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function logSupplement(
  date: string,
  supplement_type: string,
  dose_iu: number,
  notes?: string
): Promise<SupplementLog> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_supplement_logs')
    .upsert(
      {
        user_id: user.id,
        date,
        supplement_type,
        dose_iu,
        notes: notes ?? null,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Coach message operations
// ============================================

export async function getCoachMessages(limit = 50): Promise<CoachMessage[]> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_coach_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function saveCoachMessage(
  role: CoachRole,
  content: string
): Promise<CoachMessage> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('sun_coach_messages')
    .insert({
      user_id: user.id,
      role,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Vitamin D calculation helpers
// ============================================

/**
 * Estimate IU of Vitamin D synthesised from sun exposure.
 *
 * Formula: uvIndex * skinTypeFactor * BASE_IU_PER_MINUTE * minutes
 *
 * @param uvIndex  Current UV index (0–16)
 * @param minutes  Duration of exposure in minutes
 * @param skinType Fitzpatrick skin type (1–6)
 * @returns        Estimated IU of Vitamin D3 synthesised
 */
export function calculateVitaminD(
  uvIndex: number,
  minutes: number,
  skinType: FitzpatrickSkinType
): number {
  const factors = APP_CONFIG.VITAMIN_D.SKIN_TYPE_FACTORS;
  const factor = factors[skinType - 1] ?? factors[0];
  const base = APP_CONFIG.VITAMIN_D.BASE_IU_PER_MINUTE;
  return Math.round(uvIndex * factor * base * minutes);
}

/**
 * Estimate the daily sun exposure in minutes needed to reach the target IU.
 *
 * Uses an assumed average mid-day UV of 4 as a baseline.
 * For a more accurate estimate the caller should pass the expected UV index.
 *
 * @param skinType Fitzpatrick skin type (1–6)
 * @param age      User age — older adults synthesise Vitamin D less efficiently
 * @returns        Target minutes of sun exposure per day
 */
export function calculateDailyTarget(skinType: FitzpatrickSkinType, age: number): number {
  const factors = APP_CONFIG.VITAMIN_D.SKIN_TYPE_FACTORS;
  const factor = factors[skinType - 1] ?? factors[0];
  const base = APP_CONFIG.VITAMIN_D.BASE_IU_PER_MINUTE;
  const targetIU = APP_CONFIG.VITAMIN_D.DAILY_TARGET_IU;

  // Age adjustment: synthesis efficiency drops ~1% per year after 50
  const agePenalty = age > 50 ? 1 + (age - 50) * 0.01 : 1;

  // Assume UV index of 4 as a representative daytime midpoint
  const assumedUV = 4;
  const minutesBase = targetIU / (assumedUV * factor * base);
  return Math.round(minutesBase * agePenalty);
}

// ============================================
// Screen-friendly aliases & missing helpers
// ============================================

/** Alias: getTodayStats → getDailyStats for today's date */
export async function getTodayStats(): Promise<DailyStats | null> {
  return getDailyStats();
}

/** Alias: getStatsHistory → queries sun_daily_stats for the last N days */
export async function getStatsHistory(days = 7): Promise<DailyStats[]> {
  const user = await getAuthenticatedUser();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const fromDate = since.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sun_daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', fromDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Alias: endSession → updateSession */
export async function endSession(
  id: string,
  input: UpdateSessionInput
): Promise<SunSession> {
  return updateSession(id, input);
}

/** Alias: sendCoachMessage → saves user message and calls edge function */
export async function sendCoachMessage(content: string): Promise<CoachMessage> {
  const user = await getAuthenticatedUser();

  const { data: userMsg, error: insertError } = await supabase
    .from('sun_coach_messages')
    .insert({ user_id: user.id, role: 'user', content })
    .select()
    .single();

  if (insertError) throw insertError;

  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    'coach-chat',
    { body: { message: content, userId: user.id } }
  );

  if (fnError) throw fnError;

  const { data: assistantMsg, error: assistantError } = await supabase
    .from('sun_coach_messages')
    .insert({
      user_id: user.id,
      role: 'assistant',
      content: fnData.response ?? '',
    })
    .select()
    .single();

  if (assistantError) throw assistantError;
  return assistantMsg;
}

/** Count today's user messages for the coach daily limit */
export async function getTodayCoachMessageCount(): Promise<number> {
  const user = await getAuthenticatedUser();
  const today = new Date().toISOString().split('T')[0];

  const { count, error } = await supabase
    .from('sun_coach_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user')
    .gte('created_at', `${today}T00:00:00Z`);

  if (error) throw error;
  return count ?? 0;
}

/** Get all badge definitions (no auth required) */
export async function getBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('sun_badges')
    .select('*')
    .order('requirement_value', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Fetch current UV index for given coordinates from Open-Meteo */
export async function fetchCurrentUV(lat: number, lng: number): Promise<number> {
  const base = APP_CONFIG.API.OPEN_METEO_BASE;
  const url =
    `${base}/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=uv_index&timezone=auto&forecast_days=1`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(APP_CONFIG.API.TIMEOUT),
  });

  if (!response.ok) throw new Error(`Open-Meteo error: ${response.status}`);

  const raw: { hourly?: { uv_index?: number[] } } = await response.json();
  const now = new Date();
  const currentHour = now.getHours();
  const uvValues = raw.hourly?.uv_index ?? [];
  return uvValues[currentHour] ?? 0;
}

/** Get the current auth user from Supabase */
export async function getAuthUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/** Delete a session by id (user must own it — enforced by RLS) */
export async function deleteSession(id: string): Promise<void> {
  const user = await getAuthenticatedUser();

  const { error } = await supabase
    .from('sun_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}
