// GET /api/v1/uv-forecast?lat=X&lng=Y
// Fetches 7-day UV index forecast from Open-Meteo (free, no key required).
// Caches each (lat,lng) pair for 15 minutes using a module-level Map.
// Returns DailyForecast[] sorted ascending by date.
//
// GET /api/v1/uv-forecast/health — liveness probe

import { ok, badRequest, serverError, notFound, options } from '@/lib/cors';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

// ── Types ───────────────────────────────────────────────────────────────────

export type DailyForecast = {
  date: string;          // YYYY-MM-DD
  uv_index_max: number;
  uv_index_clear_sky_max: number;
  sunrise: string;       // ISO timestamp
  sunset: string;        // ISO timestamp
  daylight_duration_s: number;
  sunshine_duration_s: number;
  cloud_cover_avg_pct: number | null;
};

type CacheEntry = {
  data: DailyForecast[];
  fetched_at: number;
};

// ── In-memory 15-minute cache (per edge instance) ────────────────────────

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lng: number): string {
  // Round to 2 decimal places (~1 km grid) to increase cache hits
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function getCached(lat: number, lng: number): DailyForecast[] | null {
  const key = cacheKey(lat, lng);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetched_at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(lat: number, lng: number, data: DailyForecast[]): void {
  cache.set(cacheKey(lat, lng), { data, fetched_at: Date.now() });
}

// ── Open-Meteo fetch ─────────────────────────────────────────────────────

async function fetchUVForecast(lat: number, lng: number): Promise<DailyForecast[]> {
  const params = new URLSearchParams({
    latitude:  String(lat),
    longitude: String(lng),
    daily: [
      'uv_index_max',
      'uv_index_clear_sky_max',
      'sunrise',
      'sunset',
      'daylight_duration',
      'sunshine_duration',
    ].join(','),
    hourly: 'cloud_cover',
    forecast_days: '7',
    timezone: 'UTC',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Open-Meteo returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const json: any = await res.json();

  const daily = json.daily;
  if (!daily?.time || !Array.isArray(daily.time)) {
    throw new Error('Unexpected Open-Meteo response shape');
  }

  // Compute daily average cloud cover from hourly data (24 values per day)
  const hourlyCover: number[] | undefined = json.hourly?.cloud_cover;

  const forecasts: DailyForecast[] = daily.time.map((date: string, i: number) => {
    let cloud_cover_avg_pct: number | null = null;
    if (hourlyCover && hourlyCover.length >= (i + 1) * 24) {
      const slice = hourlyCover.slice(i * 24, (i + 1) * 24).filter((v: any) => v != null);
      if (slice.length > 0) {
        cloud_cover_avg_pct = Math.round(
          slice.reduce((a: number, b: number) => a + b, 0) / slice.length
        );
      }
    }

    return {
      date,
      uv_index_max:           daily.uv_index_max?.[i]          ?? 0,
      uv_index_clear_sky_max: daily.uv_index_clear_sky_max?.[i] ?? 0,
      sunrise:                daily.sunrise?.[i]                ?? '',
      sunset:                 daily.sunset?.[i]                 ?? '',
      daylight_duration_s:    daily.daylight_duration?.[i]      ?? 0,
      sunshine_duration_s:    daily.sunshine_duration?.[i]      ?? 0,
      cloud_cover_avg_pct,
    };
  });

  return forecasts;
}

// ── Route handlers ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Health probe: GET /api/v1/uv-forecast/health
  // (Next.js App Router — handled by a separate /health/route.ts; this catches it via
  //  the query param convention used across the project)
  if (url.searchParams.get('health') === '1' || url.pathname.endsWith('/health')) {
    return ok({ status: 'ok', service: 'uv-forecast', cache_size: cache.size }, req);
  }

  const latRaw = url.searchParams.get('lat');
  const lngRaw = url.searchParams.get('lng');

  if (!latRaw || !lngRaw) {
    return badRequest('Query params lat and lng are required', req);
  }

  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return badRequest('lat must be a number between -90 and 90', req);
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    return badRequest('lng must be a number between -180 and 180', req);
  }

  try {
    // Serve from cache if available
    const cached = getCached(lat, lng);
    if (cached) {
      return ok({ forecast: cached, cached: true, lat, lng }, req);
    }

    const forecast = await fetchUVForecast(lat, lng);
    setCache(lat, lng, forecast);

    return ok({ forecast, cached: false, lat, lng }, req);
  } catch (err: any) {
    console.error('[uv-forecast] Fetch error:', err?.message ?? err);
    return serverError(`UV forecast unavailable: ${err?.message ?? 'Unknown error'}`, req);
  }
}
