// GET /api/v1/target?skin_type=2&age=35&lat=40&lng=-74&month=8
// Returns the recommended daily vitamin D target:
//   target_minutes — recommended sun exposure in minutes
//   target_iu      — target vitamin D IU production
//   adjusted_for_season — whether a winter latitude adjustment was applied
//
// Query params:
//   skin_type  Fitzpatrick type 1–6 (required)
//   age        Age in years (required)
//   lat        Latitude -90..90 (required)
//   lng        Longitude -180..180 (required, used for future timezone logic)
//   month      Month 1–12 (default: current UTC month)
//
// Calculation:
//   skinTypeFactors = [1.0, 0.9, 0.75, 0.6, 0.4, 0.25] for types 1–6
//   base_rate_per_minute = uvIndex * skinTypeFactor * 40  (IU/min)
//   target_iu = 1000 IU (base)
//   Winter adjustment: lat > 40 AND month in [11, 12, 1, 2, 3] → double target
//   Age > 50: increase target by 20%
//   target_minutes = target_iu / base_rate_per_minute
//
// Note: UV index is fetched live from Open-Meteo when lat/lng are provided.
// Falls back to UV 3 reference if Open-Meteo is unavailable.

import { ok, badRequest, serverError, options } from '@/lib/cors';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Fitzpatrick skin types 1–6
const SKIN_TYPE_FACTORS: Record<number, number> = {
  1: 1.0,
  2: 0.9,
  3: 0.75,
  4: 0.6,
  5: 0.4,
  6: 0.25,
};

const WINTER_MONTHS = new Set([11, 12, 1, 2, 3]);
const BASE_TARGET_IU = 1000;
const IU_PER_UV_UNIT_PER_MINUTE = 40; // IU/min per UV index unit at skin factor 1.0

// ── Live UV fetch (best-effort) ───────────────────────────────────────────────

async function fetchCurrentUVIndex(lat: number, lng: number): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: 'uv_index',
      timezone: 'auto',
    });
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const uv = json?.current?.uv_index;
    return typeof uv === 'number' ? uv : null;
  } catch {
    return null;
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);

  const skinTypeRaw = url.searchParams.get('skin_type');
  const ageRaw = url.searchParams.get('age');
  const latRaw = url.searchParams.get('lat');
  const lngRaw = url.searchParams.get('lng');
  const monthRaw = url.searchParams.get('month') ?? String(new Date().getUTCMonth() + 1);

  if (!skinTypeRaw || !ageRaw || !latRaw || !lngRaw) {
    return badRequest('skin_type, age, lat, and lng are all required', req);
  }

  const skinType = parseInt(skinTypeRaw, 10);
  const age = parseInt(ageRaw, 10);
  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  const month = parseInt(monthRaw, 10);

  if (!Number.isInteger(skinType) || skinType < 1 || skinType > 6) {
    return badRequest('skin_type must be an integer 1–6', req);
  }
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return badRequest('age must be an integer between 1 and 120', req);
  }
  if (isNaN(lat) || lat < -90 || lat > 90) {
    return badRequest('lat must be a number between -90 and 90', req);
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    return badRequest('lng must be a number between -180 and 180', req);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return badRequest('month must be an integer 1–12', req);
  }

  try {
    // Fetch live UV index; fall back to UV 3 reference
    const liveUV = await fetchCurrentUVIndex(lat, lng);
    const uvIndex = liveUV !== null && liveUV > 0 ? liveUV : 3;

    const skinTypeFactor = SKIN_TYPE_FACTORS[skinType] ?? 0.6;

    // Base IU production rate per minute
    const baseRatePerMinute = uvIndex * skinTypeFactor * IU_PER_UV_UNIT_PER_MINUTE;

    // Target IU with adjustments
    let targetIU = BASE_TARGET_IU;
    let adjusted_for_season = false;

    // Winter latitude adjustment
    if (lat > 40 && WINTER_MONTHS.has(month)) {
      targetIU *= 2;
      adjusted_for_season = true;
    }

    // Age adjustment: over-50s need 20% more
    if (age > 50) {
      targetIU = Math.round(targetIU * 1.2);
    }

    // Guard against zero rate (UV 0 at night/polar)
    if (baseRatePerMinute <= 0) {
      return ok(
        {
          target_minutes: 0,
          target_iu: targetIU,
          adjusted_for_season,
          uv_index: uvIndex,
          note: 'UV index too low for vitamin D synthesis at this time',
        },
        req
      );
    }

    const target_minutes = Math.round(targetIU / baseRatePerMinute);

    return ok(
      {
        target_minutes,
        target_iu: targetIU,
        adjusted_for_season,
        uv_index: uvIndex,
        skin_type: skinType,
        skin_type_factor: skinTypeFactor,
        age,
        lat,
        lng,
        month,
      },
      req
    );
  } catch (err: any) {
    console.error('[target] Error:', err?.message ?? err);
    return serverError(`Target calculation failed: ${err?.message ?? 'Unknown error'}`, req);
  }
}
