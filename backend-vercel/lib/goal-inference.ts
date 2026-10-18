/**
 * AI Goal Inference System
 * Extracts user goals from profile fields, persona notes, and behavioral patterns
 * 
 * Weighted hierarchy:
 * 1. Explicit profile fields: 100% weight
 * 2. Explicit mentions in notes: 80% weight
 * 3. Implicit patterns in notes: 50% weight
 * 4. Behavioral inference: 30% weight
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getOpenAIClient } from './openai';

export type GoalSource = 'explicit_field' | 'note_explicit' | 'note_implicit' | 'behavior';
export type GoalCategory = 'business' | 'networking' | 'personal';

export interface InferredGoal {
  source: GoalSource;
  category: GoalCategory;
  goal_text: string;
  confidence: number;
  weight: number;
  evidence: string[];
  extracted_from?: string;
}

/**
 * Main entry point: Infer all goals for a user
 */
export async function inferUserGoals(
  userId: string,
  supabase: SupabaseClient
): Promise<InferredGoal[]> {
  const goals: InferredGoal[] = [];

  try {
    // 1. HIGHEST PRIORITY: Explicit goal fields (100% weight)
    const explicitGoals = await getExplicitGoals(userId, supabase);
    goals.push(...explicitGoals);

    // 2. SECOND PRIORITY: Extract from persona notes (80% explicit, 50% implicit)
    const { data: notes } = await supabase
      .from('persona_notes')
      .select('id, title, body_text, transcript, tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (notes && notes.length > 0) {
      const noteGoals = await extractGoalsFromNotes(notes);
      goals.push(...noteGoals);
    }

    // 3. LOWEST PRIORITY: Behavioral inference (30% weight)
    const behaviorData = await analyzeBehavior(userId, supabase);
    const behaviorGoals = await inferFromBehavior(behaviorData);
    goals.push(...behaviorGoals);

    // Deduplicate and merge similar goals
    const mergedGoals = deduplicateGoals(goals);

    return mergedGoals;
  } catch (error) {
    console.error('[Goal Inference Error]', error);
    return goals; // Return what we have so far
  }
}

/**
 * Get explicit goals from user profile fields
 */
async function getExplicitGoals(
  userId: string,
  supabase: SupabaseClient
): Promise<InferredGoal[]> {
  const goals: InferredGoal[] = [];
  
  // 1. Get explicit goals from user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('personal_goal, networking_goal, business_goal')
    .eq('user_id', userId)
    .single();

  if (!profile) return goals;

  if (profile.business_goal && profile.business_goal.trim()) {
    goals.push({
      source: 'explicit_field',
      category: 'business',
      goal_text: profile.business_goal.trim(),
      confidence: 1.0,
      weight: 100,
      evidence: ['Explicitly set in profile'],
      extracted_from: 'user_profile.business_goal'
    });
  }

  if (profile.networking_goal && profile.networking_goal.trim()) {
    goals.push({
      source: 'explicit_field',
      category: 'networking',
      goal_text: profile.networking_goal.trim(),
      confidence: 1.0,
      weight: 100,
      evidence: ['Explicitly set in profile'],
      extracted_from: 'user_profile.networking_goal'
    });
  }

  if (profile.personal_goal && profile.personal_goal.trim()) {
    goals.push({
      source: 'explicit_field',
      category: 'personal',
      goal_text: profile.personal_goal.trim(),
      confidence: 1.0,
      weight: 100,
      evidence: ['Explicitly set in profile'],
      extracted_from: 'user_profile.personal_goal'
    });
  }

  return goals;
}

/**
 * Extract goals from persona notes using AI
 */
async function extractGoalsFromNotes(notes: any[]): Promise<InferredGoal[]> {
  const goals: InferredGoal[] = [];

  try {
    const client = getOpenAIClient();
    
    // Combine note content
    const noteContent = notes.map(n => {
      const text = n.transcript || n.body_text || '';
      const date = new Date(n.created_at).toLocaleDateString();
      return `[${date}] ${n.title || 'Untitled'}\n${text.slice(0, 500)}`;
    }).join('\n\n---\n\n');

    if (!noteContent.trim()) return goals;

    const prompt = `Extract user goals from these personal notes. Look for:

1. EXPLICIT goals (high confidence): "My goal is...", "I want to...", "I need to...", "This quarter I will..."
2. IMPLICIT goals (medium confidence): Recurring themes, aspirations, patterns, repeated intentions

Notes:
${noteContent.slice(0, 8000)}

For each goal found:
- Categorize as: business (revenue, deals, growth), networking (relationships, connections), or personal (learning, health, balance)
- Be conservative - only extract clear intentions
- Avoid vague or one-time mentions

Return JSON:
{
  "explicit_goals": [
    {
      "goal_text": "Close 5 enterprise deals this quarter",
      "category": "business",
      "evidence": "Mentioned in note from Oct 1: 'This quarter I need to close 5 enterprise deals'"
    }
  ],
  "implicit_goals": [
    {
      "goal_text": "Build stronger CTO network",
      "category": "networking",
      "evidence": "Multiple notes mention connecting with CTOs and tech leaders"
    }
  ]
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at extracting goals from personal notes. Be conservative - only extract clear, genuine intentions. Avoid hallucinating goals not present in the text.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"explicit_goals":[],"implicit_goals":[]}');
    
    // Process explicit goals from notes (80% weight)
    if (result.explicit_goals && Array.isArray(result.explicit_goals)) {
      result.explicit_goals.forEach((g: any) => {
        if (g.goal_text && g.category) {
          goals.push({
            source: 'note_explicit',
            category: g.category as GoalCategory,
            goal_text: g.goal_text.trim(),
            confidence: 0.85,
            weight: 80,
            evidence: [g.evidence || 'Found in persona notes'],
            extracted_from: 'persona_notes'
          });
        }
      });
    }

    // Process implicit goals from notes (50% weight)
    if (result.implicit_goals && Array.isArray(result.implicit_goals)) {
      result.implicit_goals.forEach((g: any) => {
        if (g.goal_text && g.category) {
          goals.push({
            source: 'note_implicit',
            category: g.category as GoalCategory,
            goal_text: g.goal_text.trim(),
            confidence: 0.6,
            weight: 50,
            evidence: [g.evidence || 'Inferred pattern from notes'],
            extracted_from: 'persona_notes'
          });
        }
      });
    }

  } catch (error) {
    console.error('[Extract Goals from Notes Error]', error);
  }

  return goals;
}

/**
 * Analyze user behavior patterns
 */
async function analyzeBehavior(
  userId: string,
  supabase: SupabaseClient
): Promise<any> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [contacts, interactions, pipelineData] = await Promise.all([
      supabase
        .from('contacts')
        .select('display_name, company, tags, job_title')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .limit(100),
      
      supabase
        .from('interactions')
        .select('created_at, kind')
        .eq('user_id', userId)
        .gte('created_at', ninetyDaysAgo),
      
      supabase
        .from('contact_pipeline_state')
        .select('stage_key, pipeline_key')
        .eq('user_id', userId)
    ]);

    // Extract job titles
    const titles = (contacts.data || [])
      .map(c => c.job_title)
      .filter(Boolean);

    // Count active pipeline deals
    const activeDealStages = ['demo', 'proposal', 'negotiation', 'contract'];
    const activeDeals = (pipelineData.data || [])
      .filter(p => activeDealStages.includes(p.stage_key))
      .length;

    return {
      total_contacts: contacts.data?.length || 0,
      interactions_90d: interactions.data?.length || 0,
      pipeline_active_deals: activeDeals,
      contact_titles: titles,
      contact_tags: (contacts.data || []).flatMap(c => c.tags || [])
    };
  } catch (error) {
    console.error('[Analyze Behavior Error]', error);
    return {
      total_contacts: 0,
      interactions_90d: 0,
      pipeline_active_deals: 0,
      contact_titles: [],
      contact_tags: []
    };
  }
}

/**
 * Infer goals from behavioral patterns
 */
async function inferFromBehavior(behaviorData: any): Promise<InferredGoal[]> {
  const goals: InferredGoal[] = [];

  try {
    // Business goal: Active pipeline indicates sales focus
    if (behaviorData.pipeline_active_deals > 5) {
      const dealCount = Math.ceil(behaviorData.pipeline_active_deals * 0.6);
      goals.push({
        source: 'behavior',
        category: 'business',
        goal_text: `Close ${dealCount} deals this quarter`,
        confidence: 0.5,
        weight: 30,
        evidence: [`${behaviorData.pipeline_active_deals} active deals in pipeline`],
        extracted_from: 'pipeline_activity'
      });
    }

    // Networking goal: Many CTOs/executives suggests networking focus
    const executiveTitles = (behaviorData.contact_titles || []).filter((t: string) => 
      t.toLowerCase().includes('cto') || 
      t.toLowerCase().includes('ceo') || 
      t.toLowerCase().includes('vp') ||
      t.toLowerCase().includes('director') ||
      t.toLowerCase().includes('chief')
    );

    if (executiveTitles.length > 5) {
      goals.push({
        source: 'behavior',
        category: 'networking',
        goal_text: `Connect with ${executiveTitles.length + 5} senior leaders`,
        confidence: 0.45,
        weight: 30,
        evidence: [`${executiveTitles.length} senior leaders in network`],
        extracted_from: 'contact_patterns'
      });
    }

    // High interaction frequency suggests relationship maintenance goal
    if (behaviorData.interactions_90d > 50) {
      goals.push({
        source: 'behavior',
        category: 'personal',
        goal_text: 'Maintain regular contact with key relationships',
        confidence: 0.4,
        weight: 30,
        evidence: [`${behaviorData.interactions_90d} interactions in last 90 days`],
        extracted_from: 'interaction_patterns'
      });
    }

  } catch (error) {
    console.error('[Infer from Behavior Error]', error);
  }

  return goals;
}

/**
 * Deduplicate and merge similar goals
 */
function deduplicateGoals(goals: InferredGoal[]): InferredGoal[] {
  // Group by category
  const byCategory: Record<GoalCategory, InferredGoal[]> = {
    business: [],
    networking: [],
    personal: []
  };

  goals.forEach(g => byCategory[g.category].push(g));

  const merged: InferredGoal[] = [];

  // For each category, take the highest weight goal
  Object.entries(byCategory).forEach(([category, categoryGoals]) => {
    if (categoryGoals.length === 0) return;

    // Sort by weight descending
    categoryGoals.sort((a, b) => b.weight - a.weight);

    // If we have an explicit field goal, that always wins
    const explicitFieldGoal = categoryGoals.find(g => g.source === 'explicit_field');
    if (explicitFieldGoal) {
      merged.push(explicitFieldGoal);
      return;
    }

    // Otherwise take highest weight goal and merge evidence
    const primary = categoryGoals[0];
    const supporting = categoryGoals.slice(1, 3); // Up to 2 more for additional evidence
    
    merged.push({
      ...primary,
      evidence: [
        ...primary.evidence,
        ...supporting.flatMap(g => g.evidence)
      ].slice(0, 5) // Max 5 evidence items
    });
  });

  return merged;
}

/**
 * Get formatted goals for AI consumption
 */
export async function getUserGoalsForAI(
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const { data: context } = await supabase
      .from('ai_user_context')
      .select('inferred_goals')
      .eq('user_id', userId)
      .single();

    if (!context?.inferred_goals || context.inferred_goals.length === 0) {
      return '';
    }

    // Sort by weight and format
    const goals = (context.inferred_goals as InferredGoal[])
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5); // Top 5 goals

    const formatted = goals.map(g => {
      const sourceLabel = 
        g.source === 'explicit_field' ? '✓ Explicit' :
        g.source === 'note_explicit' ? 'From notes' :
        g.source === 'note_implicit' ? 'Implied' :
        'Inferred';
      
      return `- [${g.category}] ${g.goal_text} (${sourceLabel}, confidence: ${Math.round(g.confidence * 100)}%)`;
    }).join('\n');

    return `\n\nUser's Goals (context for AI - don't explicitly mention unless asked):\n${formatted}\n`;

  } catch (error) {
    console.error('[Get User Goals for AI Error]', error);
    return '';
  }
}
