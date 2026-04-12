/**
 * StreakBadge
 *
 * Displays a flame icon alongside the streak count.
 * The text uses an orange-to-red gradient effect via nested Text elements
 * (React Native does not support linear gradient on text directly, so we
 * approximate with a warm orange colour that renders well on all platforms).
 *
 * Props:
 *   count  number of consecutive days in the current streak
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StreakBadgeProps {
  count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLAME_COLOR = '#F97316'; // SunTrace orange
const COUNT_COLOR = '#EA580C'; // slightly deeper orange for contrast

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StreakBadge({ count }: StreakBadgeProps) {
  return (
    <View style={styles.container}>
      <Flame size={22} color={FLAME_COLOR} strokeWidth={2} />
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>{count === 1 ? 'day' : 'days'}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    fontSize: 18,
    fontWeight: '700',
    color: COUNT_COLOR,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: FLAME_COLOR,
    marginTop: 1,
  },
});
