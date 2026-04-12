/**
 * useUVData
 *
 * Fetches the current UV index for the device's location using:
 *   - expo-location for coordinates
 *   - Open-Meteo via fetchCurrentUV from the API service
 *
 * Polls every 60 seconds while the hook is mounted.
 *
 * Returns: { uvIndex, isLoading, error, refetch }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { fetchCurrentUV } from '@/services/api';
import { APP_CONFIG } from '@/constants/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseUVDataResult {
  uvIndex: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 60_000; // 1 minute

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUVData(): UseUVDataResult {
  const [uvIndex, setUvIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to hold the latest location so we can refetch without re-acquiring
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUV = useCallback(async () => {
    try {
      // Acquire location on first call or if not yet cached
      if (locationRef.current === null) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied. Cannot fetch UV data.');
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
      const uv = await fetchCurrentUV(lat, lng);
      setUvIndex(uv);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch UV data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchUV();
  }, [fetchUV]);

  useEffect(() => {
    // Initial fetch
    fetchUV();

    // Poll every 60 seconds
    intervalRef.current = setInterval(() => {
      fetchUV();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchUV]);

  return { uvIndex, isLoading, error, refetch };
}

export default useUVData;
