// GET /api/v1/forecast?lat=X&lng=Y&days=7
// Returns scored hourly UV forecast with best windows marked.
// Auth: requires valid Supabase Bearer JWT.
// Cache: 15-minute module-level cache per rounded (lat, lng) pair.
//
// GET /api/v1/forecast?health=1 — liveness probe (no auth required)

import { ok, badRequest, unauthorized, serverError, options } from '@/lib/cors';
import { getUser } from '@/lib/auth';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface HourlyPoint {
  time: string;
  uv_index: number;
  cloud_cover: number;
  precipitation: number;
  temperature: number;
  weather_code: number;
}

export interface DailyForecast {
  date: string;
  max_uv: number;
  avg_uv: number;
  best_window_start: string | null;
  best_window_end: string | null;
  cloud_cover_pct: number | null;
  sunrise: string;
  sunset: string;
  precipitation_sum: number;
  weather_code: number;
  hours: HourlyPoint[];
}

type CacheEntry = {
  data: DailyForecast[];
  fetched_at: number;
};

// ── 15-minute cache ───────────────────────────────────────────────────────────

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lng: number, days: number): string {
  // Round to 0.01 degrees (~1 km grid) for cache efficiency
  return `${lat.toFixed(2)},${lng.toFixed(2)},${days}`;
}

function getCached(lat: number, lng: number, days: number): DailyForecast[] | null {
  const key = cacheKey(lat, lng, days);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetched_at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(lat: number, lng: number, days: number, data: DailyForecast[]): void {
  cache.set(cacheKey(lat, lng, days), { data, fetched_at: Date.now() });
}

// ── Open-Meteo fetch + scoring ────────────────────────────────────────────────

async function fetchForecast(lat: number, lng: number, days: number): Promise<DailyForecast[]> {
  const clampedDays = Math.min(Math.max(days, 1), 16);

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: 'uv_index,cloud_cover,precipitation,temperature_2m,weather_code',
    daily: 'sunrise,sunset,uv_index_max,precipitation_sum,weather_code',
    forecast_days: String(clampedDays),
    timezone: 'auto',
    models: 'best_match',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Open-Meteo ${res.status}: ${text.slice(0, 200)}`);
  }

  const json: any = await res.json();

  const daily = json.daily;
  const hourly = json.hourly;

  if (!daily?.time || !Array.isArray(daily.time)) {
    throw new Error('Unexpected Open-Meteo response: missing daily.time');
  }
  if (!hourly?.time || !Array.isArray(hourly.time)) {
    throw new Error('Unexpected Open-Meteo response: missing hourly.time');
  }

  return daily.time.map((date: string, dayIdx: number) => {
    const startH = dayIdx * 24;
    const endH = startH + 24;

    // Build hourly points for this day
    const hours: HourlyPoint[] = [];
    for (let i = startH; i < endH && i < hourly.time.length; i++) {
      hours.push({
        time: hourly.time[i],
        uv_index: hourly.uv_index?.[i] ?? 0,
        cloud_cover: hourly.cloud_cover?.[i] ?? 0,
        precipitation: hourly.precipitation?.[i] ?? 0,
        temperature: hourly.temperature_2m?.[i] ?? 0,
        weather_code: hourly.weather_code?.[i] ?? 0,
      });
    }

    // Average UV for the day
    const uvValues = hours.map((h) => h.uv_index).filter((v) => v != null);
    const avg_uv =
      uvValues.length > 0
        ? Math.round((uvValues.reduce((a, b) => a + b, 0) / uvValues.length) * 100) / 100
        : 0;

    // Average cloud cover for the day
    const cloudValues = hours.map((h) => h.cloud_cover).filter((v) => v != null);
    const cloud_cover_pct =
      cloudValues.length > 0
        ? Math.round(cloudValues.reduce((a, b) => a + b, 0) / cloudValues.length)
        : null;

    // Best window: hours where uv_index >= 0.7 * daily_max AND cloud_cover < 60
    const dailyMaxUV: number = daily.uv_index_max?.[dayIdx] ?? 0;
    const uvThreshold = dailyMaxUV * 0.7;

    const windowHours = hours.filter(
      (h) => h.uv_index >= uvThreshold && h.cloud_cover < 60 && h.uv_index >= 1
    );

    let best_window_start: string | null = null;
    let best_window_end: string | null = null;

    if (windowHours.length > 0) {
      best_window_start = windowHours[0].time;
      best_window_end = windowHours[windowHours.length - 1].time;
    }

    return {
      date,
      max_uv: dailyMaxUV,
      avg_uv,
      best_window_start,
      best_window_end,
      cloud_cover_pct,
      sunrise: daily.sunrise?.[dayIdx] ?? '',
      sunset: daily.sunset?.[dayIdx] ?? '',
      precipitation_sum: daily.precipitation_sum?.[dayIdx] ?? 0,
      weather_code: daily.weather_code?.[dayIdx] ?? 0,
      hours,
    };
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Health probe — no auth required
  if (url.searchParams.get('health') === '1') {
    return ok({ status: 'ok', service: 'forecast', cache_size: cache.size }, req);
  }

  // Auth guard
  const user = await getUser(req);
  if (!user) {
    return unauthorized('Valid Bearer JWT required', req);
  }

  const latRaw = url.searchParams.get('lat');
  const lngRaw = url.searchParams.get('lng');
  const daysRaw = url.searchParams.get('days') ?? '7';

  if (!latRaw || !lngRaw) {
    return badRequest('Query params lat and lng are required', req);
  }

  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  const days = parseInt(daysRaw, 10);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return badRequest('lat must be a number between -90 and 90', req);
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    return badRequest('lng must be a number between -180 and 180', req);
  }
  if (isNaN(days) || days < 1 || days > 16) {
    return badRequest('days must be an integer between 1 and 16', req);
  }

  try {
    const cached = getCached(lat, lng, days);
    if (cached) {
      return ok({ forecast: cached, cached: true, lat, lng, days }, req);
    }

    const forecast = await fetchForecast(lat, lng, days);
    setCache(lat, lng, days, forecast);

    return ok({ forecast, cached: false, lat, lng, days }, req);
  } catch (err: any) {
    console.error('[forecast] Fetch error:', err?.message ?? err);
    return serverError(`Forecast unavailable: ${err?.message ?? 'Unknown error'}`, req);
  }
}
