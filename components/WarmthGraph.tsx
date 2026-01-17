import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { getWarmthColor, getWarmthLabel } from '@/lib/warmthColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WarmthDataPoint {
  date: string;
  score: number;
}

interface WarmthGraphProps {
  data: WarmthDataPoint[];
  currentScore: number;
  height?: number;
  showLabels?: boolean;
}

/**
 * WarmthGraph - Displays warmth score trend over time
 * 
 * Uses react-native-gifted-charts for beautiful, consistent visualization
 */
export default function WarmthGraph({ 
  data, 
  currentScore,
  height = 180,
  showLabels = true 
}: WarmthGraphProps) {
  
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Default data points for empty state
      return [
        { value: currentScore, label: 'Now', dataPointText: String(currentScore) }
      ];
    }

    // Convert warmth data to chart format
    return data.map((point, index) => {
      const date = new Date(point.date);
      const label = index === data.length - 1 
        ? 'Now' 
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      return {
        value: point.score,
        label: showLabels ? label : '',
        dataPointText: index === data.length - 1 ? String(Math.round(point.score)) : '',
      };
    });
  }, [data, currentScore, showLabels]);

  // Get current warmth color and label
  const warmthColor = getWarmthColor(currentScore);
  const warmthLabel = getWarmthLabel(currentScore);

  // Calculate gradient colors (lighter version for area)
  const gradientColor = `${warmthColor}40`; // 25% opacity

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Warmth Trend</Text>
        <View style={[styles.badge, { backgroundColor: `${warmthColor}20` }]}>
          <View style={[styles.dot, { backgroundColor: warmthColor }]} />
          <Text style={[styles.badgeText, { color: warmthColor }]}>
            {warmthLabel}
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 80}
          height={height}
          
          // Styling
          color={warmthColor}
          thickness={3}
          curved
          
          // Area under line
          areaChart
          startFillColor={warmthColor}
          endFillColor={gradientColor}
          startOpacity={0.3}
          endOpacity={0.1}
          
          // Grid
          hideRules
          hideYAxisText
          xAxisColor="#E5E7EB"
          xAxisThickness={1}
          
          // Labels
          xAxisLabelTextStyle={styles.labelText}
          
          // Data points
          hideDataPoints={false}
          dataPointsColor={warmthColor}
          dataPointsRadius={4}
          dataPointsHeight={8}
          dataPointsWidth={8}
          
          // Text on data points
          textColor={warmthColor}
          textFontSize={12}
          textShiftY={-10}
          
          // Spacing
          spacing={chartData.length > 1 ? (SCREEN_WIDTH - 120) / (chartData.length - 1) : 50}
          initialSpacing={20}
          endSpacing={20}
          
          // Y-axis range (0-100 for warmth)
          yAxisOffset={0}
          maxValue={100}
          noOfSections={4}
          
          // Animations
          animateOnDataChange
          animationDuration={800}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Cold (0-25)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Cooling (26-50)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Warm (51-75)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>Hot (76-100)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 11,
    color: '#6B7280',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
