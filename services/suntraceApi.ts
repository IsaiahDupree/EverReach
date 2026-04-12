import { supabase } from '@/lib/supabase';
import {
  UserProfile,
  SunSession,
  CreateSessionInput,
  DailyStats,
  SunSpot,
  Badge,
  UserBadge,
  Tip,
  SupplementLog,
  CoachMessage,
  FitzpatrickType,
} from '@/types/suntrace';
import { calculateDailyTarget } from './uvCalculations';

async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user;
}

// ============================================
// Profile operations
// ============================================

export async function getProfile(): Promise<UserProfile | null> {
  const user = await getUser();
  const { data, error } = await supabase
    .from('sun_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error?.code === 'PGRST116') return null; // not found
  if (error) throw error;
  return data;
}

export async function upsertProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const user = await getUser();

  // Calculate target if skin type or age changed
  let daily_d_target_iu = updates.daily_d_target_iu;
  if (updates.skin_type || updates.age) {
    const existing = await getProfile();
    const skinType = updates.skin_type ?? existing?.skin_type ?? 3;
    const age = updates.age ?? existing?.age ?? 30;
    daily_d_target_iu = calculateDailyTarget(skinType, age);
  }

  const { data, error } = await supabase
    .from('sun_profiles')
    .upsert({
      user_id: user.id,
      ...updates,
      ...(daily_d_target_iu ? { daily_d_target_iu } : {}),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Session operations
// ============================================

export async function createSession(input: CreateSessionInput): Promise<SunSession> {
  const user = await getUser();

  const { data, error } = await supabase
    .from('sun_sessions')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw error;

  // Update daily stats
  await updateDailyStats(user.id, input);

  return data;
}

async function updateDailyStats(userId: string, session: CreateSessionInput): Promise<void> {
  const date = new Date(session.started_at).toISOString().split('T')[0];

  // Get existing daily stats
  const { data: existing } = await supabase
    .from('sun_daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  // Get user profile for goal check
  const { data: profile } = await supabase
    .from('sun_profiles')
    .select('daily_d_target_iu')
    .eq('user_id', userId)
    .single();

  const newTotalD = (existing?.total_d_earned_iu ?? 0) + session.d_earned_iu;
  const newTotalMinutes = (existing?.total_minutes ?? 0) + session.duration_minutes;
  const newSessionCount = (existing?.session_count ?? 0) + 1;
  const goalAchieved = profile ? newTotalD >= profile.daily_d_target_iu : false;
  const peakUV = Math.max(existing?.peak_uv_index ?? 0, session.uv_index_avg);

  await supabase.from('sun_daily_stats').upsert({
    user_id: userId,
    date,
    total_d_earned_iu: newTotalD,
    total_minutes: newTotalMinutes,
    session_count: newSessionCount,
    goal_achieved: goalAchieved,
    peak_uv_index: peakUV,
    updated_at: new Date().toISOString(),
  });
}

export async function getSessions(limit: number = 20): Promise<SunSession[]> {
  const user = await getUser();

  const { data, error } = await supabase
    .from('sun_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getTodayStats(): Promise<DailyStats | null> {
  const user = await getUser();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sun_daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();

  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

// ============================================
// Sun Spots
// ============================================

export async function getNearbySpots(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<SunSpot[]> {
  // Simple bounding box query (Supabase doesn't have native geo without PostGIS)
  const latDelta = radiusKm / 111; // ~111km per degree lat
  const lonDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

  const { data, error } = await supabase
    .from('sun_spots')
    .select('*')
    .gte('latitude', latitude - latDelta)
    .lte('latitude', latitude + latDelta)
    .gte('longitude', longitude - lonDelta)
    .lte('longitude', longitude + lonDelta)
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function getAllSpots(): Promise<SunSpot[]> {
  const { data, error } = await supabase
    .from('sun_spots')
    .select('*')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function submitSpot(spot: Omit<SunSpot, 'id' | 'submitted_by' | 'is_verified' | 'created_at'>): Promise<SunSpot> {
  const user = await getUser();

  const { data, error } = await supabase
    .from('sun_spots')
    .insert({ ...spot, submitted_by: user.id, is_verified: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Badges
// ============================================

export async function getUserBadges(): Promise<UserBadge[]> {
  const user = await getUser();

  const { data, error } = await supabase
    .from('sun_user_badges')
    .select('*, badge:sun_badges(*)')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('sun_badges')
    .select('*')
    .order('category, requirement_value');

  if (error) throw error;
  return data ?? [];
}

// ============================================
// Tips
// ============================================

export async function getTips(skinType?: FitzpatrickType): Promise<Tip[]> {
  let query = supabase.from('sun_tips').select('*');

  if (skinType) {
    query = query.or(`skin_types.is.null,skin_types.cs.{${skinType}}`);
  }

  const { data, error } = await query.limit(10);
  if (error) throw error;
  return data ?? [];
}

// ============================================
// Supplement Logs
// ============================================

export async function logSupplement(input: Omit<SupplementLog, 'id' | 'user_id' | 'created_at'>): Promise<SupplementLog> {
  const user = await getUser();

  const { data, error } = await supabase
    .from('sun_supplement_logs')
    .insert({ user_id: user.id, ...input })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Coach Messages
// ============================================

export async function getCoachMessages(limit: number = 50): Promise<CoachMessage[]> {
  const user = await getUser();

  const { data, error } = await supabase
    .from('sun_coach_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function saveCoachMessage(role: 'user' | 'assistant', content: string): Promise<CoachMessage> {
  const user = await getUser();

  const { data, error } = await supabase
    .from('sun_coach_messages')
    .insert({ user_id: user.id, role, content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCoachMessageCountToday(): Promise<number> {
  const user = await getUser();
  const today = new Date().toISOString().split('T')[0];

  const { count, error } = await supabase
    .from('sun_coach_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user')
    .gte('created_at', `${today}T00:00:00Z`);

  if (error) throw error;
  return count ?? 0;
}
