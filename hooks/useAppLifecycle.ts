/**
 * App Lifecycle Tracking Hook
 * 
 * Tracks core app lifecycle events:
 * - app_open (cold/warm starts)
 * - session_start
 * - foregrounded
 * - backgrounded
 * - cold_start_measured
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import analytics from '@/lib/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { envelopeManager } from '@/lib/eventEnvelope';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEYS = {
  SESSION_ID: '@session_id',
  LAST_ACTIVE: '@last_active_time',
  APP_INSTALL_TIME: '@app_install_time',
};

interface SessionData {
  sessionId: string;
  lastActiveTime: number;
}

export function useAppLifecycle() {
  const appState = useRef(AppState.currentState);
  const coldStartTime = useRef(Date.now());
  const sessionData = useRef<SessionData | null>(null);
  const hasTrackedColdStart = useRef(false);

  // Generate unique session ID
  const generateSessionId = (): string => {
    return `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get or create session
  const getSession = async (): Promise<SessionData> => {
    try {
      const storedSessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
      const storedLastActive = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
      
      const now = Date.now();
      const lastActive = storedLastActive ? parseInt(storedLastActive, 10) : 0;
      const timeSinceLastActive = now - lastActive;

      // Check if session expired (30 min timeout)
      if (storedSessionId && timeSinceLastActive < SESSION_TIMEOUT_MS) {
        // Continue existing session
        // Sync with envelope manager
        envelopeManager.setSessionId(storedSessionId);
        return {
          sessionId: storedSessionId,
          lastActiveTime: lastActive,
        };
      } else {
        // Create new session
        const newSessionId = generateSessionId();
        await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, newSessionId);
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());
        
        // Sync with envelope manager
        envelopeManager.setSessionId(newSessionId);
        
        return {
          sessionId: newSessionId,
          lastActiveTime: now,
        };
      }
    } catch (error) {
      console.error('[useAppLifecycle] Error managing session:', error);
      // Fallback to in-memory session
      const fallbackId = generateSessionId();
      envelopeManager.setSessionId(fallbackId);
      return {
        sessionId: fallbackId,
        lastActiveTime: Date.now(),
      };
    }
  };

  // Update last active time
  const updateLastActive = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
    } catch (error) {
      console.error('[useAppLifecycle] Error updating last active:', error);
    }
  };

  // Track cold start performance
  const trackColdStart = async () => {
    if (hasTrackedColdStart.current) return;
    
    const coldStartDuration = Date.now() - coldStartTime.current;
    
    analytics.perf.measured('cold_start', {
      duration_ms: coldStartDuration,
      launch_type: 'cold',
    });
    
    hasTrackedColdStart.current = true;
  };

  // Track app open
  const trackAppOpen = async (launchType: 'cold' | 'warm') => {
    const session = await getSession();
    sessionData.current = session;

    analytics.lifecycle.appOpened({
      launch_type: launchType,
      session_id: session.sessionId,
    });

    // Track session start for new sessions
    const now = Date.now();
    const timeSinceLastActive = now - session.lastActiveTime;
    
    if (timeSinceLastActive >= SESSION_TIMEOUT_MS || launchType === 'cold') {
      analytics.lifecycle.sessionStarted({
        reason: launchType === 'cold' ? 'launch' : 'resume',
        session_id: session.sessionId,
      });
    }

    await updateLastActive();
  };

  // Initialize on mount
  useEffect(() => {
    let isInitialized = false;

    const initialize = async () => {
      if (isInitialized) return;
      isInitialized = true;

      // Check if this is first install
      try {
        const installTime = await AsyncStorage.getItem(STORAGE_KEYS.APP_INSTALL_TIME);
        if (!installTime) {
          await AsyncStorage.setItem(STORAGE_KEYS.APP_INSTALL_TIME, Date.now().toString());
        }
      } catch (error) {
        console.error('[useAppLifecycle] Error checking install time:', error);
      }

      // Track initial app open (cold start)
      await trackAppOpen('cold');
      
      // Measure cold start after a short delay to allow UI to render
      setTimeout(() => {
        trackColdStart();
      }, 100);
    };

    initialize();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      appState.current = nextAppState;

      if (nextAppState === 'active') {
        // App came to foreground
        if (previousState === 'background' || previousState === 'inactive') {
          analytics.lifecycle.foregrounded({
            prev_state: previousState,
            session_id: sessionData.current?.sessionId || 'unknown',
          });

          // Check if we need to start a new session
          await trackAppOpen('warm');
        }
      } else if (nextAppState === 'background') {
        // App went to background
        analytics.lifecycle.backgrounded({
          session_id: sessionData.current?.sessionId || 'unknown',
        });
        
        await updateLastActive();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Return session ID for other components to use
  return {
    sessionId: sessionData.current?.sessionId || null,
  };
}
