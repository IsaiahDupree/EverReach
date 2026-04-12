// GET /api/v1/uv?lat=X&lng=Y
// Returns current UV index, cloud cover, and temperature from Open-Meteo.
// Auth: requires valid Supabase Bearer JWT.
// Cache: 5-minute module-level cache per (lat, lng) pair.
//
// GET /api/v1/uv?health=1 — liveness probe (no auth required)

import { ok, badRequest, unauthorized, serverError, options } from '@/lib/cors';
import { getUser } from '@/lib/auth';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface CurrentUVResponse {
  uv_index: number;
  cloud_cover: number;
  temperature: number;
  timestamp: string;
}

type CacheEntry = {
  data: CurrentUVResponse;
  fetched_at: number;
};

// ── 5-minute in-memory cache ─────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function getCached(lat: number, lng: number): CurrentUVResponse | null {
  const key = cacheKey(lat, lng);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetched_at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(lat: number, lng: number, data: CurrentUVResponse): void {
  cache.set(cacheKey(lat, lng), { data, fetched_at: Date.now() });
}

// ── Open-Meteo fetch ──────────────────────────────────────────────────────────

async function fetchCurrentUV(lat: number, lng: number): Promise<CurrentUVResponse> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'uv_index,cloud_cover,temperature_2m',
    timezone: 'auto',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Open-Meteo ${res.status}: ${text.slice(0, 200)}`);
  }

  const json: any = await res.json();
  const current = json.current;

  if (!current || typeof current.uv_index !== 'number') {
    throw new Error('Unexpected Open-Meteo response: missing current.uv_index');
  }

  return {
    uv_index: current.uv_index ?? 0,
    cloud_cover: current.cloud_cover ?? 0,
    temperature: current.temperature_2m ?? 0,
    timestamp: current.time ?? new Date().toISOString(),
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Health probe — no auth required
  if (url.searchParams.get('health') === '1') {
    return ok({ status: 'ok', service: 'uv', cache_size: cache.size }, req);
  }

  // Auth guard
  const user = await getUser(req);
  if (!user) {
    return unauthorized('Valid Bearer JWT required', req);
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
    const cached = getCached(lat, lng);
    if (cached) {
      return ok({ ...cached, cached: true }, req);
    }

    const data = await fetchCurrentUV(lat, lng);
    setCache(lat, lng, data);

    return ok({ ...data, cached: false }, req);
  } catch (err: any) {
    console.error('[uv] Fetch error:', err?.message ?? err);
    return serverError(`UV data unavailable: ${err?.message ?? 'Unknown error'}`, req);
  }
}
