import posthog from 'posthog-js'

/**
 * Track a custom event
 * @param eventName - Name of the event
 * @param properties - Optional event properties
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, properties)
  }
}

/**
 * Identify a user in PostHog
 * @param userId - Unique user identifier
 * @param properties - Optional user properties
 */
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    posthog.identify(userId, properties)
  }
}

/**
 * Reset user identity (logout)
 */
export function resetUser() {
  if (typeof window !== 'undefined') {
    posthog.reset()
  }
}

/**
 * Set user properties without identifying
 * @param properties - User properties to set
 */
export function setUserProperties(properties: Record<string, any>) {
  if (typeof window !== 'undefined') {
    posthog.setPersonProperties(properties)
  }
}

/**
 * Get PostHog instance for advanced usage
 */
export function getPostHog() {
  return typeof window !== 'undefined' ? posthog : null
}

// Common event names for consistency
export const EVENTS = {
  // Auth events
  LOGIN: 'user_logged_in',
  LOGOUT: 'user_logged_out',
  SIGNUP: 'user_signed_up',
  
  // Contact events
  CONTACT_VIEWED: 'contact_viewed',
  CONTACT_CREATED: 'contact_created',
  CONTACT_UPDATED: 'contact_updated',
  CONTACT_DELETED: 'contact_deleted',
  
  // Interaction events
  INTERACTION_LOGGED: 'interaction_logged',
  MESSAGE_SENT: 'message_sent',
  
  // Voice notes
  VOICE_NOTE_UPLOADED: 'voice_note_uploaded',
  VOICE_NOTE_TRANSCRIBED: 'voice_note_transcribed',
  
  // Alerts
  ALERT_VIEWED: 'alert_viewed',
  ALERT_ACTIONED: 'alert_actioned',
  
  // AI features
  AI_CHAT_MESSAGE: 'ai_chat_message',
  AI_MESSAGE_COMPOSED: 'ai_message_composed',
  AI_CONTACT_ANALYZED: 'ai_contact_analyzed',
  
  // Settings
  SETTINGS_UPDATED: 'settings_updated',
  
  // Navigation
  PAGE_VIEW: '$pageview',
  LINK_CLICKED: 'link_clicked',
} as const
