import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useBilling } from '@/hooks/admin/useBilling';
import { PlanCard } from '@/components/admin/PlanCard';
import { UsageBar } from '@/components/admin/UsageBar';

/**
 * Billing & Subscription Screen
 * Shows plan details and usage limits
 */
export default function BillingScreen() {
  const router = useRouter();
  const { theme } = useAppSettings();
  const colors = theme.colors;
  const { subscription, usage, isLoading, error, refetch, openCustomerPortal } = useBilling();

  const handleUpgrade = () => {
    // Navigate to subscription plans screen
    router.push('/subscription-plans');
  };

  const handleManage = async () => {
    try {
      await openCustomerPortal();
    } catch (err) {
      Alert.alert(
        'Error',
        'Failed to open subscription management. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading billing information...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Failed to load billing
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error}
        </Text>
      </View>
    );
  }

  if (!subscription || !usage) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No billing information available
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Billing & Subscription</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage your plan and usage
        </Text>
      </View>

      {/* Current Plan */}
      <View style={styles.section}>
        <PlanCard
          plan={subscription.plan}
          name={subscription.name}
          price={subscription.price}
          billing_period={subscription.billing_period}
          features={subscription.features}
          next_billing_date={subscription.next_billing_date}
          can_upgrade={subscription.can_upgrade}
          can_manage={subscription.can_manage}
          onUpgrade={handleUpgrade}
          onManage={handleManage}
        />
      </View>

      {/* Usage This Month */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Usage This Month
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          {new Date(usage.period_start).toLocaleDateString()} -{' '}
          {new Date(usage.period_end).toLocaleDateString()}
        </Text>

        <View style={[styles.usageCard, { backgroundColor: colors.card }]}>
          <UsageBar
            label="Contacts"
            current={usage.contacts}
            limit={subscription.limits.contacts}
          />

          <UsageBar
            label="AI Messages"
            current={usage.ai_messages}
            limit={subscription.limits.ai_messages}
          />

          <UsageBar
            label="Screenshot Analyses"
            current={usage.screenshots}
            limit={subscription.limits.screenshots}
          />

          {subscription.plan === 'team' && (
            <UsageBar
              label="Team Members"
              current={usage.team_members}
              limit={subscription.limits.team_members}
            />
          )}
        </View>
      </View>

      {/* Upgrade Prompt (if on free plan) */}
      {subscription.plan === 'free' && (
        <View style={[styles.upgradePrompt, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.upgradeTitle, { color: colors.primary }]}>
            Ready to unlock more?
          </Text>
          <Text style={[styles.upgradeText, { color: colors.text }]}>
            Upgrade to Pro for unlimited contacts, more AI messages, and advanced features.
          </Text>
        </View>
      )}

      {/* Spacer */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  usageCard: {
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  upgradePrompt: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
