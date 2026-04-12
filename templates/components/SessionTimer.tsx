/**
 * SessionTimer
 *
 * Live session timer that ticks every second.
 * Displays:
 *   - Elapsed time in MM:SS format
 *   - Accumulated Vitamin D IU (recalculated each second from UV + skin type)
 *
 * Props:
 *   startTime   Date when session started, or null if not active
 *   uvIndex     Current UV index at the session location
 *   skinType    Fitzpatrick skin type (1–6)
 *   onUpdate    Optional callback fired every second with the latest IU total
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { calculateVitaminD } from '@/services/api';
import { FitzpatrickSkinType } from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionTimerProps {
  startTime: Date | null;
  uvIndex: number;
  skinType: number;
  onUpdate?: (iu: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMMSS(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function clampSkinType(st: number): FitzpatrickSkinType {
  const clamped = Math.max(1, Math.min(6, Math.round(st)));
  return clamped as FitzpatrickSkinType;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionTimer({
  startTime,
  uvIndex,
  skinType,
  onUpdate,
}: SessionTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [vitaminDIU, setVitaminDIU] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any existing interval whenever inputs change
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (startTime === null) {
      setElapsedSeconds(0);
      setVitaminDIU(0);
      return;
    }

    const tick = () => {
      const nowMs = Date.now();
      const startMs = startTime.getTime();
      const seconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      const minutes = seconds / 60;
      const iu = calculateVitaminD(uvIndex, minutes, clampSkinType(skinType));

      setElapsedSeconds(seconds);
      setVitaminDIU(iu);
      onUpdate?.(iu);
    };

    // Fire immediately then every second
    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTime, uvIndex, skinType]); // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = startTime !== null;

  return (
    <View style={styles.container}>
      {/* Timer display */}
      <View style={styles.timerRow}>
        <Text style={[styles.timer, isActive ? styles.timerActive : styles.timerInactive]}>
          {isActive ? formatMMSS(elapsedSeconds) : '00:00'}
        </Text>
      </View>

      {/* IU display */}
      <View style={styles.iuRow}>
        <Text style={styles.iuValue}>{vitaminDIU.toLocaleString()}</Text>
        <Text style={styles.iuUnit}> IU</Text>
      </View>
      <Text style={styles.iuLabel}>Vitamin D accumulated</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  timerRow: {
    marginBottom: 6,
  },
  timer: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerActive: {
    color: '#111827',
  },
  timerInactive: {
    color: '#9CA3AF',
  },
  iuRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  iuValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#F97316',
  },
  iuUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F97316',
  },
  iuLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
