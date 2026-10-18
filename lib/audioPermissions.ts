/**
 * Audio Permissions Helper
 * Manages microphone permission state and preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

const PERMISSION_PREFERENCE_KEY = '@audio_permission_preference';
const PERMISSION_ASKED_KEY = '@audio_permission_asked';

export type AudioPermissionPreference = 'granted' | 'denied' | 'not-asked';

interface PermissionState {
  preference: AudioPermissionPreference;
  hasBeenAsked: boolean;
  timestamp: number;
}

/**
 * Get stored permission preference
 */
export async function getAudioPermissionPreference(): Promise<PermissionState> {
  try {
    const preference = await AsyncStorage.getItem(PERMISSION_PREFERENCE_KEY);
    const hasBeenAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
    
    return {
      preference: (preference as AudioPermissionPreference) || 'not-asked',
      hasBeenAsked: hasBeenAsked === 'true',
      timestamp: preference ? parseInt(await AsyncStorage.getItem(`${PERMISSION_PREFERENCE_KEY}_timestamp`) || '0') : 0,
    };
  } catch (error) {
    console.error('[AudioPermissions] Failed to get preference:', error);
    return {
      preference: 'not-asked',
      hasBeenAsked: false,
      timestamp: 0,
    };
  }
}

/**
 * Save permission preference
 */
export async function saveAudioPermissionPreference(preference: AudioPermissionPreference): Promise<void> {
  try {
    await AsyncStorage.setItem(PERMISSION_PREFERENCE_KEY, preference);
    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    await AsyncStorage.setItem(`${PERMISSION_PREFERENCE_KEY}_timestamp`, Date.now().toString());
    console.log('[AudioPermissions] Saved preference:', preference);
  } catch (error) {
    console.error('[AudioPermissions] Failed to save preference:', error);
  }
}

/**
 * Check if we should show permission request
 * Returns false if user previously denied or if we've asked too recently
 */
export async function shouldRequestAudioPermission(): Promise<boolean> {
  const state = await getAudioPermissionPreference();
  
  // Don't ask if user explicitly denied
  if (state.preference === 'denied') {
    return false;
  }
  
  // Always allow if granted or never asked
  return true;
}

/**
 * Request microphone permission with preference tracking
 */
export async function requestAudioPermission(): Promise<{
  granted: boolean;
  preference: AudioPermissionPreference;
}> {
  try {
    if (Platform.OS === 'web') {
      // Web: Use getUserMedia
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
        
        await saveAudioPermissionPreference('granted');
        return { granted: true, preference: 'granted' };
      } catch (error: any) {
        console.log('[AudioPermissions] Web permission denied:', error?.name);
        const preference = error?.name === 'NotAllowedError' ? 'denied' : 'denied';
        await saveAudioPermissionPreference(preference);
        return { granted: false, preference };
      }
    } else {
      // Native: Use expo-av
      const permission = await Audio.requestPermissionsAsync();
      const preference = permission.granted ? 'granted' : 'denied';
      await saveAudioPermissionPreference(preference);
      return { granted: permission.granted, preference };
    }
  } catch (error) {
    console.error('[AudioPermissions] Failed to request permission:', error);
    await saveAudioPermissionPreference('denied');
    return { granted: false, preference: 'denied' };
  }
}

/**
 * Clear permission preferences (for testing or reset)
 */
export async function clearAudioPermissionPreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PERMISSION_PREFERENCE_KEY);
    await AsyncStorage.removeItem(PERMISSION_ASKED_KEY);
    await AsyncStorage.removeItem(`${PERMISSION_PREFERENCE_KEY}_timestamp`);
    console.log('[AudioPermissions] Cleared preferences');
  } catch (error) {
    console.error('[AudioPermissions] Failed to clear preferences:', error);
  }
}
