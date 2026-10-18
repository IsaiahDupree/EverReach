/**
 * ATT (App Tracking Transparency) Permission Helper
 *
 * Wraps expo-tracking-transparency with caching and state management.
 * Required for iOS 14.5+ to track users across apps/websites.
 *
 * Setup:
 * 1. Add expo-tracking-transparency plugin to app.json
 * 2. Add NSUserTrackingUsageDescription to infoPlist
 *
 * Usage:
 * ```tsx
 * import { requestATTPermission, getATTStatus, isTrackingAuthorized } from '@/lib/att-permission';
 *
 * // Request permission (show iOS prompt)
 * const status = await requestATTPermission();
 *
 * // Check current status without prompting
 * const status = await getATTStatus();
 *
 * // Simple boolean check
 * if (await isTrackingAuthorized()) {
 *   // Track user with Meta CAPI, etc.
 * }
 * ```
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TrackingTransparency from 'expo-tracking-transparency';

const STORAGE_KEY = '@att_permission_status';
const STORAGE_TIMESTAMP_KEY = '@att_permission_timestamp';

export type ATTStatus =
  | 'authorized'      // User granted permission
  | 'denied'          // User denied permission
  | 'restricted'      // Permission restricted (parental controls, MDM)
  | 'not-determined'  // User hasn't been asked yet
  | 'unavailable';    // Not iOS or iOS < 14.5

/**
 * Request ATT permission from the user.
 * Shows iOS system prompt if not already determined.
 * Returns cached status if already requested.
 */
export async function requestATTPermission(): Promise<ATTStatus> {
  // ATT only applies to iOS 14.5+
  if (Platform.OS !== 'ios') {
    return 'unavailable';
  }

  try {
    // Check current status first
    const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();

    // If already determined, return cached status
    if (currentStatus !== 'not-determined') {
      await cacheStatus(currentStatus);
      return mapStatus(currentStatus);
    }

    console.log('[ATT] Requesting tracking permission from user...');

    // Request permission (shows iOS prompt)
    const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();

    console.log('[ATT] User responded:', status);

    // Cache the result
    await cacheStatus(status);

    return mapStatus(status);
  } catch (error) {
    console.error('[ATT] Error requesting permission:', error);
    return 'unavailable';
  }
}

/**
 * Get current ATT permission status without prompting the user.
 * Returns cached value if available and recent (< 1 hour old).
 */
export async function getATTStatus(): Promise<ATTStatus> {
  // ATT only applies to iOS 14.5+
  if (Platform.OS !== 'ios') {
    return 'unavailable';
  }

  try {
    // Check cache first (avoid unnecessary native bridge calls)
    const cached = await getCachedStatus();
    if (cached) {
      return cached;
    }

    // Fetch from native
    const { status } = await TrackingTransparency.getTrackingPermissionsAsync();

    // Update cache
    await cacheStatus(status);

    return mapStatus(status);
  } catch (error) {
    console.error('[ATT] Error getting status:', error);
    return 'unavailable';
  }
}

/**
 * Simple boolean check: is tracking currently authorized?
 * Use this for conditional tracking logic.
 */
export async function isTrackingAuthorized(): Promise<boolean> {
  const status = await getATTStatus();
  return status === 'authorized';
}

/**
 * Check if the user has been prompted before (status is determined).
 */
export async function hasBeenPrompted(): Promise<boolean> {
  const status = await getATTStatus();
  return status !== 'not-determined' && status !== 'unavailable';
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map expo-tracking-transparency status to our type
 */
function mapStatus(status: string): ATTStatus {
  switch (status) {
    case 'granted':
    case 'authorized':
      return 'authorized';
    case 'denied':
      return 'denied';
    case 'restricted':
      return 'restricted';
    case 'not-determined':
    case 'undetermined':
      return 'not-determined';
    default:
      return 'unavailable';
  }
}

/**
 * Cache ATT status to AsyncStorage with timestamp
 */
async function cacheStatus(status: string): Promise<void> {
  try {
    const mapped = mapStatus(status);
    const timestamp = Date.now().toString();

    await AsyncStorage.multiSet([
      [STORAGE_KEY, mapped],
      [STORAGE_TIMESTAMP_KEY, timestamp],
    ]);
  } catch (error) {
    console.warn('[ATT] Failed to cache status:', error);
  }
}

/**
 * Get cached ATT status if recent (< 1 hour)
 */
async function getCachedStatus(): Promise<ATTStatus | null> {
  try {
    const [[, status], [, timestamp]] = await AsyncStorage.multiGet([
      STORAGE_KEY,
      STORAGE_TIMESTAMP_KEY,
    ]);

    if (!status || !timestamp) {
      return null;
    }

    // Cache expires after 1 hour
    const age = Date.now() - parseInt(timestamp, 10);
    const MAX_CACHE_AGE = 60 * 60 * 1000; // 1 hour

    if (age > MAX_CACHE_AGE) {
      return null;
    }

    return status as ATTStatus;
  } catch (error) {
    console.warn('[ATT] Failed to read cache:', error);
    return null;
  }
}

/**
 * Clear cached ATT status (useful for debugging)
 */
export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEY, STORAGE_TIMESTAMP_KEY]);
  } catch (error) {
    console.warn('[ATT] Failed to clear cache:', error);
  }
}
