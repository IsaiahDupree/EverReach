/**
 * Bottom Navigation Component
 * 
 * Reusable bottom navigation bar for modal/stack screens
 * Provides quick access to common actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import * as haptics from '@/lib/haptics';

export interface BottomNavAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
  badge?: number;
  testID?: string;
}

interface BottomNavProps {
  actions: BottomNavAction[];
  backgroundColor?: string;
  variant?: 'default' | 'elevated';
}

export default function BottomNav({ 
  actions, 
  backgroundColor,
  variant = 'default' 
}: BottomNavProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = (action: BottomNavAction) => {
    if (action.disabled) return;
    haptics.light();
    action.onPress();
  };

  const styles = createStyles(theme, insets.bottom, backgroundColor, variant);

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionButton, action.disabled && styles.actionButtonDisabled]}
            onPress={() => handlePress(action)}
            disabled={action.disabled}
            testID={action.testID || `bottom-nav-${action.id}`}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <action.icon
                size={24}
                color={
                  action.disabled
                    ? theme.colors.textTertiary
                    : theme.colors.primary
                }
              />
              {action.badge !== undefined && action.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.actionLabel,
                action.disabled && styles.actionLabelDisabled,
              ]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (
  theme: any,
  bottomInset: number,
  backgroundColor?: string,
  variant?: 'default' | 'elevated'
) =>
  StyleSheet.create({
    container: {
      backgroundColor: backgroundColor || theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingBottom: Math.max(bottomInset, 8),
      ...(variant === 'elevated' ? theme.shadows.medium : {}),
    },
    innerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 12,
      paddingBottom: 8,
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      minHeight: 64,
      maxWidth: 100,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    iconContainer: {
      position: 'relative',
      marginBottom: 4,
    },
    badge: {
      position: 'absolute',
      top: -6,
      right: -10,
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '600',
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'center',
    },
    actionLabelDisabled: {
      color: theme.colors.textTertiary,
    },
  });
