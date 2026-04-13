/**
 * weatherEnrichment.ts
 *
 * Fetches weather data from Open-Meteo API and caches by (geohash5, hourBucket).
 * Provides WeatherSnapshot for a given lat/lon + timestamp.
 * On cache miss, fetches fresh; on API error, uses nearest cached bucket within 2 hours.
 */

import { supabase } from '@/lib/supabase';
import { encode as geohashEncode } from '@/utils/geohash';
import { cloudFactor } from './sunDoseCalculator';

export interface WeatherSnapshot {
  uvIndex: number;
  cloudCover: number; // 0–100
  cloudFactor: number;
  sunriseTime: string; // ISO
  sunsetTime: string; // ISO
  isDaylight: boolean;
  provider: string;
  fetchedAt: string; // ISO
}

interface OpenMeteoResponse {
  current?: {
    uv_index?: number;
    cloud_cover?: number;
    is_day?: 0 | 1;
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
  hourly?: {
    uv_index?: number[];
    cloudcover?: number[];
    is_day?: (0 | 1)[];
    time?: string[];
  };
}

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Gets weather snapshot for a given lat/lon and timestamp.
 * 1. Checks weather_cache by (geohash5, hourBucket)
 * 2. On miss, fetches fresh from Open-Meteo
 * 3. On fetch error, uses nearest cached bucket within 2 hours
 */
export async function getWeatherForSession(
  lat: number,
  lon: number,
  timestamp: Date
): Promise<WeatherSnapshot> {
  const geohash5 = geohashEncode(lat, lon, 5);
  const hourBucket = new Date(timestamp);
  hourBucket.setMinutes(0, 0, 0);

  // 1. Try cache hit
  const cached = await getCachedWeather(geohash5, hourBucket);
  if (cached) {
    return cached;
  }

  // 2. Try fresh fetch
  try {
    const snapshot = await fetchOpenMeteo(lat, lon, timestamp);
    // Store in cache asynchronously (don't block on this)
    upsertWeatherCache(geohash5, hourBucket, snapshot).catch(console.warn);
    return snapshot;
  } catch (error) {
    // 3. Fallback: use nearest cached bucket within 2 hours
    const fallback = await getNearestCachedWeather(geohash5, hourBucket);
    if (fallback) {
      return fallback;
    }
    // Last resort: synthesize minimal response
    console.warn('[weatherEnrichment] API failed, returning zero weather');
    return {
      uvIndex: 0,
      cloudCover: 100,
      cloudFactor: 0.4,
      sunriseTime: new Date(timestamp).toISOString(),
      sunsetTime: new Date(timestamp).toISOString(),
      isDaylight: false,
      provider: 'open-meteo-fallback',
      fetchedAt: new Date().toISOString(),
    };
  }
}

/**
 * Fetches current weather from Open-Meteo API.
 */
async function fetchOpenMeteo(lat: number, lon: number, timestamp: Date): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: 'uv_index,cloudcover,is_day',
    daily: 'sunrise,sunset',
    timezone: 'auto',
    forecast_days: '1',
  });

  const response = await fetch(`${OPEN_METEO_BASE}?${params}`);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  // Get hourly values for the requested timestamp
  const hourIndex = timestamp.getUTCHours();
  const uvIndex = data.hourly?.uv_index?.[hourIndex] ?? 0;
  const cloudCoverPct = data.hourly?.cloudcover?.[hourIndex] ?? 100;
  const isDayBit = data.hourly?.is_day?.[hourIndex] ?? 0;

  const sunriseStr = data.daily?.sunrise?.[0] ?? new Date().toISOString();
  const sunsetStr = data.daily?.sunset?.[0] ?? new Date().toISOString();

  return {
    uvIndex: Math.max(0, uvIndex),
    cloudCover: Math.max(0, Math.min(100, cloudCoverPct ?? 100)),
    cloudFactor: cloudFactor(cloudCoverPct ?? 100),
    sunriseTime: sunriseStr,
    sunsetTime: sunsetStr,
    isDaylight: isDayBit === 1,
    provider: 'open-meteo',
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves cached weather from Supabase.
 */
async function getCachedWeather(
  geohash5: string,
  hourBucket: Date
): Promise<WeatherSnapshot | null> {
  try {
    const { data, error } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('geohash5', geohash5)
      .eq('hour_bucket', hourBucket.toISOString())
      .single();

    if (error?.code === 'PGRST116') {
      // Not found
      return null;
    }
    if (error) {
      console.warn('[weatherEnrichment] Cache query error:', error);
      return null;
    }

    if (!data) return null;

    return {
      uvIndex: data.uv_index ?? 0,
      cloudCover: data.cloud_cover ?? 100,
      cloudFactor: data.cloud_factor ?? 0.4,
      sunriseTime: data.sunrise_time ?? new Date().toISOString(),
      sunsetTime: data.sunset_time ?? new Date().toISOString(),
      isDaylight: (data.cloud_cover ?? 100) < 100, // Simple heuristic
      provider: data.provider ?? 'open-meteo',
      fetchedAt: data.fetched_at ?? new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[weatherEnrichment] Cache fetch error:', error);
    return null;
  }
}

/**
 * Finds nearest cached weather within 2 hours of the target bucket.
 */
async function getNearestCachedWeather(
  geohash5: string,
  targetBucket: Date
): Promise<WeatherSnapshot | null> {
  try {
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const since = new Date(targetBucket.getTime() - twoHoursMs);
    const until = new Date(targetBucket.getTime() + twoHoursMs);

    const { data, error } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('geohash5', geohash5)
      .gte('hour_bucket', since.toISOString())
      .lte('hour_bucket', until.toISOString())
      .order('hour_bucket', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      uvIndex: row.uv_index ?? 0,
      cloudCover: row.cloud_cover ?? 100,
      cloudFactor: row.cloud_factor ?? 0.4,
      sunriseTime: row.sunrise_time ?? new Date().toISOString(),
      sunsetTime: row.sunset_time ?? new Date().toISOString(),
      isDaylight: (row.cloud_cover ?? 100) < 100,
      provider: row.provider ?? 'open-meteo',
      fetchedAt: row.fetched_at ?? new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[weatherEnrichment] Nearest cache error:', error);
    return null;
  }
}

/**
 * Stores weather snapshot in cache.
 */
async function upsertWeatherCache(
  geohash5: string,
  hourBucket: Date,
  snapshot: WeatherSnapshot
): Promise<void> {
  try {
    await supabase.from('weather_cache').upsert({
      geohash5,
      hour_bucket: hourBucket.toISOString(),
      uv_index: snapshot.uvIndex,
      cloud_cover: snapshot.cloudCover,
      cloud_factor: snapshot.cloudFactor,
      sunrise_time: snapshot.sunriseTime,
      sunset_time: snapshot.sunsetTime,
      provider: snapshot.provider,
      fetched_at: snapshot.fetchedAt,
    });
  } catch (error) {
    console.warn('[weatherEnrichment] Cache upsert error:', error);
    // Silent fail — don't break the flow
  }
}
