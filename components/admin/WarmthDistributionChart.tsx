import { View, Text, StyleSheet } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';

interface WarmthDistributionProps {
  data: {
    hot: number;
    warm: number;
    cooling: number;
    cold: number;
  };
}

export function WarmthDistributionChart({ data }: WarmthDistributionProps) {
  const { theme } = useAppSettings();
  const colors = theme.colors;

  const total = data.hot + data.warm + data.cooling + data.cold;

  const segments = [
    { label: 'Hot', count: data.hot, color: '#EF4444', percentage: total > 0 ? (data.hot / total * 100) : 0 },
    { label: 'Warm', count: data.warm, color: '#F59E0B', percentage: total > 0 ? (data.warm / total * 100) : 0 },
    { label: 'Cooling', count: data.cooling, color: '#3B82F6', percentage: total > 0 ? (data.cooling / total * 100) : 0 },
    { label: 'Cold', count: data.cold, color: '#6B7280', percentage: total > 0 ? (data.cold / total * 100) : 0 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Warmth Distribution</Text>

      {/* Bar Chart */}
      <View style={styles.barContainer}>
        {segments.map((segment, index) => (
          segment.percentage > 0 && (
            <View
              key={segment.label}
              style={[
                styles.bar,
                {
                  backgroundColor: segment.color,
                  width: `${segment.percentage}%`,
                  borderTopLeftRadius: index === 0 ? 8 : 0,
                  borderBottomLeftRadius: index === 0 ? 8 : 0,
                  borderTopRightRadius: index === segments.length - 1 ? 8 : 0,
                  borderBottomRightRadius: index === segments.length - 1 ? 8 : 0,
                },
              ]}
            />
          )
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map(segment => (
          <View key={segment.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
              {segment.label}
            </Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>
              {segment.count}
            </Text>
            <Text style={[styles.legendPercentage, { color: colors.textSecondary }]}>
              ({segment.percentage.toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  barContainer: {
    flexDirection: 'row',
    height: 40,
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 8,
  },
  bar: {
    height: '100%',
  },
  legend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 14,
    flex: 1,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  legendPercentage: {
    fontSize: 12,
  },
});
