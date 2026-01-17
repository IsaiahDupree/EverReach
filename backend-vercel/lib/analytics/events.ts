/**
 * Analytics Event Definitions
 * Type-safe event tracking for PostHog
 */

// Event names (exhaustive list)
export type AnalyticsEvent =
  // Auth & Identity
  | 'user_signed_up'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'password_reset_requested'
  | 'password_reset_succeeded'
  | 'email_verified'
  
  // Onboarding
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  
  // Contacts
  | 'contact_created'
  | 'contact_updated'
  | 'contact_deleted'
  | 'contact_imported'
  | 'contact_viewed'
  | 'contacts_searched'
  
  // Interactions
  | 'interaction_logged'
  | 'interaction_updated'
  | 'interaction_deleted'
  
  // Messages
  | 'message_drafted'
  | 'message_sent'
  | 'message_scheduled'
  | 'message_template_used'
  
  // Warmth
  | 'warmth_score_viewed'
  | 'warmth_recomputed'
  | 'warmth_alert_triggered'
  
  // AI Features
  | 'ai_message_generated'
  | 'ai_message_edited'
  | 'ai_message_accepted'
  | 'ai_message_rejected'
  | 'ai_contact_analyzed'
  | 'ai_suggestion_viewed'
  | 'ai_suggestion_accepted'
  
  // Screenshots
  | 'screenshot_uploaded'
  | 'screenshot_ocr_started'
  | 'screenshot_ocr_completed'
  | 'screenshot_analyzed'
  | 'screenshot_deleted'
  
  // Voice Notes
  | 'voice_note_recorded'
  | 'voice_note_transcribed'
  | 'voice_note_processed'
  
  // Engagement
  | 'cta_clicked'
  | 'share_clicked'
  | 'notification_opt_in'
  | 'notification_opt_out'
  | 'notification_sent'
  | 'notification_clicked'
  
  // Monetization
  | 'plan_viewed'
  | 'plan_selected'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_failed'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_cancelled'
  
  // Lifecycle
  | 'app_opened'
  | 'app_backgrounded'
  | 'app_foregrounded'
  | 'session_started'
  | 'session_ended'
  | 'app_crashed'
  
  // Performance
  | 'api_call_started'
  | 'api_call_completed'
  | 'api_call_failed'
  | 'slow_api_call'
  | 'screen_rendered'
  | 'slow_screen_render'
  
  // Feature Discovery
  | 'feature_discovered'
  | 'feature_used'
  | 'feature_flag_evaluated'
  | 'experiment_viewed';

// Event properties by event type
export interface EventProperties {
  // Auth
  user_signed_up: {
    method: 'email' | 'google' | 'apple';
    source?: string;
    referrer?: string;
  };
  user_logged_in: {
    method: 'email' | 'google' | 'apple' | 'biometric';
  };
  password_reset_requested: {
    email: string; // hashed
  };
  
  // Onboarding
  onboarding_step_completed: {
    step_number: number;
    step_name: string;
  };
  
  // Contacts
  contact_created: {
    source: 'manual' | 'import' | 'screenshot' | 'voice_note';
    has_email: boolean;
    has_phone: boolean;
    has_tags: boolean;
  };
  contacts_searched: {
    query_length: number;
    results_count: number;
  };
  
  // Interactions
  interaction_logged: {
    channel: 'email' | 'sms' | 'call' | 'meeting' | 'dm' | 'other';
    direction: 'inbound' | 'outbound';
    has_notes: boolean;
  };
  
  // Messages
  message_sent: {
    channel: 'email' | 'sms' | 'dm';
    character_count: number;
    was_ai_generated: boolean;
    goal?: string;
  };
  
  // Warmth
  warmth_score_viewed: {
    score: number;
    band: 'hot' | 'warm' | 'cooling' | 'cold';
  };
  
  // AI
  ai_message_generated: {
    channel: 'email' | 'sms' | 'dm';
    goal?: string;
    tone?: string;
    generation_time_ms: number;
  };
  ai_contact_analyzed: {
    analysis_type: 'health' | 'suggestions' | 'full';
    analysis_time_ms: number;
  };
  
  // Screenshots
  screenshot_uploaded: {
    file_size_bytes: number;
    width: number;
    height: number;
    source: 'camera' | 'gallery';
  };
  screenshot_ocr_completed: {
    text_length: number;
    processing_time_ms: number;
    confidence_score?: number;
  };
  
  // Monetization
  plan_selected: {
    plan: 'free' | 'pro' | 'team';
    billing_period: 'monthly' | 'yearly';
    price: number;
  };
  checkout_completed: {
    plan: string;
    amount: number;
    currency: string;
  };
  
  // Performance
  api_call_completed: {
    endpoint: string;
    method: string;
    status_code: number;
    duration_ms: number;
  };
  slow_api_call: {
    endpoint: string;
    duration_ms: number;
    threshold_ms: number;
  };
  screen_rendered: {
    screen_name: string;
    render_time_ms: number;
  };
  
  // Feature Flags
  feature_flag_evaluated: {
    flag_key: string;
    is_enabled: boolean;
    variant?: string;
  };
  
  // Generic fallback
  [key: string]: Record<string, any>;
}

// Common context properties (added to all events)
export interface EventContext {
  // App info
  app_version?: string;
  build_number?: string;
  platform: 'web' | 'ios' | 'android';
  
  // Device info
  device_type?: 'mobile' | 'tablet' | 'desktop';
  os_name?: string;
  os_version?: string;
  device_model?: string;
  
  // User info
  user_id?: string;
  anonymous_id?: string;
  account_age_days?: number;
  plan_tier?: 'free' | 'pro' | 'team';
  
  // Session info
  session_id?: string;
  
  // Location/locale
  timezone?: string;
  locale?: string;
  country?: string;
  
  // Campaign attribution
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  referrer?: string;
  
  // Feature flags
  active_experiments?: string[];
  
  // Network
  network_type?: 'wifi' | 'cellular' | 'unknown';
  is_online?: boolean;
}

// Critical events to mirror to Supabase
export const CRITICAL_EVENTS: AnalyticsEvent[] = [
  'user_signed_up',
  'user_logged_in',
  'contact_created',
  'interaction_logged',
  'message_sent',
  'ai_message_generated',
  'screenshot_analyzed',
  'checkout_completed',
  'subscription_upgraded',
  'subscription_cancelled',
];

// Performance threshold events
export const PERFORMANCE_THRESHOLDS = {
  slow_api_call: 2000, // ms
  slow_screen_render: 1000, // ms
};

// Helper to check if event is critical
export function isCriticalEvent(event: AnalyticsEvent): boolean {
  return CRITICAL_EVENTS.includes(event);
}

// Helper to get event category
export function getEventCategory(event: AnalyticsEvent): string {
  if (event.startsWith('user_') || event.includes('auth')) return 'auth';
  if (event.startsWith('onboarding_')) return 'onboarding';
  if (event.startsWith('contact_')) return 'contacts';
  if (event.startsWith('interaction_')) return 'interactions';
  if (event.startsWith('message_')) return 'messages';
  if (event.startsWith('warmth_')) return 'warmth';
  if (event.startsWith('ai_')) return 'ai';
  if (event.startsWith('screenshot_')) return 'screenshots';
  if (event.startsWith('voice_')) return 'voice_notes';
  if (event.includes('notification')) return 'engagement';
  if (event.includes('plan') || event.includes('checkout') || event.includes('subscription')) return 'monetization';
  if (event.startsWith('app_') || event.includes('session')) return 'lifecycle';
  if (event.includes('api_') || event.includes('screen_')) return 'performance';
  if (event.includes('feature') || event.includes('experiment')) return 'feature_discovery';
  return 'other';
}

// Validate event properties
export function validateEventProperties<T extends AnalyticsEvent>(
  event: T,
  properties: any
): properties is EventProperties[T] {
  // Basic validation - can be expanded
  if (!properties || typeof properties !== 'object') {
    return false;
  }
  
  // Event-specific validation
  switch (event) {
    case 'user_signed_up':
    case 'user_logged_in':
      return typeof properties.method === 'string';
    
    case 'contact_created':
      return typeof properties.source === 'string';
    
    case 'interaction_logged':
      return typeof properties.channel === 'string' && typeof properties.direction === 'string';
    
    case 'message_sent':
      return typeof properties.channel === 'string';
    
    default:
      return true; // Allow unknown events for now
  }
}
