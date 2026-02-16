import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Bell, BellOff, Star, AlertTriangle } from 'lucide-react-native';
import { apiFetch } from '@/lib/api';
import { useAppSettings } from '@/providers/AppSettingsProvider';

type WatchStatus = 'none' | 'watch' | 'important' | 'vip';

interface WatchStatusToggleProps {
  contactId: string;
  currentStatus: WatchStatus;
  currentWarmth?: number;
  onStatusChange?: (newStatus: WatchStatus) => void;
}

export function WatchStatusToggle({
  contactId,
  currentStatus,
  currentWarmth,
  onStatusChange
}: WatchStatusToggleProps) {
  const { theme } = useAppSettings();
  const [status, setStatus] = useState<WatchStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: WatchStatus) => {
    if (loading) return;

    setLoading(true);
    try {
      await apiFetch(`/v1/contacts/${contactId}/watch`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({
          watch_status: newStatus
        })
      });

      setStatus(newStatus);
      onStatusChange?.(newStatus);
    } catch (error: any) {
      console.error('Failed to update watch status:', error);
      alert('Failed to update alert settings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (s: WatchStatus) => {
    switch (s) {
      case 'vip':
        return {
          label: 'VIP',
          icon: Star,
          color: '#FFD700',
          bgColor: '#FFF9E6',
          description: 'Alert when warmth < 40'
        };
      case 'important':
        return {
          label: 'Important',
          icon: AlertTriangle,
          color: '#FF6B6B',
          bgColor: '#FFE6E6',
          description: 'Alert when warmth drops low'
        };
      case 'watch':
        return {
          label: 'Watch',
          icon: Bell,
          color: '#4ECDC4',
          bgColor: '#E6F9F7',
          description: 'Alert when warmth < 25'
        };
      case 'none':
      default:
        return {
          label: 'None',
          icon: BellOff,
          color: theme.colors.textSecondary,
          bgColor: theme.colors.surface,
          description: 'No alerts'
        };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Cold Contact Alerts
        </Text>
        {currentWarmth != null && (
          <Text style={[styles.warmthLabel, { color: theme.colors.textSecondary }]}>
            Current warmth: {currentWarmth}
          </Text>
        )}
      </View>

      <View style={styles.options}>
        {(['none', 'watch', 'important', 'vip'] as WatchStatus[]).map((s) => {
          const config = getStatusConfig(s);
          const Icon = config.icon;
          const isSelected = status === s;

          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? config.bgColor : theme.colors.surface,
                  borderColor: isSelected ? config.color : theme.colors.border,
                  borderWidth: isSelected ? 2 : 1
                }
              ]}
              onPress={() => handleStatusChange(s)}
              disabled={loading}
            >
              <Icon
                size={20}
                color={isSelected ? config.color : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected ? config.color : theme.colors.text,
                    fontWeight: isSelected ? '600' : '400'
                  }
                ]}
              >
                {config.label}
              </Text>
              {isSelected && (
                <Text style={[styles.optionDesc, { color: config.color }]}>
                  {config.description}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      {status !== 'none' && (
        <View style={[styles.info, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            💡 You'll get a push notification when this contact's warmth drops below the threshold.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12
  },
  header: {
    gap: 4
  },
  title: {
    fontSize: 16,
    fontWeight: '600'
  },
  warmthLabel: {
    fontSize: 12
  },
  options: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  option: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4
  },
  optionLabel: {
    fontSize: 14,
    marginTop: 4
  },
  optionDesc: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)'
  },
  info: {
    padding: 12,
    borderRadius: 8,
    marginTop: 4
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18
  }
});
