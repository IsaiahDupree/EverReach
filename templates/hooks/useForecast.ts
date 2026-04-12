/**
 * useForecast
 *
 * Fetches UV forecast data for the device's current location.
 *
 * Uses:
 *   - expo-location for coordinates
 *   - fetchUVForecast() from the API service (Open-Meteo)
 *
 * Returns:
 *   today          Hourly UVForecast array for the current date
 *   weekForecast   Array of DailyForecast objects for the next 7 days
 *   bestWindow     { start: string, end: string } | null — optimal window today
 *   isLoading      boolean
 *   error          string | null
 *   refetch        () => void
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { fetchUVForecast } from '@/services/api';
import { UVForecast, DailyForecast } from '@/types/models';
import { APP_CONFIG } from '@/constants/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BestWindow {
  start: string;
  end: string;
}

interface UseForecastResult {
  today: UVForecast[];
  weekForecast: DailyForecast[];
  bestWindow: BestWindow | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function extractBestWindow(daily: DailyForecast | undefined): BestWindow | null {
  if (!daily || !daily.best_window_start || !daily.best_window_end) return null;
  return { start: daily.best_window_start, end: daily.best_window_end };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useForecast(): UseForecastResult {
  const [today, setToday] = useState<UVForecast[]>([]);
  const [weekForecast, setWeekForecast] = useState<DailyForecast[]>([]);
  const [bestWindow, setBestWindow] = useState<BestWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locationRef = useRef<{ lat: number; lng: number } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Acquire location if not yet cached
      if (locationRef.current === null) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied. Cannot fetch forecast.');
          setIsLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        locationRef.current = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        };
      }

      const { lat, lng } = locationRef.current;
      const forecasts = await fetchUVForecast(lat, lng);

      setWeekForecast(forecasts);

      const todayStr = getTodayDateString();
      const todayForecast = forecasts.find((d) => d.date === todayStr);
      setToday(todayForecast?.forecast_hours ?? []);
      setBestWindow(extractBestWindow(todayForecast));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load forecast';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { today, weekForecast, bestWindow, isLoading, error, refetch };
}

export default useForecast;
