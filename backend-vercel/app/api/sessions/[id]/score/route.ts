import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  calcSessionUVDose,
  calcDailyTotals,
  calcOutdoorConfidence as calcConfidence,
  isMorningSession,
  SHADE_FACTORS,
  EXPOSURE_FACTORS,
  PROTECTION_FACTORS,
} from '@/services/sunDoseCalculator';
import { getWeatherForSession } from '@/services/weatherEnrichment';
import { calcOutdoorConfidence } from '@/services/outdoorConfidence';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/sessions/[id]/score
 *
 * Re-scores a single session:
 * 1. Fetches session from DB
 * 2. Gets weather for session time + location
 * 3. Reads/applies modifiers
 * 4. Calculates UV dose score
 * 5. Stores results to session_weather, session_modifiers, sun_sessions
 * 6. Rebuilds daily_summaries for that date
 *
 * Returns: { session: SunSession, dailyTotals: DailyTotals }
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const sessionId = context.params.id;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this session
    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('sun_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 2. Get weather for session time + location
    const sessionTime = new Date(session.started_at);
    const weather = await getWeatherForSession(session.latitude, session.longitude, sessionTime);

    // 3. Get or use default modifiers
    const { data: modifiers } = await supabase
      .from('session_modifiers')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    // Get user profile for defaults
    const { data: profile } = await supabase
      .from('user_sun_profile')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    const shadeFactor = modifiers?.shade_factor ?? SHADE_FACTORS[profile?.default_shade ?? 'full_sun'] ?? 1.0;
    const exposureFactor = modifiers?.exposure_factor ?? EXPOSURE_FACTORS[profile?.default_exposure ?? 'shorts_tshirt'] ?? 0.75;
    const protectionFactor = modifiers?.protection_factor ?? PROTECTION_FACTORS[profile?.default_protection ?? 'none'] ?? 1.0;

    // 4. Calculate outdoor confidence from session signals
    const durationMinutes = session.duration_minutes ?? 0;
    const startTime = new Date(session.started_at);
    const endTime = new Date(session.ended_at);
    const locationFreshSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    const isDaylight = weather.isDaylight;
    const speed = session.speed ?? 0;

    const confidenceScore = calcOutdoorConfidence({
      motionType: session.motion_type ?? 'unknown',
      isDaylight,
      locationFreshSeconds,
      distanceMovedMeters: 100, // approximation — could improve with route data
      speed,
      durationMinutes,
    });

    // 5. Calculate UV dose
    const uvDoseScore = calcSessionUVDose({
      durationMinutes,
      uvIndex: weather.uvIndex,
      outdoorConfidence: confidenceScore,
      cloudFactor: weather.cloudFactor,
      shadeFactor,
      exposureFactor,
      protectionFactor,
    });

    const daylightMinutesEffective = durationMinutes * confidenceScore;

    // Store weather snapshot
    await supabase.from('session_weather').upsert({
      session_id: sessionId,
      uv_index: weather.uvIndex,
      cloud_cover: weather.cloudCover,
      cloud_factor: weather.cloudFactor,
      condition: weather.cloudCover < 30 ? 'clear' : weather.cloudCover < 70 ? 'partly_cloudy' : 'cloudy',
      sunrise_time: weather.sunriseTime,
      sunset_time: weather.sunsetTime,
      temperature_c: null, // Open-Meteo forecast API doesn't return temperature in this request
      provider: weather.provider,
      fetched_at: weather.fetchedAt,
    });

    // Upsert modifiers with source
    if (!modifiers) {
      await supabase.from('session_modifiers').insert({
        session_id: sessionId,
        shade_factor: shadeFactor,
        exposure_factor: exposureFactor,
        protection_factor: protectionFactor,
        source: 'default',
      });
    }

    // Update session with dose + confidence
    const { data: updatedSession, error: updateError } = await supabase
      .from('sun_sessions')
      .update({
        uv_dose_score: uvDoseScore,
        outdoor_confidence: confidenceScore,
        daylight_minutes_effective: daylightMinutesEffective,
        motion_type: session.motion_type ?? 'unknown',
        calc_version: 1,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 6. Rebuild daily_summaries for that date
    const dateLocal = sessionTime.toISOString().split('T')[0];
    await recalculateDailyTotals(user.user.id, dateLocal);

    // Fetch updated daily totals
    const { data: dailySummary } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('date_local', dateLocal)
      .single();

    return NextResponse.json({
      session: updatedSession,
      daily: dailySummary,
    });
  } catch (error) {
    console.error('[score endpoint]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper: recalculate daily totals for a date.
 */
async function recalculateDailyTotals(userId: string, dateLocal: string): Promise<void> {
  // Fetch all sessions for this day
  const dateStart = `${dateLocal}T00:00:00Z`;
  const dateEnd = `${dateLocal}T23:59:59Z`;

  const { data: sessions } = await supabase
    .from('sun_sessions')
    .select('*, session_weather(*)')
    .eq('user_id', userId)
    .gte('started_at', dateStart)
    .lte('started_at', dateEnd)
    .order('started_at', { ascending: true });

  if (!sessions || sessions.length === 0) {
    // Clear or initialize daily summary for this day
    await supabase.from('daily_summaries').upsert({
      user_id: userId,
      date_local: dateLocal,
      uv_dose_score: 0,
      daylight_minutes: 0,
      morning_light_minutes: 0,
      overexposure_risk: 'low',
      session_count: 0,
      recalculated_at: new Date().toISOString(),
    });
    return;
  }

  // Get user profile for settings
  const { data: profile } = await supabase
    .from('user_sun_profile')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Calculate totals
  const scoredSessions = sessions.map((s) => ({
    id: s.id,
    durationMinutes: s.duration_minutes ?? 0,
    uvDoseScore: s.uv_dose_score ?? 0,
    daylightMinutesEffective: s.daylight_minutes_effective ?? 0,
    startTime: new Date(s.started_at),
    sunriseTime: s.session_weather?.[0]?.sunrise_time ? new Date(s.session_weather[0].sunrise_time) : undefined,
    motionType: s.motion_type ?? 'unknown',
  }));

  const dailyTotals = calcDailyTotals(
    scoredSessions,
    profile?.skin_sensitivity ?? 'medium',
    profile?.morning_window_hours ?? 3
  );

  // Upsert daily summary
  await supabase.from('daily_summaries').upsert({
    user_id: userId,
    date_local: dateLocal,
    uv_dose_score: dailyTotals.uvDoseScore,
    daylight_minutes: dailyTotals.daylightMinutes,
    morning_light_minutes: dailyTotals.morningLightMinutes,
    overexposure_risk: dailyTotals.overexposureRisk,
    session_count: sessions.length,
    recalculated_at: new Date().toISOString(),
  });
}
