/**
 * useSunTracker
 *
 * Passive sunlight tracking hook. No manual start needed.
 * - Polls UV index + GPS speed every POLL_INTERVAL_MS while app is in foreground
 * - When UV >= UV_THRESHOLD AND speed < VEHICLE_SPEED_MS, accumulates outdoor minutes
 * - Skips accumulation when in a vehicle (speed >= VEHICLE_SPEED_MS) — car windows
 *   filter ~95% of UV-B so sunlight exposure is negligible even in direct sun
 * - When UV drops to 0 (night / fully indoors) or app goes background, pauses
 * - Auto-saves a session after TIMEOUT_SECONDS below threshold or on app background
 *
 * Simulation:
 *   Pass a simulationMode to override real GPS/UV readings for testing:
 *   - 'outside'    → UV 4.5, speed 0.8 m/s (walking)
 *   - 'in_vehicle' → UV 2.5, speed 15 m/s (~34 mph)
 *   - 'indoors'    → UV 0,   speed 0
 *
 * Exposes:
 *   isOutdoors    - true when UV >= threshold AND not in a vehicle
 *   liveSeconds   - seconds accumulated in the current outdoor window
 *   todayMinutes  - total outdoor minutes today (from DB + live)
 *   currentUV     - latest UV reading
 *   speed         - latest GPS speed in m/s (or simulated)
 *   activityType  - 'outside' | 'in_vehicle' | 'indoors' | 'unknown'
 *   status        - 'tracking' | 'idle' | 'no_uv' | 'in_vehicle' | 'saving'
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { fetchUVForecast } from '@/services/openMeteo';
import { createSession, getTodayStats } from '@/services/suntraceApi';
import { getUVCategory } from '@/services/uvCalculations';
import { SUNTRACE_CONFIG } from '@/constants/suntrace';
import { supabase } from '@/lib/supabase';

// ── Config ─────────────────────────────────────────────────
const POLL_INTERVAL_MS   = 60_000;  // check UV + speed every 60 s
const UV_THRESHOLD       = 1.0;    // UV >= 1 = plausibly outdoors
const VEHICLE_SPEED_MS   = 8;      // m/s ≈ 18 mph — above this = in vehicle
const TIMEOUT_SECONDS    = 300;    // 5 min below threshold = end session
const MIN_SAVE_MINUTES   = 1;
const DEFAULT_LAT        = 40.7128;
const DEFAULT_LON        = -74.006;

// ── Simulation ──────────────────────────────────────────────
export type SimulationMode = 'none' | 'outside' | 'in_vehicle' | 'indoors';

const SIM_UV: Record<SimulationMode, number> = {
  none:       0,
  outside:    4.5,
  in_vehicle: 2.5,
  indoors:    0,
};
const SIM_SPEED: Record<SimulationMode, number> = {
  none:       0,
  outside:    0.8,   // walking pace
  in_vehicle: 15,    // ~34 mph
  indoors:    0,
};

// ── Types ───────────────────────────────────────────────────
export type ActivityType  = 'outside' | 'in_vehicle' | 'indoors' | 'unknown';
export type TrackerStatus = 'tracking' | 'idle' | 'no_uv' | 'in_vehicle' | 'saving';

export interface SunTrackerState {
  isOutdoors:   boolean;
  liveSeconds:  number;      // seconds in the CURRENT outdoor window
  todayMinutes: number;      // DB total + live
  currentUV:    number;
  speed:        number;      // m/s
  activityType: ActivityType;
  status:       TrackerStatus;
  refreshTodayStats: () => Promise<void>;
}

// ── Hook ────────────────────────────────────────────────────
export function useSunTracker(simulationMode: SimulationMode = 'none'): SunTrackerState {
  const [currentUV, setCurrentUV]         = useState(0);
  const [speed, setSpeed]                 = useState(0);
  const [liveSeconds, setLiveSeconds]     = useState(0);
  const [dbMinutesToday, setDbMinutesToday] = useState(0);
  const [status, setStatus]               = useState<TrackerStatus>('idle');
  const [activityType, setActivityType]   = useState<ActivityType>('unknown');

  // Refs so interval callbacks always have fresh values
  const liveSecondsRef            = useRef(0);
  const currentUVRef              = useRef(0);
  const speedRef                  = useRef(0);
  const simulationModeRef         = useRef<SimulationMode>(simulationMode);
  const locationRef               = useRef<{ lat: number; lon: number }>({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const belowThresholdSecondsRef  = useRef(0);
  const appStateRef               = useRef<AppStateStatus>('active');
  const tickIntervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const uvPollIntervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef               = useRef(false);

  // Keep simulationModeRef in sync so the tick closure reads the latest value
  useEffect(() => {
    simulationModeRef.current = simulationMode;

    // Apply simulated readings immediately when mode changes
    if (simulationMode !== 'none') {
      const uv  = SIM_UV[simulationMode];
      const spd = SIM_SPEED[simulationMode];
      currentUVRef.current = uv;
      speedRef.current     = spd;
      setCurrentUV(uv);
      setSpeed(spd);
    }
  }, [simulationMode]);

  // ── Helpers ──────────────────────────────────────────────
  function deriveActivityType(uv: number, spd: number): ActivityType {
    if (spd >= VEHICLE_SPEED_MS) return 'in_vehicle';
    if (uv >= UV_THRESHOLD)      return 'outside';
    if (uv === 0)                return 'indoors';
    return 'unknown';
  }

  // ── Load today's DB total ─────────────────────────────────
  const refreshTodayStats = useCallback(async () => {
    try {
      const stats = await getTodayStats();
      setDbMinutesToday(stats?.total_minutes ?? 0);
    } catch {
      // silently ignore — local mode / no DB
    }
  }, []);

  // ── Poll UV + GPS speed ───────────────────────────────────
  const pollUV = useCallback(async () => {
    // If simulation is active, skip real network calls
    if (simulationModeRef.current !== 'none') return;

    let spd = 0;
    try {
      const { status: locStatus } = await Location.getForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        locationRef.current = { lat: loc.coords.latitude, lon: loc.coords.longitude };
        spd = loc.coords.speed ?? 0;
        if (spd < 0) spd = 0; // expo returns -1 when unavailable
      }
    } catch {}

    speedRef.current = spd;
    setSpeed(spd);

    try {
      const fc = await fetchUVForecast(locationRef.current.lat, locationRef.current.lon, 1);
      const uv = fc.current_uv ?? 0;
      currentUVRef.current = uv;
      setCurrentUV(uv);
      setActivityType(deriveActivityType(uv, spd));
    } catch {}
  }, []);

  // ── Save accumulated outdoor session to DB ────────────────
  const saveSession = useCallback(async () => {
    const minutes = liveSecondsRef.current / 60;
    if (minutes < MIN_SAVE_MINUTES || isSavingRef.current) return;

    isSavingRef.current = true;
    setStatus('saving');

    try {
      const uv = currentUVRef.current;
      const cat = getUVCategory(uv);
      const now = new Date();
      const startedAt = new Date(now.getTime() - liveSecondsRef.current * 1000);

      const session = await createSession({
        started_at: startedAt.toISOString(),
        ended_at: now.toISOString(),
        duration_minutes: Math.round(minutes),
        uv_index_avg: uv,
        d_earned_iu: Math.round(uv * Math.round(minutes) * 40),
        burn_risk_level: (cat.burnRisk as any) ?? 'low',
        latitude: locationRef.current.lat,
        longitude: locationRef.current.lon,
        notes: simulationModeRef.current !== 'none'
          ? `Simulated (${simulationModeRef.current})`
          : 'Passively tracked',
      });

      liveSecondsRef.current = 0;
      setLiveSeconds(0);
      belowThresholdSecondsRef.current = 0;

      await refreshTodayStats();

      // Trigger dose scoring asynchronously (don't block UI)
      if (session?.id) {
        try {
          const { data: { session: { access_token } } } = await supabase.auth.getSession();
          if (access_token) {
            // Schedule score calculation to run in background (5s delay)
            setTimeout(async () => {
              try {
                await fetch(
                  `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/sessions/${session.id}/score`,
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${access_token}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );
              } catch (scoreErr) {
                console.warn('[SunTracker] Score endpoint error:', scoreErr);
              }
            }, 500); // small delay to ensure session is settled in DB
          }
        } catch (err) {
          console.warn('[SunTracker] Could not trigger scoring:', err);
        }
      }
    } catch (err) {
      console.warn('[SunTracker] Save failed:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [refreshTodayStats]);

  // ── 1-second tick: accumulate outdoor time ────────────────
  const startTick = useCallback(() => {
    if (tickIntervalRef.current) return;
    tickIntervalRef.current = setInterval(() => {
      if (appStateRef.current !== 'active') return;

      const uv  = currentUVRef.current;
      const spd = speedRef.current;
      const inVehicle = spd >= VEHICLE_SPEED_MS;
      const hasUV     = uv >= UV_THRESHOLD;
      const outdoors  = hasUV && !inVehicle;

      // Update activity + status
      const activity = deriveActivityType(uv, spd);
      setActivityType(activity);

      if (outdoors) {
        belowThresholdSecondsRef.current = 0;
        liveSecondsRef.current += 1;
        setLiveSeconds(s => s + 1);
        setStatus('tracking');
      } else {
        belowThresholdSecondsRef.current += 1;

        if (inVehicle) {
          setStatus('in_vehicle');
        } else {
          setStatus(uv === 0 ? 'no_uv' : 'idle');
        }

        // End session after timeout below threshold
        if (
          belowThresholdSecondsRef.current >= TIMEOUT_SECONDS &&
          liveSecondsRef.current > 0
        ) {
          saveSession();
        }
      }
    }, 1000);
  }, [saveSession]);

  const stopTick = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  // ── Bootstrap ─────────────────────────────────────────────
  useEffect(() => {
    refreshTodayStats();
    pollUV();
    startTick();

    uvPollIntervalRef.current = setInterval(pollUV, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState !== 'active' && liveSecondsRef.current > 0) {
        saveSession();
        stopTick();
      } else if (nextState === 'active') {
        refreshTodayStats();
        pollUV();
        startTick();
      }
    });

    return () => {
      stopTick();
      if (uvPollIntervalRef.current) clearInterval(uvPollIntervalRef.current);
      sub.remove();
      if (liveSecondsRef.current > 0) saveSession();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isOutdoors      = currentUV >= UV_THRESHOLD && speed < VEHICLE_SPEED_MS;
  const liveMinutesAdded = liveSeconds / 60;
  const todayMinutes    = Math.round(dbMinutesToday + liveMinutesAdded);

  return {
    isOutdoors,
    liveSeconds,
    todayMinutes,
    currentUV,
    speed,
    activityType,
    status,
    refreshTodayStats,
  };
}
