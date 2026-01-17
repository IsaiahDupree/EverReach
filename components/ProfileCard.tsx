import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useAppSettings, type Theme } from '@/providers/AppSettingsProvider';
import { router } from 'expo-router';
import { useAnalytics } from '@/hooks/useAnalytics';
import AppAnalytics from '@/lib/analytics';
import { AccountRepo, type MeResponse, type UsageResponse } from '@/repos/AccountRepo';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { SubscriptionRepo } from '@/repos/SubscriptionRepo';
import { FLAGS } from '@/constants/flags';

export default function ProfileCard() {
  const { theme } = useAppSettings();
  const analytics = useAnalytics('ProfileCard');
  const { isPaid, trialDaysRemaining, trialGateStrategy, trialUsageSeconds, trialUsageSecondsLimit } = useSubscription();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  const trialMeta = {
    trial_days_remaining: trialDaysRemaining,
    trial_gate_strategy: trialGateStrategy,
    trial_usage_seconds: trialUsageSeconds,
    trial_usage_seconds_limit: trialUsageSecondsLimit,
    is_paid: isPaid,
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [m, u] = await Promise.allSettled([AccountRepo.getMe(), AccountRepo.getUsage()]);
      if (m.status === 'fulfilled') setMe(m.value as MeResponse);
      if (u.status === 'fulfilled') setUsage(u.value as UsageResponse);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    analytics.track('profile_card_viewed', AppAnalytics.withTrialProps({}, trialMeta));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewPlans = () => {
    analytics.track('profile_cta_clicked', AppAnalytics.withTrialProps({ cta: 'view_plans' }, trialMeta));
    router.push('/subscription-plans');
  };

  const handleManageBilling = async () => {
    analytics.track('profile_cta_clicked', AppAnalytics.withTrialProps({ cta: 'manage_billing' }, trialMeta));
    if (FLAGS.LOCAL_ONLY) {
      Alert.alert('Unavailable', 'Billing portal is disabled in local-only mode.');
      return;
    }
    try {
      const returnUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/subscription-plans';
      const session = await SubscriptionRepo.createPortalSession({ return_url: returnUrl });
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.location.href = session.url;
      } else {
        // Native: open in in-app browser or external
        // Defer to web route for now
        router.push('/subscription-plans');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to open billing portal');
    }
  };

  const handleRefresh = async () => {
    analytics.track('profile_refresh_clicked', AppAnalytics.withTrialProps({}, trialMeta));
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your Account</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{me?.name || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{me?.email || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Organization</Text>
            <Text style={styles.value}>{me?.org?.name || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plan</Text>
            <Text style={styles.value}>{me?.plan || (isPaid ? 'Pro' : 'Free/Trial')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{me?.subscription_status || (isPaid ? 'active' : 'trial')}</Text>
          </View>
          {!isPaid && (
            <View style={styles.row}>
              <Text style={styles.label}>Trial</Text>
              <Text style={styles.value}>
                {trialGateStrategy === 'screen_time' && typeof trialUsageSecondsLimit === 'number'
                  ? `${Math.floor((trialUsageSeconds || 0)/60)} / ${Math.floor(trialUsageSecondsLimit/60)} min`
                  : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left`}
              </Text>
            </View>
          )}
          {usage && (
            <View style={styles.row}>
              <Text style={styles.label}>Usage</Text>
              <Text style={styles.value}>
                {usage.used}/{usage.limit} {usage.unit || ''}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]} onPress={handleRefresh} disabled={refreshing}>
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handleViewPlans}>
              <Text style={[styles.buttonText, { color: theme.colors.surface }]}>View Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]} onPress={handleManageBilling}>
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>Manage Billing</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  refreshText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
