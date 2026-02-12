/**
 * Cross-Functional Analytics Utility
 * 
 * Unified tracking interface that sends events to:
 * - Backend analytics API (/api/v1/events/track)
 * - PostHog (if configured)
 * 
 * Usage:
 * ```typescript
 * import { track, identify, screen } from '@/lib/analytics';
 * 
 * // Track an event
 * track('contact_created', { source: 'manual' });
 * 
 * // Track screen view
 * screen('ContactDetail', { contact_id: '123' });
 * 
 * // Identify user
 * identify(userId, { plan: 'pro' });
 * ```
 */

import { Platform } from 'react-native';
import { AnalyticsRepo } from '@/repos/AnalyticsRepo';
import * as PostHog from './posthog';
import { 
  wrapEvent, 
  envelopeManager,
  setUTMParams as setUTMParameters,
  assignExperiment as assignUserToExperiment,
  setConsent as setUserConsent,
} from './eventEnvelope';
import { addDebugEvent } from '@/lib/debugEvents';
import { autoTrackToMeta } from '@/lib/metaAppEvents';

// ============================================================================
// Event Constants
// ============================================================================

export const EVENTS = {
  // Authentication
  AUTH_SIGN_IN: 'auth_sign_in',
  AUTH_SIGN_OUT: 'auth_sign_out',
  AUTH_SIGN_UP: 'auth_sign_up',
  
  // Contacts
  CONTACT_CREATED: 'contact_created',
  CONTACT_UPDATED: 'contact_updated',
  CONTACT_DELETED: 'contact_deleted',
  CONTACT_VIEWED: 'contact_viewed',
  CONTACT_SEARCHED: 'contact_searched',
  
  // Interactions
  INTERACTION_CREATED: 'interaction_created',
  NOTE_ADDED: 'note_added',
  VOICE_NOTE_CREATED: 'voice_note_created',
  SCREENSHOT_ANALYZED: 'screenshot_analyzed',
  
  // Messaging
  MESSAGE_PREPARED: 'message_prepared',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_FAILED: 'message_failed',
  
  // Warmth
  WARMTH_RECOMPUTED: 'warmth_recomputed',
  WARMTH_ALERT_TRIGGERED: 'warmth_alert_triggered',
  
  // Pipeline
  PIPELINE_STAGE_CHANGED: 'pipeline_stage_changed',
  PIPELINE_CREATED: 'pipeline_created',
  
  // AI
  AI_GOAL_GENERATED: 'ai_goal_generated',
  AI_MESSAGE_GENERATED: 'ai_message_generated',
  AI_CHAT_STARTED: 'ai_chat_started',
  AI_CONTEXT_BUNDLE_FETCHED: 'ai_context_bundle_fetched',
  
  // Subscription
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  TRIAL_STARTED: 'trial_started',
  
  // Navigation
  SCREEN_VIEWED: 'screen_viewed',
  TAB_CHANGED: 'tab_changed',
  
  // Features
  FEATURE_USED: 'feature_used',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  
  // Errors
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  
  // Performance
  PERFORMANCE_MEASURED: 'performance_measured',
  
  // Lifecycle
  APP_OPEN: 'app_open',
  SESSION_START: 'session_start',
  FOREGROUNDED: 'foregrounded',
  BACKGROUNDED: 'backgrounded',
  COLD_START_MEASURED: 'cold_start_measured',
  
  // Marketing Funnel
  AD_IMPRESSION: 'ad_impression',
  AD_CLICK: 'ad_click',
  LANDING_VIEW: 'landing_view',
  LEAD_CAPTURED: 'lead_captured',
  INSTALL_TRACKED: 'install_tracked',
  FIRST_OPEN_POST_INSTALL: 'first_open_post_install',
  ACTIVATION_EVENT: 'activation_event',
  QUALIFIED_SIGNUP: 'qualified_signup',
  
  // Performance Monitoring
  MEMORY_WARNING: 'memory_warning',
  NETWORK_STATE_CHANGED: 'network_state_changed',
  CONNECTION_LOST: 'connection_lost',
  APP_STATE_DURATION: 'app_state_duration',
  PERFORMANCE_BUDGET_EXCEEDED: 'performance_budget_exceeded',
  SLOW_SCREEN_RENDER: 'slow_screen_render',
  SLOW_API_CALL: 'slow_api_call',
  SLOW_OPERATION: 'slow_operation',
  SCREEN_DURATION: 'screen_duration',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS] | string;

// ============================================================================
// Screen Constants
// ============================================================================

export const SCREENS = {
  HOME: 'Home',
  PEOPLE: 'People',
  CHAT: 'Chat',
  SETTINGS: 'Settings',
  CONTACT_DETAIL: 'ContactDetail',
  CONTACT_DETAIL_V2: 'ContactDetailV2',
  ADD_CONTACT: 'AddContact',
  MESSAGE_PICKER: 'MessagePicker',
  MESSAGE_RESULTS: 'MessageResults',
  GOAL_PICKER: 'GoalPicker',
  SUBSCRIPTION_PLANS: 'SubscriptionPlans',
  ALERTS: 'Alerts',
  PERSONAL_NOTES: 'PersonalNotes',
  VOICE_NOTE: 'VoiceNote',
} as const;

export type ScreenName = typeof SCREENS[keyof typeof SCREENS] | string;

// ============================================================================
// Property Interfaces
// ============================================================================

export interface TrackProperties extends Record<string, any> {
  // Common properties
  platform?: string;
  source?: string;
  category?: string;
  label?: string;
  value?: number;
  
  // Screen-related
  screen_name?: string;
  previous_screen?: string;
  
  // Contact-related
  contact_id?: string;
  contact_count?: number;
  
  // User-related
  user_id?: string;
  org_id?: string;
  plan?: string;
  
  // Feature-related
  feature?: string;
  success?: boolean;
  error?: string;
  
  // Performance
  duration_ms?: number;
  load_time_ms?: number;
}

export interface IdentifyProperties {
  email?: string;
  name?: string;
  plan?: 'free' | 'core' | 'pro' | 'enterprise';
  locale?: string;
  platform?: string;
  org_id?: string;
  created_at?: string;
  [key: string]: any;
}

// ----------------------------------------------------------------------------
// Trial AB helper
// ----------------------------------------------------------------------------
export function withTrialProps<T extends Record<string, any>>(props: T, meta?: {
  trial_gate_strategy?: string;
  trial_usage_seconds?: number;
  trial_usage_seconds_limit?: number;
  trial_days_remaining?: number;
  is_paid?: boolean;
}): T & Record<string, any> {
  if (!meta) return props;
  return {
    ...props,
    ...(meta.trial_gate_strategy !== undefined && { trial_gate_strategy: meta.trial_gate_strategy }),
    ...(meta.trial_usage_seconds !== undefined && { trial_usage_seconds: meta.trial_usage_seconds }),
    ...(meta.trial_usage_seconds_limit !== undefined && { trial_usage_seconds_limit: meta.trial_usage_seconds_limit }),
    ...(meta.trial_days_remaining !== undefined && { trial_days_remaining: meta.trial_days_remaining }),
    ...(meta.is_paid !== undefined && { is_paid: meta.is_paid }),
  } as T & Record<string, any>;
}

// ============================================================================
// Core Analytics Functions
// ============================================================================

/**
 * Track an event
 * Sends to both backend API and PostHog
 * Now wrapped with global event envelope (session ID, UTM, experiments)
 */
export async function track(
  event: EventName,
  properties?: TrackProperties,
  userId?: string | null
): Promise<void> {
  try {
    // Wrap event with global envelope
    const envelope = wrapEvent(event, properties, userId);

    // Extract enriched properties for backward compatibility
    const enrichedProps: TrackProperties = {
      ...envelope.properties,
      // Add envelope metadata
      session_id: envelope.session_id,
      anon_id: envelope.anon_id,
      platform: envelope.app.platform,
      app_version: envelope.app.version,
      timestamp: envelope.event_time,
      // UTM params (if present)
      ...(envelope.source.utm_source && { utm_source: envelope.source.utm_source }),
      ...(envelope.source.utm_campaign && { utm_campaign: envelope.source.utm_campaign }),
      ...(envelope.source.utm_medium && { utm_medium: envelope.source.utm_medium }),
      // Experiments (if any)
      ...(Object.keys(envelope.exp).length > 0 && { experiments: envelope.exp }),
    };

    // Send enriched properties to backend analytics
    await AnalyticsRepo.trackEvent({
      event,
      properties: enrichedProps,
    });

    // Send to PostHog
    await PostHog.captureEvent(event, enrichedProps);

    // Send to Meta App Events (Conversions API + native SDK if available)
    autoTrackToMeta(event, enrichedProps);

    // Capture events for E2E assertions and Event Dashboard (dev + test mode)
    if (__DEV__ || process.env.EXPO_PUBLIC_TEST_TELEMETRY === 'true') {
      try {
        addDebugEvent({ event: String(event), ts: new Date().toISOString(), props: enrichedProps });
      } catch {}
    }

    console.log('[Analytics] Event tracked:', event, {
      session: envelope.session_id?.substring(0, 12) + '...',
      hasUtm: !!envelope.source.utm_source,
      experiments: Object.keys(envelope.exp).length,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to track event:', event, error);
  }
}

/**
 * Track screen view
 */
export async function screen(
  screenName: ScreenName,
  properties?: TrackProperties
): Promise<void> {
  try {
    const screenProps: TrackProperties = {
      screen_name: screenName,
      platform: Platform.OS,
      ...properties,
    };

    // Track as screen view event
    await track(EVENTS.SCREEN_VIEWED, screenProps);

    // Also send to PostHog screen tracking
    await PostHog.trackScreen(screenName, screenProps);

    console.log('[Analytics] Screen tracked:', screenName);
  } catch (error) {
    console.warn('[Analytics] Failed to track screen:', screenName, error);
  }
}

/**
 * Identify user
 */
export async function identify(
  userId: string,
  properties?: IdentifyProperties
): Promise<void> {
  try {
    const userProps: IdentifyProperties = {
      platform: Platform.OS,
      ...properties,
    };

    // Send to PostHog
    await PostHog.identifyUser(userId, userProps);

    console.log('[Analytics] User identified:', userId.substring(0, 8) + '...');
  } catch (error) {
    console.warn('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Reset analytics state (on logout)
 */
export async function reset(): Promise<void> {
  try {
    await PostHog.resetPostHog();
    console.log('[Analytics] Reset complete');
  } catch (error) {
    console.warn('[Analytics] Failed to reset:', error);
  }
}

/**
 * Enhanced performance tracking namespace
 */
export const performanceTracking = {
  measured: (metricName: string, props: { duration_ms: number; [key: string]: any }) => 
    track(EVENTS.PERFORMANCE_MEASURED, { metric: metricName, ...props }),
  
  coldStart: (durationMs: number) => 
    track(EVENTS.COLD_START_MEASURED, { duration_ms: durationMs, launch_type: 'cold' }),
  
  slowFrame: (screen: string, frameMs: number) => 
    track('render_slow_frame', { screen, frame_ms: frameMs }),
  
  apiCall: (endpoint: string, durationMs: number, success: boolean) => 
    track('api_call_measured', { 
      endpoint: endpoint.substring(0, 100), 
      duration_ms: durationMs, 
      success 
    }),
};

/**
 * Report performance metrics (legacy - use performanceTracking namespace instead)
 */
export async function performance(metrics: {
  screen: string;
  load_time_ms: number;
  api_calls?: number;
  errors?: string[];
}): Promise<void> {
  try {
    // Send to backend
    await AnalyticsRepo.reportPerformance(metrics);

    // Also track as event
    await track(EVENTS.PERFORMANCE_MEASURED, {
      screen_name: metrics.screen,
      load_time_ms: metrics.load_time_ms,
      api_calls: metrics.api_calls,
      error_count: metrics.errors?.length || 0,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to report performance:', error);
  }
}

/**
 * Enable/disable analytics (respects user consent)
 */
export async function setEnabled(enabled: boolean): Promise<void> {
  try {
    await PostHog.setAnalyticsEnabled(enabled);
    console.log('[Analytics]', enabled ? 'enabled' : 'disabled');
  } catch (error) {
    console.warn('[Analytics] Failed to set enabled state:', error);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Track contact-related events
 */
export const contacts = {
  created: (contactId: string, source?: string) => 
    track(EVENTS.CONTACT_CREATED, { contact_id: contactId, source }),
  
  updated: (contactId: string, fields?: string[]) => 
    track(EVENTS.CONTACT_UPDATED, { contact_id: contactId, fields }),
  
  deleted: (contactId: string) => 
    track(EVENTS.CONTACT_DELETED, { contact_id: contactId }),
  
  viewed: (contactId: string, version?: 'v1' | 'v2') => 
    track(EVENTS.CONTACT_VIEWED, { contact_id: contactId, version }),
  
  searched: (query: string, resultCount: number) => 
    track(EVENTS.CONTACT_SEARCHED, { query: query.substring(0, 50), result_count: resultCount }),
};

/**
 * Track message-related events
 */
export const messages = {
  prepared: (contactId: string, goal: string, draftLength: number) => 
    track(EVENTS.MESSAGE_PREPARED, { 
      contact_id: contactId, 
      goal, 
      draft_length: draftLength 
    }),
  
  sent: (contactId: string, channel: string, success: boolean) => 
    track(EVENTS.MESSAGE_SENT, { 
      contact_id: contactId, 
      channel, 
      success 
    }),
  
  failed: (contactId: string, error: string) => 
    track(EVENTS.MESSAGE_FAILED, { 
      contact_id: contactId, 
      error: error.substring(0, 200) 
    }),
};

/**
 * Track AI-related events
 */
export const ai = {
  goalGenerated: (contactId: string, goal: string, confidence: number) => 
    track(EVENTS.AI_GOAL_GENERATED, { 
      contact_id: contactId, 
      goal, 
      confidence 
    }),
  
  messageGenerated: (contactId: string, goalType: string, tokenCount?: number) => 
    track(EVENTS.AI_MESSAGE_GENERATED, { 
      contact_id: contactId, 
      goal_type: goalType,
      token_count: tokenCount 
    }),
  
  chatStarted: (sessionId?: string) => 
    track(EVENTS.AI_CHAT_STARTED, { session_id: sessionId }),
};

/**
 * Track warmth-related events
 */
export const warmth = {
  recomputed: (contactId: string, oldScore: number, newScore: number) => 
    track(EVENTS.WARMTH_RECOMPUTED, { 
      contact_id: contactId, 
      old_score: oldScore,
      new_score: newScore,
      change: newScore - oldScore
    }),
  
  alertTriggered: (contactId: string, threshold: number, currentScore: number) => 
    track(EVENTS.WARMTH_ALERT_TRIGGERED, { 
      contact_id: contactId, 
      threshold,
      current_score: currentScore
    }),
};

/**
 * Track subscription events
 */
export const subscription = {
  upgraded: (fromPlan: string, toPlan: string, amount?: number) => 
    track(EVENTS.SUBSCRIPTION_UPGRADED, { 
      from_plan: fromPlan, 
      to_plan: toPlan,
      amount 
    }),
  
  trialStarted: (trialDays: number) => 
    track(EVENTS.TRIAL_STARTED, { trial_days: trialDays }),
};

/**
 * Track marketing funnel events
 */
export const marketing = {
  adImpression: (network: string, campaignId: string, creativeId: string, placement?: string) => 
    track(EVENTS.AD_IMPRESSION, { network, campaign_id: campaignId, creative_id: creativeId, placement }),
  
  adClick: (network: string, campaignId: string, creativeId: string, clickId?: string) => 
    track(EVENTS.AD_CLICK, { network, campaign_id: campaignId, creative_id: creativeId, click_id: clickId }),
  
  landingView: (page: string, referrer?: string, variant?: string) => 
    track(EVENTS.LANDING_VIEW, { page, referrer: referrer?.substring(0, 200), variant }),
  
  leadCaptured: (source: string, leadScore?: number) => 
    track(EVENTS.LEAD_CAPTURED, { source, lead_score: leadScore }),
  
  installTracked: (installSource: string, network?: string, campaignId?: string) => 
    track(EVENTS.INSTALL_TRACKED, { install_source: installSource, network, campaign_id: campaignId }),
  
  firstOpen: (installSource: string) => 
    track(EVENTS.FIRST_OPEN_POST_INSTALL, { install_source: installSource }),
  
  activation: (type: string, metadata?: Record<string, any>) => 
    track(EVENTS.ACTIVATION_EVENT, { type, ...metadata }),
  
  qualifiedSignup: (leadScore: number) => 
    track(EVENTS.QUALIFIED_SIGNUP, { lead_score: leadScore }),
};

/**
 * Track lifecycle events
 */
export const lifecycle = {
  appOpened: (props: { launch_type: 'cold' | 'warm'; session_id: string }) => 
    track(EVENTS.APP_OPEN, props),
  
  sessionStarted: (props: { reason: 'launch' | 'resume'; session_id: string }) => 
    track(EVENTS.SESSION_START, props),
  
  foregrounded: (props: { prev_state: string; session_id: string }) => 
    track(EVENTS.FOREGROUNDED, props),
  
  backgrounded: (props: { session_id: string }) => 
    track(EVENTS.BACKGROUNDED, props),
};

/**
 * Track errors
 */
export const errors = {
  occurred: (error: Error, screen?: string, context?: Record<string, any>) => 
    track(EVENTS.ERROR_OCCURRED, { 
      error_message: error.message,
      error_stack: error.stack?.substring(0, 500),
      screen_name: screen,
      ...context
    }),
  
  apiError: (endpoint: string, statusCode: number, error: string) => 
    track(EVENTS.API_ERROR, { 
      endpoint: endpoint.substring(0, 100),
      status_code: statusCode,
      error: error.substring(0, 200)
    }),
};

// ============================================================================
// Export everything
// ============================================================================

export default {
  // Core functions
  track,
  screen,
  identify,
  reset,
  performance,
  setEnabled,
  
  // Constants
  EVENTS,
  SCREENS,
  
  // Convenience namespaces
  contacts,
  messages,
  ai,
  warmth,
  subscription,
  lifecycle,
  marketing,
  perf: performanceTracking,
  errors,
  withTrialProps,
  
  // Event envelope helpers
  setUTMParams: setUTMParameters,
  assignExperiment: assignUserToExperiment,
  setConsent: setUserConsent,
};
