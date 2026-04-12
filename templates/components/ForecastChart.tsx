/**
 * ForecastChart
 *
 * Horizontal bar chart displaying hourly UV forecast.
 * Bars are built from React Native Views (no charting library).
 *
 * Features:
 *   - X-axis: hour labels (6 AM, 7 AM, …)
 *   - Y-axis: UV 0–12 (bar height proportional)
 *   - Current hour: highlighted with a distinct outline
 *   - Best window hours: filled in SunTrace orange (#F97316)
 *   - Non-best hours: filled in the WHO UV colour for that UV value
 *
 * Props:
 *   hours        Array of UVForecast objects (typically today's hourly data)
 *   currentHour  0–23 integer; current hour to highlight (optional)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { UVForecast } from '@/types/models';
import { APP_CONFIG } from '@/constants/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ForecastChartProps {
  hours: UVForecast[];
  currentHour?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAR_MAX_HEIGHT = 90;
const UV_MAX = 12;
const BAR_WIDTH = 28;
const BAR_GAP = 6;
const BEST_WINDOW_COLOR = '#F97316';
const CURRENT_HOUR_BORDER = '#1D4ED8';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function getUVBarColor(uv: number, isBestWindow: boolean): string {
  if (isBestWindow) return BEST_WINDOW_COLOR;
  if (uv <= APP_CONFIG.UV.LOW_MAX) return '#86EFAC';      // light green
  if (uv <= APP_CONFIG.UV.MODERATE_MAX) return '#FDE047'; // light yellow
  if (uv <= APP_CONFIG.UV.HIGH_MAX) return '#FDBA74';     // light orange
  if (uv <= APP_CONFIG.UV.VERY_HIGH_MAX) return '#FCA5A5'; // light red
  return '#D8B4FE';                                       // light purple (extreme)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ForecastChart({ hours, currentHour }: ForecastChartProps) {
  const resolvedCurrentHour = useMemo(
    () => currentHour ?? new Date().getHours(),
    [currentHour]
  );

  // Filter to only show hours 6–20 by default for readability,
  // but include all if caller has already filtered.
  const displayHours = useMemo(() => {
    const filtered = hours.filter((h) => h.hour >= 6 && h.hour <= 20);
    return filtered.length > 0 ? filtered : hours;
  }, [hours]);

  if (displayHours.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No forecast data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Y-axis labels (right side) */}
      <View style={styles.yAxis}>
        {[UV_MAX, 8, 4, 0].map((v) => (
          <Text key={v} style={[styles.yLabel, { bottom: (v / UV_MAX) * BAR_MAX_HEIGHT - 7 }]}>
            {v}
          </Text>
        ))}
      </View>

      {/* Scrollable bar area */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.barsContainer}
      >
        {displayHours.map((h) => {
          const isCurrentHour = h.hour === resolvedCurrentHour;
          const barHeight = Math.max(2, (h.uv_index / UV_MAX) * BAR_MAX_HEIGHT);
          const barColor = getUVBarColor(h.uv_index, h.is_best_window);

          return (
            <View
              key={`${h.date}-${h.hour}`}
              style={[styles.barColumn, { width: BAR_WIDTH, marginRight: BAR_GAP }]}
            >
              {/* UV value above bar */}
              <Text style={styles.uvValue}>
                {h.uv_index > 0 ? h.uv_index.toFixed(1) : ''}
              </Text>

              {/* Bar track */}
              <View style={[styles.barTrack, { height: BAR_MAX_HEIGHT }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: barColor,
                      borderWidth: isCurrentHour ? 2 : 0,
                      borderColor: isCurrentHour ? CURRENT_HOUR_BORDER : 'transparent',
                    },
                  ]}
                />
              </View>

              {/* Hour label */}
              <Text
                style={[
                  styles.hourLabel,
                  isCurrentHour && styles.hourLabelCurrent,
                ]}
                numberOfLines={1}
              >
                {formatHourLabel(h.hour)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BEST_WINDOW_COLOR }]} />
          <Text style={styles.legendText}>Best window</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { borderWidth: 2, borderColor: CURRENT_HOUR_BORDER }]} />
          <Text style={styles.legendText}>Current hour</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    bottom: 36, // above the hour labels
    width: 24,
    height: BAR_MAX_HEIGHT,
  },
  yLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#9CA3AF',
    left: 0,
  },
  barsContainer: {
    paddingLeft: 28, // leave room for y-axis
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
  },
  uvValue: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
    height: 13,
  },
  barTrack: {
    justifyContent: 'flex-end',
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  hourLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  hourLabelCurrent: {
    color: CURRENT_HOUR_BORDER,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingLeft: 28,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },
  emptyContainer: {
    height: BAR_MAX_HEIGHT + 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
