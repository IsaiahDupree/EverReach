/**
 * UVGauge
 *
 * Arc-style UV index gauge using React Native View/Text with absolute positioning.
 * No SVG library required. The "arc" is represented as a segmented color bar
 * arranged in a semi-circle using rotation transforms.
 *
 * Color coding follows WHO UV index scale:
 *   0–2   Low        → green
 *   3–5   Moderate   → yellow
 *   6–7   High       → orange
 *   8–10  Very High  → red
 *   11+   Extreme    → purple
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { APP_CONFIG } from '@/constants/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UVGaugeProps {
  uvIndex: number;
  size?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UV_MAX = 12;
const SEGMENT_COUNT = 24; // number of tick marks around the arc

function getUVColor(uv: number): string {
  if (uv <= APP_CONFIG.UV.LOW_MAX) return '#22C55E';       // green
  if (uv <= APP_CONFIG.UV.MODERATE_MAX) return '#EAB308';  // yellow
  if (uv <= APP_CONFIG.UV.HIGH_MAX) return '#F97316';      // orange
  if (uv <= APP_CONFIG.UV.VERY_HIGH_MAX) return '#EF4444'; // red
  return '#A855F7';                                        // purple
}

function getUVLabel(uv: number): string {
  if (uv <= APP_CONFIG.UV.LOW_MAX) return 'Low';
  if (uv <= APP_CONFIG.UV.MODERATE_MAX) return 'Moderate';
  if (uv <= APP_CONFIG.UV.HIGH_MAX) return 'High';
  if (uv <= APP_CONFIG.UV.VERY_HIGH_MAX) return 'Very High';
  return 'Extreme';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UVGauge({ uvIndex, size = 200 }: UVGaugeProps) {
  const clampedUV = Math.max(0, Math.min(uvIndex, UV_MAX));
  const color = useMemo(() => getUVColor(clampedUV), [clampedUV]);
  const label = useMemo(() => getUVLabel(clampedUV), [clampedUV]);

  const radius = size / 2 - 12;
  const segmentAngle = 180 / SEGMENT_COUNT; // span 180° (semi-circle)
  const fillCount = Math.round((clampedUV / UV_MAX) * SEGMENT_COUNT);

  // Each tick is a narrow rectangle rotated around the center of the gauge
  const ticks = useMemo(() => {
    return Array.from({ length: SEGMENT_COUNT }, (_, i) => {
      const angleDeg = -90 + i * segmentAngle; // start from left (-90°), sweep to right (+90°)
      const filled = i < fillCount;

      // Compute the position of each tick's centre along the arc
      const rad = (angleDeg * Math.PI) / 180;
      const cx = size / 2 + radius * Math.cos(rad);
      const cy = size / 2 + radius * Math.sin(rad);

      const tickWidth = Math.max(3, size * 0.025);
      const tickHeight = Math.max(10, size * 0.09);

      // Segment colour: filled segments use UV colour, unfilled segments use grey
      const segColor = filled ? color : '#D1D5DB';

      return { cx, cy, angleDeg, tickWidth, tickHeight, segColor };
    });
  }, [fillCount, color, size, radius, segmentAngle]);

  const centerFontSize = Math.round(size * 0.22);
  const labelFontSize = Math.round(size * 0.085);
  const subtitleFontSize = Math.round(size * 0.075);

  return (
    <View style={[styles.container, { width: size, height: size / 2 + size * 0.25 }]}>
      {/* Arc ticks */}
      {ticks.map((tick, i) => (
        <View
          key={i}
          style={[
            styles.tick,
            {
              width: tick.tickWidth,
              height: tick.tickHeight,
              backgroundColor: tick.segColor,
              borderRadius: tick.tickWidth / 2,
              position: 'absolute',
              left: tick.cx - tick.tickWidth / 2,
              top: tick.cy - tick.tickHeight / 2,
              transform: [{ rotate: `${tick.angleDeg + 90}deg` }],
            },
          ]}
        />
      ))}

      {/* Center content */}
      <View
        style={[
          styles.centerContent,
          {
            top: size / 2 - centerFontSize * 0.5,
            left: 0,
            right: 0,
          },
        ]}
      >
        <Text style={[styles.uvNumber, { fontSize: centerFontSize, color }]}>
          {Math.round(clampedUV)}
        </Text>
        <Text style={[styles.uvIndexLabel, { fontSize: subtitleFontSize }]}>UV Index</Text>
        <Text style={[styles.uvLevelLabel, { fontSize: labelFontSize, color }]}>{label}</Text>
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
    alignItems: 'center',
  },
  tick: {
    // Positioned absolutely — individual styles applied inline above
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  uvNumber: {
    fontWeight: '700',
    lineHeight: undefined,
  },
  uvIndexLabel: {
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  uvLevelLabel: {
    fontWeight: '600',
    marginTop: 2,
  },
});
