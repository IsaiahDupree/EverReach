/**
 * Backend Analytics Tracking
 * 
 * Sends events to backend /api/v1/events/track endpoint
 * This runs in PARALLEL with PostHog tracking for dual analytics.
 * 
 * Backend events are stored in Supabase app_events table and enable:
 * - Product analytics (joins with CRM data)
 * - Conversion funnel analysis
 * - Custom dashboard queries
 * - Long-term trend analysis
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ever-reach-be.vercel.app';

// Session management
let sessionId: string | null = null;

// Log module initialization
if (__DEV__) {
  console.log('🚀 [Backend Analytics] Module loaded, BACKEND_URL:', BACKEND_URL);
}

/**
 * Generate a unique session ID for this app session
 * Call this once on app startup
 */
export function generateSessionId(): string {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  if (__DEV__) {
    console.log('[Backend Analytics] Session ID generated:', sessionId);
  }
  return sessionId;
}

/**
 * Get the current session ID
 */
export function getSessionId(): string | null {
  return sessionId;
}

/**
 * Send event to backend /api/v1/events/track
 * 
 * This function:
 * - Gets auth token from Supabase
 * - Sends event to backend API
 * - Fails silently (doesn't break app)
 * - Logs success/failure in dev mode
 * 
 * Events are stored in Supabase app_events table
 */
export async function trackEventToBackend(
  eventType: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (__DEV__) {
        console.log('[Backend Analytics] No user authenticated, skipping event:', eventType);
      }
      return;
    }
    
    // Get session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      if (__DEV__) {
        console.log('[Backend Analytics] No session token, skipping event:', eventType);
      }
      return;
    }
    
    // Prepare event payload
    const payload = {
      event_type: convertToSnakeCase(eventType),
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        session_id: sessionId,
        platform: Platform.OS,
        app_version: Constants.manifest?.version || Constants.expoConfig?.version || '1.0.0',
      }
    };
    
    if (__DEV__) {
      console.log('[Backend Analytics] Sending event:', payload.event_type);
    }
    
    // Send to backend
    const response = await fetch(`${BACKEND_URL}/api/v1/events/track`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'X-Platform': Platform.OS,
        'X-App-Version': Constants.manifest?.version || Constants.expoConfig?.version || '1.0.0',
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      if (__DEV__) {
        console.log(`✅ [Backend Analytics] Event tracked: ${payload.event_type}`);
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ [Backend Analytics] Failed to track ${payload.event_type}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
    }
  } catch (error) {
    // Silent fail in production, log in development
    if (__DEV__) {
      console.error('[Backend Analytics] Error tracking event:', {
        eventType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

/**
 * Convert PostHog-style "Title Case" event names to "snake_case" for backend
 * 
 * Examples:
 * - "Onboarding Started" → "onboarding_started"
 * - "Paywall CTA Clicked" → "paywall_cta_clicked"
 * - "Message Generated" → "message_generated"
 */
function convertToSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_/, '');
}

/**
 * Batch track multiple events (useful for offline queue)
 * Not implemented yet, but ready for future use
 */
export async function trackEventsBatch(
  events: Array<{ eventType: string; metadata?: Record<string, any> }>
): Promise<void> {
  // TODO: Implement batch endpoint when ready
  // For now, track individually
  for (const event of events) {
    await trackEventToBackend(event.eventType, event.metadata);
  }
}

/**
 * Test function to verify backend connection
 * Call this in development to ensure events are flowing
 */
export async function testBackendTracking(): Promise<boolean> {
  try {
    await trackEventToBackend('Test Event', {
      test: true,
      timestamp: Date.now()
    });
    return true;
  } catch (error) {
    console.error('[Backend Analytics] Test failed:', error);
    return false;
  }
}
