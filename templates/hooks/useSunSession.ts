/**
 * useSunSession
 *
 * Manages the lifecycle of an active sun exposure session.
 *
 * startSession()
 *   - Requests foreground location permission
 *   - Records current coordinates and UV index
 *   - Persists a new SunSession row to Supabase via createSession()
 *   - Starts the elapsed-seconds ticker
 *
 * stopSession()
 *   - Stops the ticker
 *   - Calculates final duration and estimated Vitamin D IU
 *   - Updates the session row in Supabase via endSession()
 *   - Returns the completed SunSession
 *
 * Exposed state:
 *   isActive         true while a session is running
 *   elapsedSeconds   live counter, ticks every second
 *   vitaminDEarned   estimated IU accumulated so far
 *   currentUV        UV index captured at session start
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { createSession, endSession, fetchCurrentUV, calculateVitaminD } from '@/services/api';
import { SunSession, FitzpatrickSkinType } from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseSunSessionOptions {
  skinType: number; // Fitzpatrick 1–6
}

interface UseSunSessionResult {
  isActive: boolean;
  elapsedSeconds: number;
  vitaminDEarned: number;
  currentUV: number;
  activeSession: SunSession | null;
  startSession: () => Promise<void>;
  stopSession: () => Promise<SunSession | null>;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampSkinType(st: number): FitzpatrickSkinType {
  return Math.max(1, Math.min(6, Math.round(st))) as FitzpatrickSkinType;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSunSession({ skinType }: UseSunSessionOptions): UseSunSessionResult {
  const [isActive, setIsActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [vitaminDEarned, setVitaminDEarned] = useState(0);
  const [currentUV, setCurrentUV] = useState(0);
  const [activeSession, setActiveSession] = useState<SunSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<SunSession | null>(null);
  const uvRef = useRef<number>(0);

  // Ticker — runs while session is active
  useEffect(() => {
    if (!isActive) return;

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;
      const seconds = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
      const minutes = seconds / 60;
      const iu = calculateVitaminD(uvRef.current, minutes, clampSkinType(skinType));
      setElapsedSeconds(seconds);
      setVitaminDEarned(iu);
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, skinType]);

  const startSession = useCallback(async () => {
    setError(null);
    try {
      // Request location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat: number | undefined;
      let lng: number | undefined;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      // Fetch current UV
      let uv = 0;
      if (lat !== undefined && lng !== undefined) {
        uv = await fetchCurrentUV(lat, lng);
      }

      uvRef.current = uv;
      setCurrentUV(uv);

      const now = new Date();
      startTimeRef.current = now;

      // Persist to Supabase
      const session = await createSession({
        started_at: now.toISOString(),
        latitude: lat,
        longitude: lng,
        uv_index_avg: uv,
      });

      sessionRef.current = session;
      setActiveSession(session);
      setElapsedSeconds(0);
      setVitaminDEarned(0);
      setIsActive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      setError(message);
    }
  }, []);

  const stopSession = useCallback(async (): Promise<SunSession | null> => {
    if (!isActive || sessionRef.current === null || startTimeRef.current === null) {
      return null;
    }

    // Stop ticker first
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsActive(false);

    try {
      const endedAt = new Date();
      const durationMs = endedAt.getTime() - startTimeRef.current.getTime();
      const durationMinutes = Math.round(durationMs / 60_000);
      const iu = calculateVitaminD(uvRef.current, durationMinutes, clampSkinType(skinType));

      const completed = await endSession(sessionRef.current.id, {
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
        d_earned_iu: iu,
        uv_index_avg: uvRef.current,
      });

      // Reset local state
      startTimeRef.current = null;
      sessionRef.current = null;
      setActiveSession(null);
      setElapsedSeconds(0);
      setVitaminDEarned(0);
      setCurrentUV(0);

      return completed;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop session';
      setError(message);
      return null;
    }
  }, [isActive, skinType]);

  return {
    isActive,
    elapsedSeconds,
    vitaminDEarned,
    currentUV,
    activeSession,
    startSession,
    stopSession,
    error,
  };
}

export default useSunSession;
