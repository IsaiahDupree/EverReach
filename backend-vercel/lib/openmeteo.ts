/**
 * SunTrace — Typed Open-Meteo API Wrapper
 *
 * Free tier, no API key required.
 * All coordinates rounded to 2 decimal places (~1 km grid) for cache efficiency.
 */

export const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HourlyUVData {
  time: string[];                   // ISO timestamps
  uv_index: number[];
  cloud_cover: number[];            // 0–100 %
  precipitation: number[];          // mm
  temperature_2m: number[];         // °C
  weathercode: number[];            // WMO weather code
}

export interface DailyUVData {
  time: string[];                   // YYYY-MM-DD
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
  uv_index_clear_sky_max: number[];
  precipitation_sum: number[];      // mm
  weathercode: number[];
  daylight_duration: number[];      // seconds
  sunshine_duration: number[];      // seconds
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  is_day: 0 | 1;
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: HourlyUVData;
  daily: DailyUVData;
  current_weather?: CurrentWeather;
}

export interface ForecastOptions {
  lat: number;
  lng: number;
  /** Number of forecast days (1–16, free tier supports up to 16) */
  forecastDays?: number;
  /** Include current_weather field in response */
  includeCurrentWeather?: boolean;
  /** Timezone string e.g. 'America/New_York' — defaults to 'auto' */
  timezone?: string;
}

// ── Hourly forecast for today ─────────────────────────────────────────────────

export interface HourlyForecastPoint {
  time: string;
  uv_index: number;
  cloud_cover: number;
  precipitation_mm: number;
  temperature_c: number;
  weathercode: number;
}

// ── Processed daily summary ────────────────────────────────────────────────────

export interface DailySummary {
  date: string;                          // YYYY-MM-DD
  uv_index_max: number;
  uv_index_clear_sky_max: number;
  sunrise: string;
  sunset: string;
  daylight_duration_s: number;
  sunshine_duration_s: number;
  precipitation_sum_mm: number;
  cloud_cover_avg_pct: number | null;
  weathercode: number;
  /** Best UV window for the day (±1 h around peak) */
  best_window_start: string | null;
  best_window_end: string | null;
  hourly: HourlyForecastPoint[];
}

// ── Fetch helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch 7-day UV forecast with hourly + daily data from Open-Meteo.
 * Uses best_match model for accuracy. timezone=auto respects user's local time.
 */
export async function fetchForecast(opts: ForecastOptions): Promise<OpenMeteoForecastResponse> {
  const {
    lat,
    lng,
    forecastDays = 7,
    includeCurrentWeather = true,
    timezone = 'auto',
  } = opts;

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: [
      'uv_index',
      'cloud_cover',
      'precipitation',
      'temperature_2m',
      'weathercode',
    ].join(','),
    daily: [
      'sunrise',
      'sunset',
      'uv_index_max',
      'uv_index_clear_sky_max',
      'precipitation_sum',
      'weathercode',
      'daylight_duration',
      'sunshine_duration',
    ].join(','),
    forecast_days: String(Math.min(forecastDays, 16)),
    timezone,
    models: 'best_match',
  });

  if (includeCurrentWeather) {
    params.set('current_weather', 'true');
  }

  const url = `${OPEN_METEO_BASE}/forecast?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Open-Meteo ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Build processed daily summaries from a raw Open-Meteo response.
 * Annotates each day with hourly UV data + best UV window.
 */
export function buildDailySummaries(raw: OpenMeteoForecastResponse): DailySummary[] {
  const { daily, hourly } = raw;
  if (!daily?.time) return [];

  return daily.time.map((date, dayIdx) => {
    // Slice 24 hourly values for this day
    const start = dayIdx * 24;
    const end = start + 24;

    const hourlyPoints: HourlyForecastPoint[] = [];
    if (hourly?.time) {
      for (let i = start; i < end && i < hourly.time.length; i++) {
        hourlyPoints.push({
          time: hourly.time[i],
          uv_index: hourly.uv_index?.[i] ?? 0,
          cloud_cover: hourly.cloud_cover?.[i] ?? 0,
          precipitation_mm: hourly.precipitation?.[i] ?? 0,
          temperature_c: hourly.temperature_2m?.[i] ?? 0,
          weathercode: hourly.weathercode?.[i] ?? 0,
        });
      }
    }

    // Average cloud cover for the day
    const validCloud = hourlyPoints.map((h) => h.cloud_cover).filter((v) => v != null);
    const cloud_cover_avg_pct =
      validCloud.length > 0
        ? Math.round(validCloud.reduce((a, b) => a + b, 0) / validCloud.length)
        : null;

    // Best UV window: ±1 h around peak UV between 9am–4pm
    const dayHours = hourlyPoints.filter((h) => {
      const hour = new Date(h.time).getHours();
      return hour >= 9 && hour <= 16 && h.uv_index >= 2;
    });

    let best_window_start: string | null = null;
    let best_window_end: string | null = null;

    if (dayHours.length > 0) {
      const peak = dayHours.reduce((max, h) => (h.uv_index > max.uv_index ? h : max));
      const peakMs = new Date(peak.time).getTime();
      best_window_start = new Date(peakMs - 60 * 60 * 1000).toISOString();
      best_window_end = new Date(peakMs + 60 * 60 * 1000).toISOString();
    }

    return {
      date,
      uv_index_max: daily.uv_index_max?.[dayIdx] ?? 0,
      uv_index_clear_sky_max: daily.uv_index_clear_sky_max?.[dayIdx] ?? 0,
      sunrise: daily.sunrise?.[dayIdx] ?? '',
      sunset: daily.sunset?.[dayIdx] ?? '',
      daylight_duration_s: daily.daylight_duration?.[dayIdx] ?? 0,
      sunshine_duration_s: daily.sunshine_duration?.[dayIdx] ?? 0,
      precipitation_sum_mm: daily.precipitation_sum?.[dayIdx] ?? 0,
      cloud_cover_avg_pct,
      weathercode: daily.weathercode?.[dayIdx] ?? 0,
      best_window_start,
      best_window_end,
      hourly: hourlyPoints,
    };
  });
}

/**
 * Get current UV index from today's hourly data at the current hour.
 */
export function getCurrentUVFromForecast(raw: OpenMeteoForecastResponse): number {
  if (!raw.hourly?.time || !raw.hourly?.uv_index) return 0;

  const now = new Date();
  const currentHour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH

  const idx = raw.hourly.time.findIndex((t) => t.startsWith(currentHour));
  if (idx < 0) return 0;
  return raw.hourly.uv_index[idx] ?? 0;
}
