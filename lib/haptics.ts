/**
 * Haptic Feedback Utility
 * 
 * Provides consistent haptic feedback across iOS and Android.
 * Automatically checks platform before triggering.
 * Skips haptics in iOS Simulator (which doesn't support haptics).
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

/**
 * Check if running on iOS Simulator
 * iOS Simulator doesn't support haptic feedback and will log errors
 */
const isIOSSimulator = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  
  // Check if running in simulator (expo-constants provides this info)
  // In simulator, deviceName often includes "Simulator" or deviceId is a simulator identifier
  const isSimulator = 
    Constants.deviceName?.toLowerCase().includes('simulator') ||
    Constants.executionEnvironment === 'storeClient' ||
    // Additional check: if we can't determine, assume simulator in dev mode
    (__DEV__ && !Constants.isDevice);
  
  return isSimulator;
};

/**
 * Light haptic feedback for subtle interactions
 * Use for: Toggle switches, selecting items, minor actions
 */
export const light = () => {
  // Skip haptics in iOS Simulator to avoid error logs
  if (isIOSSimulator()) return;
  
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Silently fail if haptics not available
    });
  }
};

/**
 * Medium haptic feedback for standard interactions
 * Use for: Button presses, navigation, standard actions
 */
export const medium = () => {
  // Skip haptics in iOS Simulator to avoid error logs
  if (isIOSSimulator()) return;
  
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
      // Silently fail if haptics not available
    });
  }
};

/**
 * Heavy haptic feedback for important interactions
 * Use for: Delete actions, important confirmations, errors
 */
export const heavy = () => {
  // Skip haptics in iOS Simulator to avoid error logs
  if (isIOSSimulator()) return;
  
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
      // Silently fail if haptics not available
    });
  }
};

/**
 * Success haptic feedback
 * Use for: Successful operations, confirmations, completions
 */
export const success = () => {
  // Skip haptics in iOS Simulator to avoid error logs
  if (isIOSSimulator()) return;
  
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      // Silently fail if haptics not available
    });
  }
};

/**
 * Warning haptic feedback
 * Use for: Warnings, caution states, non-critical errors
 */
export const warning = () => {
  // Skip haptics in iOS Simulator to avoid error logs
  if (isIOSSimulator()) return;
  
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {
      // Silently fail if haptics not available
    });
  }
};

/**
 * Error haptic feedback
 * Use for: Errors, failed operations, destructive actions
 */
export const error = () => {
  // Skip haptics in iOS Simulator to avoid error logs
  if (isIOSSimulator()) return;
  
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
      // Silently fail if haptics not available
    });
  }
};

/**
 * Selection changed haptic feedback
 * Use for: Picker selections, tab changes, mode switches
 */
export const selection = () => {
  // Skip haptics in iOS Simulator to avoid error logs
  if (isIOSSimulator()) return;
  
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.selectionAsync().catch(() => {
      // Silently fail if haptics not available
    });
  }
};

// Export as default object for easy access
export const hapticFeedback = {
  light,
  medium,
  heavy,
  success,
  warning,
  error,
  selection,
};

export default hapticFeedback;
