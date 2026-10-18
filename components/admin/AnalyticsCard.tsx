import { View, Text, StyleSheet } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { LucideIcon } from 'lucide-react-native';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function AnalyticsCard({ title, value, change, icon: Icon, iconColor }: AnalyticsCardProps) {
  const { theme } = useAppSettings();
  const colors = theme.colors;

  const isPositive = change?.startsWith('+');
  const changeColor = isPositive ? '#10B981' : '#EF4444';

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor ? iconColor + '20' : colors.primary + '20' }]}>
        <Icon size={20} color={iconColor || colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        {change && (
          <Text style={[styles.change, { color: changeColor }]}>{change}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
