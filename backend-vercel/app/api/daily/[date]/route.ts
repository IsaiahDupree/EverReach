import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/daily/[date]
 *
 * Returns daily_summaries row + array of sessions with their weather snapshots and modifiers.
 * Authenticated via Authorization header.
 */
export async function GET(
  request: NextRequest,
  context: { params: { date: string } }
): Promise<NextResponse> {
  try {
    const date = context.params.date;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch daily summary
    const { data: summary, error: summaryError } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('date_local', date)
      .single();

    if (summaryError?.code === 'PGRST116') {
      // Not found — return empty summary
      return NextResponse.json({
        daily: {
          uvDoseScore: 0,
          daylightMinutes: 0,
          morningLightMinutes: 0,
          overexposureRisk: 'low',
          sessionCount: 0,
        },
        sessions: [],
      });
    }

    if (summaryError) {
      throw summaryError;
    }

    // Fetch sessions for this date
    const dateStart = `${date}T00:00:00Z`;
    const dateEnd = `${date}T23:59:59Z`;

    const { data: sessions, error: sessionsError } = await supabase
      .from('sun_sessions')
      .select(
        `
        id,
        started_at,
        ended_at,
        duration_minutes,
        uv_index_avg,
        uv_dose_score,
        outdoor_confidence,
        daylight_minutes_effective,
        latitude,
        longitude,
        motion_type,
        session_weather (*),
        session_modifiers (*)
      `
      )
      .eq('user_id', user.user.id)
      .gte('started_at', dateStart)
      .lte('started_at', dateEnd)
      .order('started_at', { ascending: false });

    if (sessionsError) {
      throw sessionsError;
    }

    // Format sessions with weather + modifiers
    const formattedSessions = (sessions || []).map((s: any) => ({
      id: s.id,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      durationMinutes: s.duration_minutes,
      uvIndexAvg: s.uv_index_avg,
      uvDoseScore: s.uv_dose_score,
      outdoorConfidence: s.outdoor_confidence,
      daylightMinutesEffective: s.daylight_minutes_effective,
      latitude: s.latitude,
      longitude: s.longitude,
      motionType: s.motion_type,
      weather: s.session_weather?.[0]
        ? {
            uvIndex: s.session_weather[0].uv_index,
            cloudCover: s.session_weather[0].cloud_cover,
            cloudFactor: s.session_weather[0].cloud_factor,
            sunriseTime: s.session_weather[0].sunrise_time,
            sunsetTime: s.session_weather[0].sunset_time,
            condition: s.session_weather[0].condition,
            provider: s.session_weather[0].provider,
          }
        : null,
      modifiers: s.session_modifiers?.[0]
        ? {
            shadeFactor: s.session_modifiers[0].shade_factor,
            exposureFactor: s.session_modifiers[0].exposure_factor,
            protectionFactor: s.session_modifiers[0].protection_factor,
            source: s.session_modifiers[0].source,
          }
        : null,
    }));

    return NextResponse.json({
      daily: {
        uvDoseScore: summary?.uv_dose_score ?? 0,
        daylightMinutes: summary?.daylight_minutes ?? 0,
        morningLightMinutes: summary?.morning_light_minutes ?? 0,
        overexposureRisk: summary?.overexposure_risk ?? 'low',
        sessionCount: summary?.session_count ?? 0,
      },
      sessions: formattedSessions,
    });
  } catch (error) {
    console.error('[daily endpoint]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
