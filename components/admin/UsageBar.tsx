import { View, Text, StyleSheet } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';

interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
}

export function UsageBar({ label, current, limit }: UsageBarProps) {
  const { theme } = useAppSettings();
  const colors = theme.colors;

  const percentage = limit === -1 ? 0 : Math.min((current / limit) * 100, 100);
  const isUnlimited = limit === -1;
  const isNearLimit = percentage >= 90;
  const isOverLimit = percentage >= 100;

  const barColor = isOverLimit
    ? '#EF4444'
    : isNearLimit
    ? '#F59E0B'
    : '#10B981';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {isUnlimited ? (
            <>
              {current} <Text style={{ color: colors.textSecondary }}>/ Unlimited</Text>
            </>
          ) : (
            <>
              {current} <Text style={{ color: colors.textSecondary }}>/ {limit}</Text>
            </>
          )}
        </Text>
      </View>

      {!isUnlimited && (
        <>
          <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: barColor,
                  width: `${percentage}%`,
                },
              ]}
            />
          </View>

          {isNearLimit && (
            <Text style={[styles.warning, { color: barColor }]}>
              {isOverLimit
                ? 'Limit exceeded - upgrade to continue'
                : `${100 - Math.floor(percentage)}% remaining`}
            </Text>
          )}
        </>
      )}

      {isUnlimited && (
        <Text style={[styles.unlimited, { color: colors.textSecondary }]}>
          No limits on this plan
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  warning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  unlimited: {
    fontSize: 12,
    marginTop: 4,
  },
});
