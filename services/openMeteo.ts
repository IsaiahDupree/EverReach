import { UVForecast, UVForecastDay, UVForecastHour } from '@/types/suntrace';
import { findBestUVWindow } from './uvCalculations';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    uv_index: number[];
    uv_index_clear_sky: number[];
    cloud_cover: number[];
  };
}

/**
 * Fetch UV forecast from Open-Meteo API (free, no key needed)
 * Returns 7 days of hourly UV data
 */
export async function fetchUVForecast(
  latitude: number,
  longitude: number,
  days: number = 7
): Promise<UVForecast> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: 'uv_index,uv_index_clear_sky,cloud_cover',
    forecast_days: days.toString(),
    timezone: 'auto',
  });

  const url = `${OPEN_METEO_BASE}/forecast?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();
  return parseOpenMeteoResponse(data);
}

function parseOpenMeteoResponse(data: OpenMeteoResponse): UVForecast {
  const hours: UVForecastHour[] = data.hourly.time.map((time, i) => ({
    time,
    uv_index: data.hourly.uv_index[i] ?? 0,
    uv_index_clear_sky: data.hourly.uv_index_clear_sky[i] ?? 0,
    cloud_cover: data.hourly.cloud_cover[i] ?? 0,
  }));

  // Group by day
  const dayMap = new Map<string, UVForecastHour[]>();
  for (const hour of hours) {
    const date = hour.time.split('T')[0];
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(hour);
  }

  const days: UVForecastDay[] = [];
  for (const [date, dayHours] of dayMap) {
    const maxUV = Math.max(...dayHours.map(h => h.uv_index));
    const avgCloud = dayHours.reduce((sum, h) => sum + h.cloud_cover, 0) / dayHours.length;
    const bestWindow = findBestUVWindow(dayHours);

    // Mark best window hours
    const hoursWithWindow = dayHours.map(h => ({
      ...h,
      is_best_window: bestWindow
        ? h.time >= bestWindow.start && h.time <= bestWindow.end
        : false,
    }));

    days.push({
      date,
      max_uv_index: maxUV,
      avg_cloud_cover: Math.round(avgCloud),
      best_window_start: bestWindow?.start ?? null,
      best_window_end: bestWindow?.end ?? null,
      hours: hoursWithWindow,
    });
  }

  // Get current UV (closest hour to now)
  const now = new Date();
  const currentHour = hours.reduce((closest, h) => {
    const diff = Math.abs(new Date(h.time).getTime() - now.getTime());
    const closestDiff = Math.abs(new Date(closest.time).getTime() - now.getTime());
    return diff < closestDiff ? h : closest;
  });

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    current_uv: currentHour.uv_index,
    days,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Get just the current UV index for a location
 */
export async function getCurrentUVIndex(latitude: number, longitude: number): Promise<number> {
  const forecast = await fetchUVForecast(latitude, longitude, 1);
  return forecast.current_uv;
}
