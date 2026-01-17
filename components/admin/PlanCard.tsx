import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { Check } from 'lucide-react-native';

interface PlanCardProps {
  plan: string;
  name: string;
  price: number;
  billing_period: string | null;
  features: string[];
  next_billing_date: string | null;
  can_upgrade: boolean;
  can_manage: boolean;
  onUpgrade?: () => void;
  onManage?: () => void;
}

export function PlanCard({
  plan,
  name,
  price,
  billing_period,
  features,
  next_billing_date,
  can_upgrade,
  can_manage,
  onUpgrade,
  onManage,
}: PlanCardProps) {
  const { theme } = useAppSettings();
  const colors = theme.colors;

  const planColors: Record<string, string> = {
    free: '#6B7280',
    pro: '#3B82F6',
    team: '#8B5CF6',
  };

  const planColor = planColors[plan] || planColors.free;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Plan Badge */}
      <View style={[styles.badge, { backgroundColor: planColor }]}>
        <Text style={styles.badgeText}>{name}</Text>
      </View>

      {/* Price */}
      <View style={styles.priceContainer}>
        <Text style={[styles.price, { color: colors.text }]}>
          ${price}
          {billing_period && (
            <Text style={[styles.period, { color: colors.textSecondary }]}>
              /{billing_period}
            </Text>
          )}
        </Text>
      </View>

      {/* Next Billing */}
      {next_billing_date && (
        <Text style={[styles.nextBilling, { color: colors.textSecondary }]}>
          Next billing: {new Date(next_billing_date).toLocaleDateString()}
        </Text>
      )}

      {/* Features */}
      <View style={styles.features}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Check size={16} color={planColor} style={styles.checkIcon} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {can_upgrade && onUpgrade && (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: planColor }]}
            onPress={onUpgrade}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Upgrade Plan</Text>
          </TouchableOpacity>
        )}

        {can_manage && onManage && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
            onPress={onManage}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Manage Subscription
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priceContainer: {
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
  },
  period: {
    fontSize: 18,
  },
  nextBilling: {
    fontSize: 14,
    marginBottom: 20,
  },
  features: {
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
