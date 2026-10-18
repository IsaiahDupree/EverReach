/**
 * Tooltip Component
 * Feature: HO-HELP-001
 *
 * A reusable tooltip component for providing contextual help.
 * Features:
 * - Dismissible with persistence
 * - Multiple positioning options
 * - AsyncStorage integration for remembering dismissal
 *
 * @module components/common/Tooltip
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tooltip position options
 */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Tooltip component props
 */
export interface TooltipProps {
  /**
   * Unique ID for this tooltip (used for persistence)
   */
  id: string;

  /**
   * Tooltip content text
   */
  content: string;

  /**
   * Position of the tooltip relative to its trigger
   * @default 'bottom'
   */
  position?: TooltipPosition;

  /**
   * Callback when tooltip is dismissed
   */
  onDismiss?: () => void;

  /**
   * Child elements (the tooltip trigger)
   */
  children: React.ReactNode;

  /**
   * Custom styles for the tooltip container
   */
  style?: ViewStyle;
}

/**
 * AsyncStorage key prefix for tooltip dismissal
 */
const STORAGE_KEY_PREFIX = 'tooltip_dismissed_';

/**
 * Tooltip Component
 *
 * Displays a helpful tooltip that can be dismissed and remembers its state.
 *
 * @example
 * ```tsx
 * <Tooltip
 *   id="feature-help"
 *   content="This feature helps you track items"
 *   position="top"
 * >
 *   <Button title="My Feature" />
 * </Tooltip>
 * ```
 */
export default function Tooltip({
  id,
  content,
  position = 'bottom',
  onDismiss,
  children,
  style,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load dismissal state from AsyncStorage on mount
   */
  useEffect(() => {
    loadDismissalState();
  }, [id]);

  /**
   * Check if tooltip has been dismissed before
   */
  const loadDismissalState = async () => {
    try {
      const dismissed = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
      setIsVisible(dismissed !== 'true');
    } catch (error) {
      console.error('Failed to load tooltip dismissal state:', error);
      setIsVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle tooltip dismissal
   */
  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, 'true');
      setIsVisible(false);
      onDismiss?.();
    } catch (error) {
      console.error('Failed to save tooltip dismissal state:', error);
    }
  };

  /**
   * Get positioning styles based on position prop
   */
  const getPositionStyles = (): ViewStyle => {
    switch (position) {
      case 'top':
        return styles.positionTop;
      case 'left':
        return styles.positionLeft;
      case 'right':
        return styles.positionRight;
      case 'bottom':
      default:
        return styles.positionBottom;
    }
  };

  // Don't render while loading or if dismissed
  if (isLoading || !isVisible) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper}>
      {children}
      <View
        style={[styles.container, getPositionStyles(), style]}
        testID="tooltip-container"
      >
        <Text style={styles.content}>{content}</Text>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissButton}
          testID="tooltip-dismiss"
          accessibilityLabel="Dismiss tooltip"
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    position: 'absolute',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    paddingRight: 36,
    maxWidth: 250,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  content: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  dismissText: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '300',
  },
  positionTop: {
    bottom: '100%',
    marginBottom: 8,
  },
  positionBottom: {
    top: '100%',
    marginTop: 8,
  },
  positionLeft: {
    right: '100%',
    marginRight: 8,
  },
  positionRight: {
    left: '100%',
    marginLeft: 8,
  },
});
