/**
 * Analytics Types (Shared between mobile/web)
 * Synced with backend-vercel/lib/analytics/events.ts
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
  user_logged_out: {};
  password_reset_requested: {
    email: string; // hashed
  };
  password_reset_succeeded: {};
  email_verified: {};
  
  // Onboarding
  onboarding_started: {};
  onboarding_step_completed: {
    step_number: number;
    step_name: string;
  };
  onboarding_completed: {};
  onboarding_skipped: {};
  
  // Contacts
  contact_created: {
    source: 'manual' | 'import' | 'screenshot' | 'voice_note';
    has_email: boolean;
    has_phone: boolean;
    has_tags: boolean;
  };
  contact_updated: {};
  contact_deleted: {};
  contact_imported: { count: number };
  contact_viewed: { contact_id: string };
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
  interaction_updated: {};
  interaction_deleted: {};
  
  // Messages
  message_drafted: { channel: string };
  message_sent: {
    channel: 'email' | 'sms' | 'dm';
    character_count: number;
    was_ai_generated: boolean;
    goal?: string;
  };
  message_scheduled: {};
  message_template_used: {};
  
  // Warmth
  warmth_score_viewed: {
    score: number;
    band: 'hot' | 'warm' | 'cooling' | 'cold';
  };
  warmth_recomputed: {};
  warmth_alert_triggered: {};
  
  // AI
  ai_message_generated: {
    channel: 'email' | 'sms' | 'dm';
    goal?: string;
    tone?: string;
    generation_time_ms: number;
  };
  ai_message_edited: {};
  ai_message_accepted: {};
  ai_message_rejected: {};
  ai_contact_analyzed: {
    analysis_type: 'health' | 'suggestions' | 'full';
    analysis_time_ms: number;
  };
  ai_suggestion_viewed: {};
  ai_suggestion_accepted: {};
  
  // Screenshots
  screenshot_uploaded: {
    file_size_bytes: number;
    width: number;
    height: number;
    source: 'camera' | 'gallery';
  };
  screenshot_ocr_started: {};
  screenshot_ocr_completed: {
    text_length: number;
    processing_time_ms: number;
    confidence_score?: number;
  };
  screenshot_analyzed: {};
  screenshot_deleted: {};
  
  // Voice Notes
  voice_note_recorded: { duration_seconds: number };
  voice_note_transcribed: {};
  voice_note_processed: {};
  
  // Engagement
  cta_clicked: { cta_name: string };
  share_clicked: {};
  notification_opt_in: {};
  notification_opt_out: {};
  notification_sent: {};
  notification_clicked: {};
  
  // Monetization
  plan_viewed: {};
  plan_selected: {
    plan: 'free' | 'pro' | 'team';
    billing_period: 'monthly' | 'yearly';
    price: number;
  };
  checkout_started: {};
  checkout_completed: {
    plan: string;
    amount: number;
    currency: string;
  };
  checkout_failed: {};
  subscription_upgraded: {};
  subscription_downgraded: {};
  subscription_cancelled: {};
  
  // Lifecycle
  app_opened: {};
  app_backgrounded: {};
  app_foregrounded: {};
  session_started: {};
  session_ended: {};
  app_crashed: {};
  
  // Performance
  api_call_started: { endpoint: string };
  api_call_completed: {
    endpoint: string;
    method: string;
    status_code: number;
    duration_ms: number;
  };
  api_call_failed: { endpoint: string };
  slow_api_call: {
    endpoint: string;
    duration_ms: number;
    threshold_ms: number;
  };
  screen_rendered: {
    screen_name: string;
    render_time_ms: number;
  };
  slow_screen_render: {};
  
  // Feature Flags
  feature_discovered: {};
  feature_used: {};
  feature_flag_evaluated: {
    flag_key: string;
    is_enabled: boolean;
    variant?: string;
  };
  experiment_viewed: {};
  
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
