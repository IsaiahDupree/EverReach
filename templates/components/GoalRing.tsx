/**
 * GoalRing
 *
 * Circular progress ring that displays a fill percentage.
 * Implemented with React Native Views using a rotation-mask approach:
 *   - Two half-circles are rotated to reveal the progress arc.
 *   - The SunTrace orange (#F97316) is used for the fill.
 *
 * Props:
 *   progress  0–1 (clamped)
 *   size      outer diameter in dp (default 120)
 *   label     primary text shown in centre (e.g. "65%")
 *   sublabel  secondary text shown below label
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoalRingProps {
  progress: number;
  size?: number;
  label?: string;
  sublabel?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILL_COLOR = '#F97316';  // SunTrace orange
const TRACK_COLOR = '#F3F4F6'; // light grey track
const STROKE_RATIO = 0.12;    // stroke width as a fraction of size

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GoalRing({ progress, size = 120, label, sublabel }: GoalRingProps) {
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const strokeWidth = Math.round(size * STROKE_RATIO);
  const innerSize = size - strokeWidth * 2;
  const halfSize = size / 2;

  // Convert progress to degrees (0–360)
  const degrees = clampedProgress * 360;

  // Derived label: percentage if no label provided
  const displayLabel = label ?? `${Math.round(clampedProgress * 100)}%`;

  // We split the arc into two halves and rotate them to achieve the fill.
  // The "right half" is always visible if progress > 0.
  // The "left half" becomes visible once progress > 50%.
  const rightRotation = useMemo(() => {
    return degrees <= 180 ? degrees : 180;
  }, [degrees]);

  const leftRotation = useMemo(() => {
    return degrees > 180 ? degrees - 180 : 0;
  }, [degrees]);

  const labelFontSize = Math.round(size * 0.2);
  const sublabelFontSize = Math.round(size * 0.11);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Track (background circle) */}
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: TRACK_COLOR,
          },
        ]}
      />

      {/* Right half of arc (degrees 0–180) */}
      <View
        style={[
          styles.halfCircleContainer,
          { width: halfSize, height: size, left: halfSize },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: FILL_COLOR,
              transform: [{ rotate: `${rightRotation}deg` }],
            },
          ]}
        />
      </View>

      {/* Left half of arc (degrees 180–360) — only rendered when progress > 50% */}
      {degrees > 180 && (
        <View
          style={[
            styles.halfCircleContainer,
            { width: halfSize, height: size, left: 0 },
          ]}
        >
          <View
            style={[
              styles.halfCircleLeft,
              {
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: FILL_COLOR,
                transform: [{ rotate: `${leftRotation}deg` }],
              },
            ]}
          />
        </View>
      )}

      {/* Inner circle to create ring effect */}
      <View
        style={[
          styles.innerCircle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            top: strokeWidth,
            left: strokeWidth,
          },
        ]}
      />

      {/* Centre text */}
      <View style={styles.centerText}>
        <Text style={[styles.label, { fontSize: labelFontSize, color: FILL_COLOR }]}>
          {displayLabel}
        </Text>
        {sublabel ? (
          <Text style={[styles.sublabel, { fontSize: sublabelFontSize }]}>{sublabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  halfCircleContainer: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    // Clip right half: only the left half of this bordered circle is visible
    // because the container clips at width = halfSize
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  halfCircleLeft: {
    position: 'absolute',
    top: 0,
    // This half-circle is positioned so its right half is visible
    right: 0,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  innerCircle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
  },
  sublabel: {
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
});
