import { NextRequest, NextResponse } from 'next/server';
import { getWeatherForSession } from '@/services/weatherEnrichment';

/**
 * GET /api/weather/snapshot
 *
 * Query params: lat, lon, ts (ISO timestamp)
 * Returns: WeatherSnapshot
 *
 * Used by client for live UV display.
 * No authentication required.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lon = parseFloat(searchParams.get('lon') || '0');
    const ts = searchParams.get('ts');

    if (!ts || isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'Missing or invalid params: lat, lon, ts' },
        { status: 400 }
      );
    }

    const timestamp = new Date(ts);
    const weather = await getWeatherForSession(lat, lon, timestamp);

    return NextResponse.json(weather);
  } catch (error) {
    console.error('[weather snapshot endpoint]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
