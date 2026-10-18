import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, BellOff, Archive } from 'lucide-react-native';
import { AlertCard } from '@/components/AlertCard';
import { apiFetch } from '@/lib/api';
import { useAppSettings } from '@/providers/AppSettingsProvider';

export default function AlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [showDismissed]);

  const loadAlerts = async () => {
    try {
      const response = await apiFetch(
        `/v1/alerts?dismissed=${showDismissed}`,
        { requireAuth: true }
      );
      setAlerts(response.items || []);
    } catch (error: any) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlerts();
  }, [showDismissed]);

  const handleReachOut = (alert: any) => {
    router.push({
      pathname: '/compose/[contactId]',
      params: {
        contactId: alert.contact.id,
        goalId: 'check_in',
        source: 'warmth_alert'
      }
    });

    // Mark as acted on
    handleAction(alert.id, 'reached_out');
  };

  const handleSnooze = async (alertId: string) => {
    await handleAction(alertId, 'snooze');
  };

  const handleDismiss = async (alertId: string) => {
    await handleAction(alertId, 'dismiss');
  };

  const handleAction = async (alertId: string, action: 'dismiss' | 'snooze' | 'reached_out') => {
    try {
      await apiFetch(`/v1/alerts/${alertId}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({
          action,
          snooze_days: action === 'snooze' ? 7 : undefined
        })
      });

      // Remove from list
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error: any) {
      console.error(`Failed to ${action} alert:`, error);
      alert(`Failed to ${action} alert`);
    }
  };

  const pendingCount = alerts.filter(a => !a.dismissed).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Bell size={24} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Warmth Alerts
          </Text>
          {!showDismissed && pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.toggleBtn, { borderColor: theme.colors.border }]}
          onPress={() => setShowDismissed(!showDismissed)}
        >
          {showDismissed ? (
            <>
              <Bell size={16} color={theme.colors.text} />
              <Text style={[styles.toggleText, { color: theme.colors.text }]}>
                Active
              </Text>
            </>
          ) : (
            <>
              <Archive size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.toggleText, { color: theme.colors.textSecondary }]}>
                Archived
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading alerts...
            </Text>
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BellOff size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {showDismissed ? 'No archived alerts' : 'All caught up!'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {showDismissed
                ? 'Dismissed alerts will appear here'
                : 'We\'ll notify you when important contacts need attention'}
            </Text>
          </View>
        ) : (
          <>
            {alerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onReachOut={() => handleReachOut(alert)}
                onSnooze={() => handleSnooze(alert.id)}
                onDismiss={() => handleDismiss(alert.id)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center'
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32
  }
});
