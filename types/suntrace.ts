// Fitzpatrick skin types I-VI
export type FitzpatrickType = 1 | 2 | 3 | 4 | 5 | 6;

export interface SkinTypeInfo {
  type: FitzpatrickType;
  name: string;
  description: string;
  colorHex: string;
  burnTime: number; // minutes at UV 3 before burn risk
  dProductionRate: number; // IU per minute per UV index unit
}

export interface UserProfile {
  id: string;
  user_id: string;
  skin_type: FitzpatrickType;
  age: number;
  daily_d_target_iu: number;
  streak_count: number;
  last_session_date: string | null;
  notifications_enabled: boolean;
  healthkit_enabled: boolean;
  location_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SunSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  uv_index_avg: number;
  d_earned_iu: number;
  burn_risk_level: 'low' | 'moderate' | 'high' | 'very_high';
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateSessionInput {
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  uv_index_avg: number;
  d_earned_iu: number;
  burn_risk_level: 'low' | 'moderate' | 'high' | 'very_high';
  latitude?: number;
  longitude?: number;
  location_name?: string;
  notes?: string;
}

export interface DailyStats {
  id: string;
  user_id: string;
  date: string;
  total_d_earned_iu: number;
  total_minutes: number;
  session_count: number;
  goal_achieved: boolean;
  peak_uv_index: number;
  created_at: string;
  updated_at: string;
}

export interface SunSpot {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  spot_type: 'park' | 'beach' | 'rooftop' | 'garden' | 'trail' | 'plaza';
  submitted_by: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'milestone' | 'consistency' | 'exploration' | 'health';
  requirement_type: 'streak_days' | 'total_sessions' | 'total_d_iu' | 'spots_visited' | 'consecutive_goal';
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

export interface Tip {
  id: string;
  title: string;
  body: string;
  category: 'timing' | 'safety' | 'nutrition' | 'skin_care' | 'seasonal';
  skin_types: FitzpatrickType[] | null;
  is_pro: boolean;
  created_at: string;
}

export interface SupplementLog {
  id: string;
  user_id: string;
  date: string;
  supplement_type: 'vitamin_d3' | 'vitamin_d2' | 'cod_liver_oil' | 'multivitamin';
  dose_iu: number;
  notes: string | null;
  created_at: string;
}

export interface CoachMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// UV data from Open-Meteo
export interface UVForecastHour {
  time: string; // ISO datetime
  uv_index: number;
  uv_index_clear_sky: number;
  cloud_cover: number;
  is_best_window?: boolean;
}

export interface UVForecastDay {
  date: string; // YYYY-MM-DD
  max_uv_index: number;
  avg_cloud_cover: number;
  best_window_start: string | null;
  best_window_end: string | null;
  hours: UVForecastHour[];
}

export interface UVForecast {
  latitude: number;
  longitude: number;
  current_uv: number;
  days: UVForecastDay[];
  fetched_at: string;
}

// Active session state
export interface ActiveSession {
  started_at: string;
  elapsed_seconds: number;
  current_uv: number;
  d_accumulated: number;
  burn_risk_seconds_remaining: number;
}

// Vitamin D calculation
export interface VitaminDCalcParams {
  uv_index: number;
  minutes: number;
  skin_type: FitzpatrickType;
}
