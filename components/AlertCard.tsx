import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, Clock, Flame, Snooze, X } from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';

interface AlertCardProps {
  alert: {
    id: string;
    contact: {
      id: string;
      name: string;
      warmth: number;
      warmth_band: string;
      watch_status: string;
    };
    warmth_at_alert: number;
    days_since_interaction: number | null;
    created_at: string;
  };
  onReachOut: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}

export function AlertCard({ alert, onReachOut, onSnooze, onDismiss }: AlertCardProps) {
  const { theme } = useAppSettings();
  const router = useRouter();

  const getWarmthColor = (warmth: number) => {
    if (warmth >= 70) return '#10b981';
    if (warmth >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getWatchIcon = () => {
    switch (alert.contact.watch_status) {
      case 'vip':
        return '⭐';
      case 'important':
        return '🔥';
      case 'watch':
        return '📉';
      default:
        return '👤';
    }
  };

  const formatDaysAgo = (days: number | null) => {
    if (days === null) return 'No recent contact';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const warmthColor = getWarmthColor(alert.warmth_at_alert);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.contactInfo}>
          <Text style={styles.icon}>{getWatchIcon()}</Text>
          <View style={styles.contactText}>
            <Text style={[styles.contactName, { color: theme.colors.text }]}>
              {alert.contact.name}
            </Text>
            <Text style={[styles.watchStatus, { color: theme.colors.textSecondary }]}>
              {alert.contact.watch_status.toUpperCase()}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <X size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Metrics */}
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Flame size={16} color={warmthColor} />
          <Text style={[styles.metricValue, { color: warmthColor }]}>
            {alert.warmth_at_alert}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            Warmth
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metric}>
          <Clock size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {alert.days_since_interaction ?? '--'}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            {formatDaysAgo(alert.days_since_interaction)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn, { borderColor: theme.colors.border }]}
          onPress={onSnooze}
        >
          <Snooze size={16} color={theme.colors.text} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>
            Snooze 7d
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
          onPress={onReachOut}
        >
          <MessageCircle size={16} color="#fff" />
          <Text style={styles.primaryActionText}>
            Reach Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  icon: {
    fontSize: 32
  },
  contactText: {
    flex: 1,
    gap: 2
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600'
  },
  watchStatus: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  dismissBtn: {
    padding: 4
  },
  metrics: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4
  },
  divider: {
    width: 1,
    backgroundColor: '#e5e5e5',
    marginHorizontal: 8
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700'
  },
  metricLabel: {
    fontSize: 11
  },
  actions: {
    flexDirection: 'row',
    gap: 8
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8
  },
  secondaryBtn: {
    borderWidth: 1,
    backgroundColor: 'transparent'
  },
  primaryBtn: {
    borderWidth: 0
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600'
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  }
});
