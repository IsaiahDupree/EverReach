/**
 * Paywall Strategy System Types
 * Comprehensive type definitions for the paywall configuration system
 */

// =====================================================
// ENUMS
// =====================================================

export type PaywallMode = 'hard-hard' | 'hard' | 'hard-soft';

export type TriggerType = 'always' | 'time' | 'usage' | 'feature';

export type FreeAccessLevel = 'none' | 'settings_only' | 'contacts_list' | 'read_only';

export type PresentationVariant = 'static' | 'video' | 'appstore' | 'custom';

export type TrialType = 'time' | 'usage' | 'none';

export type Platform = 'mobile' | 'web' | 'all';

export type AccessLevel = 'none' | 'view_only' | 'full';

export type FeatureArea = 
  | 'login_auth'
  | 'onboarding'
  | 'contacts_list'
  | 'contact_detail'
  | 'settings'
  | 'pro_features';

export type ReviewPromptType = 'after_purchase' | 'after_usage';

export type ReviewPromptAction = 'reviewed' | 'dismissed' | 'later';

// =====================================================
// DATABASE TABLES
// =====================================================

export interface PaywallStrategy {
  id: string;
  name: string;
  mode: PaywallMode;
  trigger_type: TriggerType;
  trigger_value: {
    days?: number;
    hours?: number;
    sessions?: number;
  };
  can_skip: boolean;
  free_access_level: FreeAccessLevel;
  post_purchase_redirect: string;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaywallPresentation {
  id: string;
  name: string;
  variant: PresentationVariant;
  template_data: Record<string, any> | null;
  preview_url: string | null;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrialTypeConfig {
  id: string;
  name: string;
  type: TrialType;
  duration_days: number | null;
  usage_hours: number | null;
  usage_sessions: number | null;
  description: string | null;
  enabled: boolean;
  created_at: string;
}

export interface ActivePaywallConfig {
  id: string;
  platform: Platform;
  strategy_id: string;
  presentation_id: string;
  trial_type_id: string;
  
  // Review prompt settings
  enable_mobile_review_prompts: boolean;
  enable_web_review_prompts: boolean;
  review_prompt_delay_minutes: number;
  review_prompts_per_year: number;
  review_prompt_min_sessions: number;
  
  // Usage tracking settings
  usage_cap_hours: number | null;
  usage_cap_sessions: number | null;
  
  // Flags
  enable_hard_hard_for_flagged: boolean;
  
  updated_at: string;
  updated_by: string | null;
}

export interface PaywallAccessPermission {
  id: string;
  strategy_id: string;
  feature_area: FeatureArea;
  can_access: boolean;
  access_level: AccessLevel;
  notes: string | null;
  created_at: string;
}

export interface ReviewPromptHistory {
  id: string;
  user_id: string;
  platform: 'mobile_ios' | 'mobile_android' | 'web';
  prompt_type: ReviewPromptType;
  shown_at: string;
  dismissed: boolean;
  action_taken: ReviewPromptAction | null;
  created_at: string;
}

export interface UserUsageTracking {
  id: string;
  user_id: string;
  total_active_minutes: number;
  total_sessions: number;
  last_session_at: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface GetPaywallConfigRequest {
  platform?: Platform;
  user_id?: string;
}

export interface GetPaywallConfigResponse {
  strategy: PaywallStrategy;
  presentation: PaywallPresentation;
  trial: TrialTypeConfig;
  permissions: PaywallAccessPermission[];
  trial_ended: boolean;
  can_show_review_prompt: boolean;
  usage_stats?: {
    total_active_minutes: number;
    total_sessions: number;
    hours_remaining?: number;
    sessions_remaining?: number;
  };
}

export interface UpdatePaywallConfigRequest {
  platform: Platform;
  strategy_id: string;
  presentation_id: string;
  trial_type_id: string;
  enable_mobile_review_prompts?: boolean;
  enable_web_review_prompts?: boolean;
  review_prompt_delay_minutes?: number;
  review_prompts_per_year?: number;
  review_prompt_min_sessions?: number;
  usage_cap_hours?: number;
  usage_cap_sessions?: number;
  enable_hard_hard_for_flagged?: boolean;
  notes?: string;
}

export interface UpdatePaywallConfigResponse {
  success: boolean;
  config: ActivePaywallConfig;
}

export interface CheckFeatureAccessRequest {
  user_id: string;
  feature_area: FeatureArea;
  platform?: Platform;
}

export interface CheckFeatureAccessResponse {
  can_access: boolean;
  access_level: AccessLevel;
  should_show_paywall: boolean;
  can_skip_paywall: boolean;
  strategy: {
    id: string;
    name: string;
    mode: PaywallMode;
  };
  trial_status: {
    trial_ended: boolean;
    trial_type: string;
    days_remaining?: number;
    hours_remaining?: number;
  };
}

export interface TrackReviewPromptRequest {
  user_id: string;
  platform: 'mobile_ios' | 'mobile_android' | 'web';
  prompt_type: ReviewPromptType;
  action_taken: ReviewPromptAction;
}

export interface TrackReviewPromptResponse {
  success: boolean;
  prompts_shown_this_year: number;
  can_show_again: boolean;
  next_eligible_date?: string;
}

export interface UpdateUsageRequest {
  user_id: string;
  session_minutes?: number;
  increment_sessions?: boolean;
}

export interface UpdateUsageResponse {
  success: boolean;
  total_active_minutes: number;
  total_sessions: number;
  trial_ended: boolean;
}

// =====================================================
// ADMIN CONFIG PAGE TYPES
// =====================================================

export interface PaywallConfigFormData {
  platform: Platform;
  strategy: {
    id: string;
    label: string;
    mode: PaywallMode;
    trigger: string;
    canSkip: boolean;
  };
  presentation: {
    id: string;
    label: string;
    variant: PresentationVariant;
  };
  trial: {
    id: string;
    label: string;
    type: TrialType;
    duration?: number;
  };
  reviewPrompts: {
    enableMobile: boolean;
    enableWeb: boolean;
    delayMinutes: number;
    perYear: number;
    minSessions: number;
  };
  usageCaps: {
    hours: number | null;
    sessions: number | null;
  };
  flags: {
    enableHardHardForFlagged: boolean;
  };
}

// =====================================================
// HELPER TYPES
// =====================================================

export interface PaywallStrategyOption {
  id: string;
  label: string;
  mode: PaywallMode;
  description: string;
  triggerDescription: string;
  canSkip: boolean;
  freeAccess: string;
}

export interface PermissionMatrix {
  [strategyId: string]: {
    [featureArea: string]: {
      canAccess: boolean;
      accessLevel: AccessLevel;
      notes?: string;
    };
  };
}

// =====================================================
// CONSTANTS
// =====================================================

export const PAYWALL_STRATEGY_IDS = {
  HH_LOGIN_LOCKED: 'HH_LOGIN_LOCKED',
  HARD_AFTER_7D: 'HARD_AFTER_7D',
  HARD_AFTER_30D: 'HARD_AFTER_30D',
  HARD_AFTER_USAGE: 'HARD_AFTER_USAGE',
  SOFT_AFTER_7D: 'SOFT_AFTER_7D',
  SOFT_AFTER_30D: 'SOFT_AFTER_30D',
  SOFT_AFTER_USAGE: 'SOFT_AFTER_USAGE',
} as const;

export const PRESENTATION_IDS = {
  PAYWALL_STATIC: 'PAYWALL_STATIC',
  PAYWALL_ONBOARDING_VIDEO: 'PAYWALL_ONBOARDING_VIDEO',
  PAYWALL_APPSTORE_PREVIEW: 'PAYWALL_APPSTORE_PREVIEW',
} as const;

export const TRIAL_TYPE_IDS = {
  TRIAL_7_DAYS: 'TRIAL_7_DAYS',
  TRIAL_30_DAYS: 'TRIAL_30_DAYS',
  TRIAL_USAGE_10H: 'TRIAL_USAGE_10H',
  NO_TRIAL_LOCKED: 'NO_TRIAL_LOCKED',
} as const;

export const FEATURE_AREAS: FeatureArea[] = [
  'login_auth',
  'onboarding',
  'contacts_list',
  'contact_detail',
  'settings',
  'pro_features',
];

export const PLATFORMS: Platform[] = ['mobile', 'web', 'all'];
