/**
 * SunTrace - Data Models
 *
 * Core entities: Profile, SunSession, DailyStats, SunSpot, Badge, Tip, SupplementLog, CoachMessage, UVForecast
 * Shared infrastructure: User, Subscription, Entitlement, SubscriptionEvent, ApiResponse, PaginatedResponse
 */

// ============================================
// SUNTRACE: Fitzpatrick Skin Type
// ============================================
export type FitzpatrickSkinType = 1 | 2 | 3 | 4 | 5 | 6;

// ============================================
// SUNTRACE: Profile entity
// ============================================
export interface Profile {
  id: string;
  user_id: string;
  skin_type: FitzpatrickSkinType;
  age?: number;
  daily_d_target_iu: number;
  streak_count: number;
  last_session_date?: string;
  notifications_enabled: boolean;
  healthkit_enabled: boolean;
  location_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileInput {
  skin_type: FitzpatrickSkinType;
  age?: number;
  daily_d_target_iu?: number;
  notifications_enabled?: boolean;
  healthkit_enabled?: boolean;
  location_enabled?: boolean;
}

export interface UpdateProfileInput {
  skin_type?: FitzpatrickSkinType;
  age?: number;
  daily_d_target_iu?: number;
  notifications_enabled?: boolean;
  healthkit_enabled?: boolean;
  location_enabled?: boolean;
  streak_count?: number;
  last_session_date?: string;
}

// ============================================
// SUNTRACE: SunSession entity
// ============================================
export interface SunSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  uv_index_avg?: number;
  d_earned_iu?: number;
  burn_risk_level?: 'low' | 'moderate' | 'high';
  latitude?: number;
  longitude?: number;
  location_name?: string;
  notes?: string;
  created_at: string;
}

export interface CreateSessionInput {
  started_at: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  uv_index_avg?: number;
  notes?: string;
}

export interface UpdateSessionInput {
  ended_at?: string;
  duration_minutes?: number;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  uv_index_avg?: number;
  d_earned_iu?: number;
  burn_risk_level?: 'low' | 'moderate' | 'high';
  notes?: string;
}

// ============================================
// SUNTRACE: DailyStats entity
// ============================================
export interface DailyStats {
  id: string;
  user_id: string;
  date: string;
  total_d_earned_iu: number;
  total_minutes: number;
  session_count: number;
  goal_achieved: boolean;
  peak_uv_index?: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// SUNTRACE: SunSpot entity
// ============================================
export interface SunSpot {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  spot_type?: string;
  submitted_by?: string;
  is_verified: boolean;
  created_at: string;
}

export interface CreateSpotInput {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  spot_type?: string;
}

// ============================================
// SUNTRACE: Badge + UserBadge entities
// ============================================
export type BadgeCategory = 'streak' | 'vitamin_d' | 'sessions' | 'spots' | 'social' | 'special';
export type BadgeRequirementType = 'streak_days' | 'total_vitamin_d_iu' | 'total_sessions' | 'spots_visited' | 'spots_submitted';

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  requirement_type: BadgeRequirementType;
  requirement_value: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

// ============================================
// SUNTRACE: Tip entity
// ============================================
export type TipCategory = 'safety' | 'nutrition' | 'timing' | 'general' | 'seasonal';

export interface Tip {
  id: string;
  title: string;
  body: string;
  category: TipCategory;
  skin_types?: string[];
  is_pro: boolean;
  created_at: string;
}

// ============================================
// SUNTRACE: SupplementLog entity
// ============================================
export interface SupplementLog {
  id: string;
  user_id: string;
  date: string;
  supplement_type: string;
  dose_iu: number;
  notes?: string;
  created_at: string;
}

// ============================================
// SUNTRACE: CoachMessage entity
// ============================================
export type CoachRole = 'user' | 'assistant';

export interface CoachMessage {
  id: string;
  user_id: string;
  role: CoachRole;
  content: string;
  created_at: string;
}

// ============================================
// SUNTRACE: UV Forecast entities
// ============================================
export interface UVForecast {
  date: string;
  hour: number;
  uv_index: number;
  cloud_cover_pct: number;
  temperature_c: number;
  is_best_window: boolean;
}

export interface DailyForecast {
  date: string;
  max_uv: number;
  avg_uv: number;
  best_window_start?: string;
  best_window_end?: string;
  cloud_cover_pct: number;
  sunrise?: string;
  sunset?: string;
  forecast_hours: UVForecast[];
}

// ============================================
// KEEP: User model (works with Supabase Auth)
// ============================================
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'core' | 'pro' | 'team';
  subscription_status: 'trial' | 'active' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
  created_at: string;
}

// ============================================
// KEEP: Subscription model
// ============================================
export interface Subscription {
  id: string;
  user_id: string;
  product_id?: string;
  store: 'app_store' | 'play' | 'stripe';
  store_account_id?: string;
  status: 'trial' | 'active' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
  started_at?: string;
  current_period_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  updated_at: string;
}

// ============================================
// KEEP: Entitlements model (derived from subscriptions)
// ============================================
export interface Entitlement {
  user_id: string;
  plan: 'free' | 'core' | 'pro' | 'team';
  valid_until?: string;
  source: 'app_store' | 'play' | 'stripe' | 'manual' | 'revenuecat';
  subscription_id?: string;
  updated_at: string;
}

// ============================================
// KEEP: Subscription events audit log
// ============================================
export interface SubscriptionEvent {
  id: string;
  user_id?: string;
  event_type: string;
  product_id?: string;
  store?: 'app_store' | 'play' | 'stripe';
  environment?: string;
  period_type?: string;
  plan?: string;
  status?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  revenue?: number;
  currency?: string;
  entitlement_ids?: string[];
  is_trial_conversion?: boolean;
  occurred_at?: string;
  created_at: string;
}

// ============================================
// KEEP: API Response types
// ============================================
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
