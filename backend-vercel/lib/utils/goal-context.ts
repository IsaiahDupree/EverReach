/**
 * Goal Context Utilities
 * Helper functions for integrating goal inference into AI endpoints
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getUserGoalsForAI, inferUserGoals, InferredGoal } from '../goal-inference';

/**
 * Inject goals into AI prompt (most common use case)
 * 
 * @example
 * const prompt = await injectGoalsIntoPrompt(userId, basePrompt, supabase);
 */
export async function injectGoalsIntoPrompt(
  userId: string,
  basePrompt: string,
  supabase: SupabaseClient
): Promise<string> {
  const goalsContext = await getUserGoalsForAI(userId, supabase);
  
  if (!goalsContext) {
    return basePrompt;
  }
  
  // Insert goals before the main content
  return `${basePrompt}\n${goalsContext}`;
}

/**
 * Get goals with fallback to fresh inference
 * Returns cached goals from ai_user_context, or runs fresh inference if not available
 * 
 * @example
 * const goals = await getGoalsWithFallback(userId, supabase);
 */
export async function getGoalsWithFallback(
  userId: string,
  supabase: SupabaseClient,
  maxAgeHours: number = 24
): Promise<InferredGoal[]> {
  // Try to get cached goals
  const { data: context } = await supabase
    .from('ai_user_context')
    .select('inferred_goals, last_analyzed_at')
    .eq('user_id', userId)
    .single();

  // Check if cached goals are fresh enough
  if (context && context.inferred_goals) {
    const age = Date.now() - new Date(context.last_analyzed_at).getTime();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    
    if (age < maxAge) {
      return context.inferred_goals as InferredGoal[];
    }
  }

  // Run fresh inference
  const goals = await inferUserGoals(userId, supabase);
  
  // Cache for next time
  await supabase.from('ai_user_context').upsert({
    user_id: userId,
    inferred_goals: goals,
    last_analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  return goals;
}

/**
 * Get goals by category
 * 
 * @example
 * const businessGoals = await getGoalsByCategory(userId, 'business', supabase);
 */
export async function getGoalsByCategory(
  userId: string,
  category: 'business' | 'networking' | 'personal',
  supabase: SupabaseClient
): Promise<InferredGoal[]> {
  const goals = await getGoalsWithFallback(userId, supabase);
  return goals.filter(g => g.category === category);
}

/**
 * Check if user has goals
 * Fast check without running inference
 * 
 * @example
 * if (await hasGoals(userId, supabase)) {
 *   // Include goal-aware suggestions
 * }
 */
export async function hasGoals(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { data } = await supabase
    .from('ai_user_context')
    .select('inferred_goals')
    .eq('user_id', userId)
    .single();

  if (!data || !data.inferred_goals) {
    return false;
  }

  return (data.inferred_goals as InferredGoal[]).length > 0;
}

/**
 * Get highest confidence goal
 * Returns the goal with the highest confidence score
 * 
 * @example
 * const primaryGoal = await getPrimaryGoal(userId, supabase);
 * if (primaryGoal) {
 *   console.log('Primary goal:', primaryGoal.goal_text);
 * }
 */
export async function getPrimaryGoal(
  userId: string,
  supabase: SupabaseClient
): Promise<InferredGoal | null> {
  const goals = await getGoalsWithFallback(userId, supabase);
  
  if (goals.length === 0) {
    return null;
  }

  // Sort by weight descending, then confidence
  goals.sort((a, b) => {
    if (a.weight !== b.weight) {
      return b.weight - a.weight;
    }
    return b.confidence - a.confidence;
  });

  return goals[0];
}

/**
 * Format goals as bullet list
 * Useful for displaying in debugging or admin interfaces
 * 
 * @example
 * const goalsList = await formatGoalsAsList(userId, supabase);
 * console.log(goalsList);
 */
export async function formatGoalsAsList(
  userId: string,
  supabase: SupabaseClient,
  includeEvidence: boolean = false
): Promise<string> {
  const goals = await getGoalsWithFallback(userId, supabase);
  
  if (goals.length === 0) {
    return 'No goals inferred';
  }

  return goals.map(g => {
    const sourceLabel = 
      g.source === 'explicit_field' ? '✓ Explicit' :
      g.source === 'note_explicit' ? 'From notes' :
      g.source === 'note_implicit' ? 'Implied' :
      'Inferred';
    
    let line = `- [${g.category}] ${g.goal_text} (${sourceLabel}, ${Math.round(g.confidence * 100)}%)`;
    
    if (includeEvidence && g.evidence.length > 0) {
      line += `\n  Evidence: ${g.evidence[0]}`;
    }
    
    return line;
  }).join('\n');
}

/**
 * Refresh user goals (force re-inference)
 * Use sparingly - ideally only when user updates profile or adds notes
 * 
 * @example
 * await refreshUserGoals(userId, supabase);
 */
export async function refreshUserGoals(
  userId: string,
  supabase: SupabaseClient
): Promise<InferredGoal[]> {
  const goals = await inferUserGoals(userId, supabase);
  
  await supabase.from('ai_user_context').upsert({
    user_id: userId,
    inferred_goals: goals,
    last_analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  return goals;
}

/**
 * Get goal statistics
 * Returns counts and averages for analytics
 * 
 * @example
 * const stats = await getGoalStats(userId, supabase);
 * console.log('Total goals:', stats.total);
 */
export async function getGoalStats(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  total: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  avgConfidence: number;
}> {
  const goals = await getGoalsWithFallback(userId, supabase);
  
  const stats = {
    total: goals.length,
    bySource: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    avgConfidence: 0
  };

  if (goals.length === 0) {
    return stats;
  }

  // Count by source
  goals.forEach(g => {
    stats.bySource[g.source] = (stats.bySource[g.source] || 0) + 1;
    stats.byCategory[g.category] = (stats.byCategory[g.category] || 0) + 1;
  });

  // Average confidence
  stats.avgConfidence = goals.reduce((sum, g) => sum + g.confidence, 0) / goals.length;

  return stats;
}

/**
 * Check if goals are stale (need refresh)
 * 
 * @example
 * if (await areGoalsStale(userId, supabase)) {
 *   await refreshUserGoals(userId, supabase);
 * }
 */
export async function areGoalsStale(
  userId: string,
  supabase: SupabaseClient,
  maxAgeHours: number = 24
): Promise<boolean> {
  const { data } = await supabase
    .from('ai_user_context')
    .select('last_analyzed_at')
    .eq('user_id', userId)
    .single();

  if (!data || !data.last_analyzed_at) {
    return true; // No goals yet
  }

  const age = Date.now() - new Date(data.last_analyzed_at).getTime();
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  return age >= maxAge;
}

/**
 * Batch get goals for multiple users
 * Efficient for processing many users (e.g., in cron jobs)
 * 
 * @example
 * const userGoals = await batchGetGoals([userId1, userId2], supabase);
 */
export async function batchGetGoals(
  userIds: string[],
  supabase: SupabaseClient
): Promise<Map<string, InferredGoal[]>> {
  const { data } = await supabase
    .from('ai_user_context')
    .select('user_id, inferred_goals')
    .in('user_id', userIds);

  const result = new Map<string, InferredGoal[]>();

  if (data) {
    data.forEach(row => {
      result.set(row.user_id, row.inferred_goals as InferredGoal[] || []);
    });
  }

  // Fill in empty arrays for users without goals
  userIds.forEach(id => {
    if (!result.has(id)) {
      result.set(id, []);
    }
  });

  return result;
}

/**
 * Get explicit goals only
 * Returns only goals set explicitly in profile (highest confidence)
 * 
 * @example
 * const explicitGoals = await getExplicitGoals(userId, supabase);
 */
export async function getExplicitGoals(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  business: string | null;
  networking: string | null;
  personal: string | null;
}> {
  const { data } = await supabase
    .from('profiles')
    .select('business_goal, networking_goal, personal_goal')
    .eq('user_id', userId)
    .single();

  return {
    business: data?.business_goal || null,
    networking: data?.networking_goal || null,
    personal: data?.personal_goal || null
  };
}

/**
 * Update explicit goals
 * Convenience method for updating profile goals
 * 
 * @example
 * await updateExplicitGoals(userId, {
 *   business: 'Close 10 deals this quarter'
 * }, supabase);
 */
export async function updateExplicitGoals(
  userId: string,
  goals: {
    business?: string | null;
    networking?: string | null;
    personal?: string | null;
  },
  supabase: SupabaseClient
): Promise<void> {
  const updates: any = {};
  
  if (goals.business !== undefined) updates.business_goal = goals.business;
  if (goals.networking !== undefined) updates.networking_goal = goals.networking;
  if (goals.personal !== undefined) updates.personal_goal = goals.personal;
  
  if (Object.keys(updates).length > 0) {
    updates.goals_updated_at = new Date().toISOString();
    
    await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);
  }
}
