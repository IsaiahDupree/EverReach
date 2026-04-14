/**
 * Content Engine — Shared utilities for the autonomous content pipeline
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ─── Job Runs Idempotency ─────────────────────────────────────────────────────

export interface JobRunResult {
  isNew: boolean;
  runId: string;
  existingResult?: Record<string, unknown>;
}

/**
 * Start or retrieve an existing job run for idempotency.
 * Returns { isNew: true } if this is a new run, or { isNew: false, existingResult } if already run today.
 */
export async function startJobRun(
  supabase: SupabaseClient,
  jobName: string,
  runKey: string = new Date().toISOString().split('T')[0]
): Promise<JobRunResult> {
  // Check for existing run
  const { data: existing } = await supabase
    .from('job_runs')
    .select('id, status, result')
    .eq('job_name', jobName)
    .eq('run_key', runKey)
    .single();

  if (existing) {
    return {
      isNew: false,
      runId: existing.id,
      existingResult: existing.result,
    };
  }

  // Create new run
  const { data: created, error } = await supabase
    .from('job_runs')
    .insert({ job_name: jobName, run_key: runKey, status: 'running' })
    .select('id')
    .single();

  if (error) {
    // Handle race condition — someone else started the run
    if (error.code === '23505') {
      const { data: raced } = await supabase
        .from('job_runs')
        .select('id, status, result')
        .eq('job_name', jobName)
        .eq('run_key', runKey)
        .single();
      return { isNew: false, runId: raced?.id ?? '', existingResult: raced?.result };
    }
    throw error;
  }

  return { isNew: true, runId: created.id };
}

/**
 * Complete a job run with success.
 */
export async function completeJobRun(
  supabase: SupabaseClient,
  runId: string,
  result: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('job_runs')
    .update({
      status: 'completed',
      result,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

/**
 * Fail a job run with an error.
 */
export async function failJobRun(
  supabase: SupabaseClient,
  runId: string,
  error: string
): Promise<void> {
  await supabase
    .from('job_runs')
    .update({
      status: 'failed',
      error,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

// ─── Content Model Constants ──────────────────────────────────────────────────

export const PILLARS = [
  'friendship_fade',
  'relationship_systems',
  'warmth_score',
  'outreach_intelligence',
  'adult_friendship_psychology',
  'product_education',
  'proof_and_trust',
  'conversion',
] as const;

export const FORMATS = [
  'static_truth',
  'carousel_psychology',
  'carousel_framework',
  'product_screenshot',
  'founder_note',
  'short_reel_concept',
] as const;

export const AWARENESS_LEVELS = [
  'unaware',
  'problem_aware',
  'solution_aware',
  'product_aware',
  'most_aware',
] as const;

export const HOOK_TYPES = [
  'signs',
  'mistakes',
  'truths',
  'why_this_happens',
  'tiny_habit',
  'realization',
  'framework',
  'myth_busting',
] as const;

export const CTA_TYPES = [
  'save_this',
  'share_this',
  'follow_for_more',
  'comment_prompt',
  'profile_visit',
  'install_app',
] as const;

export type Pillar = typeof PILLARS[number];
export type Format = typeof FORMATS[number];
export type AwarenessLevel = typeof AWARENESS_LEVELS[number];
export type HookType = typeof HOOK_TYPES[number];
export type CtaType = typeof CTA_TYPES[number];

// ─── Evergreen App Store Review Signals ───────────────────────────────────────

export const EVERGREEN_REVIEW_SIGNALS = [
  {
    signal_category: 'pain_point',
    signal_text: 'I lose touch with friends and feel guilty about it constantly',
    pillar: 'friendship_fade',
  },
  {
    signal_category: 'desire',
    signal_text: 'I want a system that reminds me to check in on people I care about',
    pillar: 'relationship_systems',
  },
  {
    signal_category: 'pain_point',
    signal_text: 'Making friends as an adult is so much harder than in school',
    pillar: 'adult_friendship_psychology',
  },
  {
    signal_category: 'topic_interest',
    signal_text: 'The warmth score feature helps me prioritize who to reach out to',
    pillar: 'warmth_score',
  },
  {
    signal_category: 'desire',
    signal_text: 'I want to be more intentional about my relationships without it feeling forced',
    pillar: 'outreach_intelligence',
  },
  {
    signal_category: 'pain_point',
    signal_text: 'I forget birthdays and important dates for people I care about',
    pillar: 'relationship_systems',
  },
  {
    signal_category: 'topic_interest',
    signal_text: 'Love how the app tracks my interaction patterns automatically',
    pillar: 'product_education',
  },
  {
    signal_category: 'desire',
    signal_text: 'Finally an app that helps me maintain friendships systematically',
    pillar: 'proof_and_trust',
  },
  {
    signal_category: 'pain_point',
    signal_text: 'Social anxiety makes it hard to know when to reach out',
    pillar: 'adult_friendship_psychology',
  },
  {
    signal_category: 'objection',
    signal_text: 'Is it weird to use an app to manage friendships?',
    pillar: 'conversion',
  },
];

// ─── Model Weights ────────────────────────────────────────────────────────────

export interface ModelWeights {
  w_engagement: number;
  w_conversion: number;
  w_novelty: number;
  w_strategic: number;
  w_format: number;
  w_audience: number;
  w_production: number;
}

export async function getActiveWeights(supabase: SupabaseClient): Promise<ModelWeights> {
  const { data } = await supabase
    .from('model_weights')
    .select('w_engagement, w_conversion, w_novelty, w_strategic, w_format, w_audience, w_production')
    .eq('is_active', true)
    .single();

  if (!data) {
    // Return default weights if none active
    return {
      w_engagement: 0.25,
      w_conversion: 0.20,
      w_novelty: 0.15,
      w_strategic: 0.15,
      w_format: 0.10,
      w_audience: 0.10,
      w_production: 0.05,
    };
  }

  return data as ModelWeights;
}

/**
 * Calculate total score from component scores using model weights.
 */
export function calculateTotalScore(
  weights: ModelWeights,
  components: {
    predicted_engagement: number;
    predicted_conversion: number;
    novelty_score: number;
    strategic_alignment: number;
    format_strength: number;
    audience_relevance: number;
    production_confidence: number;
  }
): number {
  return (
    weights.w_engagement * components.predicted_engagement +
    weights.w_conversion * components.predicted_conversion +
    weights.w_novelty * components.novelty_score +
    weights.w_strategic * components.strategic_alignment +
    weights.w_format * components.format_strength +
    weights.w_audience * components.audience_relevance +
    weights.w_production * components.production_confidence
  );
}
