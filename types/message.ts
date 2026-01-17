export type Channel = 'sms' | 'email' | 'dm';
export type MessageStatus = 'draft' | 'copied' | 'sent_inferred' | 'sent_confirmed';
export type ToneStyle = 'casual' | 'professional' | 'warm' | 'direct';

export interface MessageGoal {
  id: string;
  name: string;
  template: string;
  defaultChannels: Channel[];
  styleTags: string[];
  isCustom?: boolean;
  // Database fields
  default_channels?: Channel[];
  style_tags?: string[];
  created_at?: string;
  updated_at?: string;
  org_id?: string;
  user_id?: string;
}

export interface GeneratedVariant {
  text: string;
  subject?: string;
  edited: boolean;
  // Database fields
  id?: string;
  message_id?: string;
  variant_index?: number;
  created_at?: string;
}

export interface GeneratedMessage {
  id: string;
  contactId: string;
  goalId: string;
  contextSnapshot: Record<string, any>;
  variants: GeneratedVariant[];
  chosenIndex?: number;
  channelSelected?: Channel;
  status: MessageStatus;
  createdAt: number;
  updatedAt: number;
  // Database fields
  person_id?: string;
  goal_id?: string;
  channel_selected?: Channel;
  context_snapshot?: Record<string, any>;
  chosen_index?: number;
  created_at?: string;
  updated_at?: string;
  org_id?: string;
  user_id?: string;
}

export interface MessageContext {
  personId?: string;
  goal_name: string;
  user_bio?: string;
  brand_voice?: string;
  voiceContext?: string;
  contact_first: string;
  contact_last?: string;
  contact_role?: string;
  company?: string;
  recent_notes?: string;
  shared_interests?: string;
  tone: ToneStyle;
  length: 'short' | 'medium' | 'long';
  channel: Channel;
}

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
  timestamp: number;
}

export interface Person {
  id: string;
  full_name: string;
  title?: string;
  company?: string;
  warmth: number;
  warmth_mode?: 'slow' | 'medium' | 'fast' | 'test';
  interests: string[];
  goals: string[];
  tags: string[];
  last_interaction?: string;
  last_interaction_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface DefaultGoal {
  name: string;
  template: string;
  defaultChannels: Channel[];
  styleTags: string[];
}

// AI Texting Concierge Types
export type Platform = 'imessage' | 'sms' | 'whatsapp' | 'telegram' | 'discord';
export type ConsentStatus = 'pending' | 'granted' | 'revoked';
export type OnboardingStage = 'phone' | 'profile' | 'interests' | 'complete';
export type IntroStatus = 'pending' | 'both_accepted' | 'declined' | 'expired';
export type RelayJobStatus = 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type HealthStatus = 'healthy' | 'degraded' | 'down';
export type FeedbackEvent = 'intro_received' | 'intro_accepted' | 'intro_declined' | 'met_irl' | 'positive' | 'negative';

export interface UserProfile {
  id: string;
  userId: string;
  phoneE164: string;
  platformPref: Platform;
  consentStatus: ConsentStatus;
  onboardingStage: OnboardingStage;
  timezone?: string;
  bio?: string;
  interests: string[];
  location?: {
    city?: string;
    region?: string;
    country?: string;
    lat?: number;
    lon?: number;
  };
  photoUrl?: string;
  embedding?: number[]; // Vector embedding for matching
  matchPreferences: {
    frequency: 'daily' | 'weekly' | 'monthly';
    maxPerWeek: number;
  };
  createdAt: string;
  updatedAt: string;
  // Database fields
  user_id?: string;
  phone_e164?: string;
  platform_pref?: Platform;
  consent_status?: ConsentStatus;
  onboarding_stage?: OnboardingStage;
  photo_url?: string;
  match_preferences?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    max_per_week: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ExternalContact {
  id: string;
  userId: string;
  externalId: string;
  channel: Platform;
  handle: string; // phone number, username, etc.
  displayName?: string;
  lastSeenAt?: string;
  trustScore: number; // 0-1
  createdAt: string;
  // Database fields
  user_id?: string;
  external_id?: string;
  display_name?: string;
  last_seen_at?: string;
  trust_score?: number;
  created_at?: string;
}

export interface MessageThread {
  id: string;
  channel: Platform;
  threadId: string; // platform-specific thread ID
  participants: string[]; // phone numbers or handles
  isGroup: boolean;
  lastMessageAt?: string;
  createdAt: string;
  // Database fields
  thread_id?: string;
  is_group?: boolean;
  last_message_at?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  threadId: string;
  direction: 'inbound' | 'outbound';
  senderHandle: string;
  body: string;
  meta: Record<string, any>; // platform-specific metadata
  dedupeHash?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  // Database fields
  thread_id?: string;
  sender_handle?: string;
  dedupe_hash?: string;
  delivered_at?: string;
  read_at?: string;
  created_at?: string;
}

export interface Introduction {
  id: string;
  requesterId: string;
  targetAId: string;
  targetBId: string;
  threadId?: string;
  status: IntroStatus;
  introMessage?: string;
  matchScore?: number; // 0-1
  matchReasoning?: string;
  aResponse?: string;
  bResponse?: string;
  aRespondedAt?: string;
  bRespondedAt?: string;
  expiresAt: string;
  lastNudgeAt?: string;
  createdAt: string;
  // Database fields
  requester_id?: string;
  target_a_id?: string;
  target_b_id?: string;
  thread_id?: string;
  intro_message?: string;
  match_score?: number;
  match_reasoning?: string;
  a_response?: string;
  b_response?: string;
  a_responded_at?: string;
  b_responded_at?: string;
  expires_at?: string;
  last_nudge_at?: string;
  created_at?: string;
}

export interface MatchFeedback {
  id: string;
  userId: string;
  introId: string;
  event: FeedbackEvent;
  value?: string; // thumbs up/down, rating, etc.
  meta: Record<string, any>;
  createdAt: string;
  // Database fields
  user_id?: string;
  intro_id?: string;
  created_at?: string;
}

export interface RelayJob {
  id: string;
  channel: Platform;
  recipientHandle: string;
  messageBody: string;
  priority: number; // 1-10
  status: RelayJobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledFor: string;
  errorMessage?: string;
  providerResponse?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Database fields
  recipient_handle?: string;
  message_body?: string;
  max_attempts?: number;
  scheduled_for?: string;
  error_message?: string;
  provider_response?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface PlatformConnector {
  id: string;
  channel: Platform;
  config: Record<string, any>; // API keys, webhook URLs, etc.
  enabled: boolean;
  healthStatus: HealthStatus;
  lastHealthCheck?: string;
  rateLimits: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Database fields
  health_status?: HealthStatus;
  last_health_check?: string;
  rate_limits?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Matching and AI types
export interface MatchCandidate {
  userId: string;
  profile: UserProfile;
  score: number;
  reasoning: string;
  sharedInterests: string[];
  locationDistance?: number;
}

export interface IntroRequest {
  targetAId: string;
  targetBId: string;
  customMessage?: string;
  context?: Record<string, any>;
}

export interface OnboardingFlow {
  phone: string;
  profile: {
    bio: string;
    interests: string[];
    location?: {
      city: string;
      region?: string;
      country: string;
    };
    timezone?: string;
  };
  preferences: {
    frequency: 'daily' | 'weekly' | 'monthly';
    maxPerWeek: number;
    platformPref: Platform;
  };
  photoUrl?: string;
}