import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  calcSessionUVDose,
  calcDailyTotals,
  SHADE_FACTORS,
  EXPOSURE_FACTORS,
  PROTECTION_FACTORS,
} from '@/services/sunDoseCalculator';
import { calcOutdoorConfidence } from '@/services/outdoorConfidence';
import { getWeatherForSession } from '@/services/weatherEnrichment';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/daily/recalculate
 *
 * Body: { date: "2026-04-12", userId?: "..." }
 * (userId required if not authenticated via token)
 *
 * Re-scores all sessions for a day, rebuilds daily_summaries.
 * Returns: { dailyTotals, sessionCount }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('Authorization');
    const body = await request.json();
    const { date, userId: bodyUserId } = body;

    if (!date) {
      return NextResponse.json({ error: 'Missing date' }, { status: 400 });
    }

    let userId = bodyUserId;
    if (!userId && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: user, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all sessions for this date
    const dateStart = `${date}T00:00:00Z`;
    const dateEnd = `${date}T23:59:59Z`;

    const { data: sessions, error: sessionsError } = await supabase
      .from('sun_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', dateStart)
      .lte('started_at', dateEnd)
      .order('started_at', { ascending: true });

    if (sessionsError) {
      throw sessionsError;
    }

    if (!sessions || sessions.length === 0) {
      // No sessions — clear daily summary
      await supabase.from('daily_summaries').upsert({
        user_id: userId,
        date_local: date,
        uv_dose_score: 0,
        daylight_minutes: 0,
        morning_light_minutes: 0,
        overexposure_risk: 'low',
        session_count: 0,
        recalculated_at: new Date().toISOString(),
      });

      return NextResponse.json({
        dailyTotals: {
          uvDoseScore: 0,
          daylightMinutes: 0,
          morningLightMinutes: 0,
          overexposureRisk: 'low',
        },
        sessionCount: 0,
      });
    }

    // Get user profile for defaults
    const { data: profile } = await supabase
      .from('user_sun_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Re-score each session
    const scoredSessions = [];

    for (const session of sessions) {
      try {
        const sessionTime = new Date(session.started_at);
        const weather = await getWeatherForSession(
          session.latitude,
          session.longitude,
          sessionTime
        );

        // Get or use default modifiers
        const { data: modifiers } = await supabase
          .from('session_modifiers')
          .select('*')
          .eq('session_id', session.id)
          .single();

        const shadeFactor = modifiers?.shade_factor ?? SHADE_FACTORS[profile?.default_shade ?? 'full_sun'] ?? 1.0;
        const exposureFactor = modifiers?.exposure_factor ?? EXPOSURE_FACTORS[profile?.default_exposure ?? 'shorts_tshirt'] ?? 0.75;
        const protectionFactor = modifiers?.protection_factor ?? PROTECTION_FACTORS[profile?.default_protection ?? 'none'] ?? 1.0;

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
          distanceMovedMeters: 100,
          speed,
          durationMinutes,
        });

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

        // Store weather
        await supabase.from('session_weather').upsert({
          session_id: session.id,
          uv_index: weather.uvIndex,
          cloud_cover: weather.cloudCover,
          cloud_factor: weather.cloudFactor,
          sunrise_time: weather.sunriseTime,
          sunset_time: weather.sunsetTime,
          provider: weather.provider,
          fetched_at: weather.fetchedAt,
        });

        // Update session
        await supabase
          .from('sun_sessions')
          .update({
            uv_dose_score: uvDoseScore,
            outdoor_confidence: confidenceScore,
            daylight_minutes_effective: daylightMinutesEffective,
            calc_version: 1,
          })
          .eq('id', session.id);

        scoredSessions.push({
          id: session.id,
          durationMinutes,
          uvDoseScore,
          daylightMinutesEffective,
          startTime: sessionTime,
          sunriseTime: weather.sunriseTime ? new Date(weather.sunriseTime) : undefined,
          motionType: session.motion_type ?? 'unknown',
        });
      } catch (error) {
        console.warn(`[recalculate] Error scoring session ${session.id}:`, error);
      }
    }

    // Calculate daily totals
    const dailyTotals = calcDailyTotals(
      scoredSessions,
      profile?.skin_sensitivity ?? 'medium',
      profile?.morning_window_hours ?? 3
    );

    // Upsert daily summary
    await supabase.from('daily_summaries').upsert({
      user_id: userId,
      date_local: date,
      uv_dose_score: dailyTotals.uvDoseScore,
      daylight_minutes: dailyTotals.daylightMinutes,
      morning_light_minutes: dailyTotals.morningLightMinutes,
      overexposure_risk: dailyTotals.overexposureRisk,
      session_count: scoredSessions.length,
      recalculated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      dailyTotals,
      sessionCount: scoredSessions.length,
    });
  } catch (error) {
    console.error('[recalculate endpoint]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
