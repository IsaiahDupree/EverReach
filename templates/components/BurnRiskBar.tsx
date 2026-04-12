/**
 * BurnRiskBar
 *
 * Shows the user how close they are to their estimated burn threshold.
 *
 * Safe exposure time formula (simplified, industry-standard Fitzpatrick model):
 *   safeTime = (200 - 10 * uvIndex) * skinTypeFactor
 *
 * Skin type factors (higher number → skin tolerates more UV):
 *   Type I:   0.5   (very fair — burns always)
 *   Type II:  0.7
 *   Type III: 0.9
 *   Type IV:  1.1
 *   Type V:   1.4
 *   Type VI:  1.8
 *
 * The progress bar fills from green → yellow → red as exposure approaches safe limit.
 *
 * Props:
 *   uvIndex         current UV index (0–16)
 *   skinType        Fitzpatrick skin type (1–6)
 *   minutesExposed  total sun exposure so far this session (minutes)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BurnRiskBarProps {
  uvIndex: number;
  skinType: number;
  minutesExposed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKIN_TYPE_FACTORS: Record<number, number> = {
  1: 0.5,
  2: 0.7,
  3: 0.9,
  4: 1.1,
  5: 1.4,
  6: 1.8,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateSafeTime(uvIndex: number, skinType: number): number {
  if (uvIndex <= 0) return 999; // no UV — effectively infinite
  const factor = SKIN_TYPE_FACTORS[Math.max(1, Math.min(6, Math.round(skinType)))] ?? 0.9;
  return Math.max(1, (200 - 10 * uvIndex) * factor);
}

function getRiskColor(ratio: number): string {
  if (ratio < 0.5) return '#22C55E';  // green
  if (ratio < 0.75) return '#EAB308'; // yellow
  if (ratio < 0.9) return '#F97316';  // orange
  return '#EF4444';                   // red
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BurnRiskBar({ uvIndex, skinType, minutesExposed }: BurnRiskBarProps) {
  const safeMinutes = useMemo(
    () => calculateSafeTime(uvIndex, skinType),
    [uvIndex, skinType]
  );

  const ratio = useMemo(
    () => Math.max(0, Math.min(minutesExposed / safeMinutes, 1)),
    [minutesExposed, safeMinutes]
  );

  const barColor = useMemo(() => getRiskColor(ratio), [ratio]);

  const minutesRemaining = Math.max(0, Math.round(safeMinutes - minutesExposed));
  const isOverLimit = minutesExposed >= safeMinutes;

  const statusText = isOverLimit
    ? 'Burn risk exceeded — seek shade'
    : minutesRemaining === 0
    ? 'Approaching burn threshold'
    : `${minutesRemaining} min until burn risk`;

  return (
    <View style={styles.container}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.labelLeft}>Burn Risk</Text>
        <Text style={[styles.labelRight, { color: barColor }]}>{statusText}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.trackContainer}>
        <View style={[styles.fill, { flex: ratio, backgroundColor: barColor }]} />
        <View style={[styles.empty, { flex: Math.max(0, 1 - ratio) }]} />
      </View>

      {/* Min/Max labels */}
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>0 min</Text>
        <Text style={styles.rangeText}>{Math.round(safeMinutes)} min safe limit</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelLeft: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  labelRight: {
    fontSize: 13,
    fontWeight: '500',
  },
  trackContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  fill: {
    borderRadius: 5,
  },
  empty: {
    backgroundColor: '#E5E7EB',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
