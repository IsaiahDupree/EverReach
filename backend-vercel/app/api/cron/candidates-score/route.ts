/**
 * Candidate Scoring — Cron Job
 *
 * Scores all 'generated' candidates using 7-component formula:
 * total_score = 0.25*predicted_engagement + 0.20*predicted_conversion +
 *               0.15*novelty_score + 0.15*strategic_alignment +
 *               0.10*format_strength + 0.10*audience_relevance + 0.05*production_confidence
 *
 * Trigger: daily at 00:50 UTC
 * GET /api/cron/candidates-score
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

async function scoreCandidate(
  candidate: any,
  weights: any,
  recentConcepts: string[],
  apiKey: string
) {
  // 1. Predicted Engagement & Conversion via OpenAI
  const estimatePrompt = `You are a content performance estimator for EverReach.
Given this post concept for an app about relationships:
- Pillar: ${candidate.pillar}
- Hook Type: ${candidate.hook_type}
- Concept: ${candidate.concept_text}
- CTA: ${candidate.cta_type}

Estimate as JSON (no markdown):
{
  "engagement_probability": 0.0-1.0 (likelihood of engagement: likes, comments, saves),
  "conversion_probability": 0.0-1.0 (likelihood of install/upgrade),
  "format_strength": 0.0-1.0 (how well the format serves the message),
  "audience_relevance": 0.0-1.0 (relevance to target audience)
}`;

  const estimateResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: estimatePrompt }],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!estimateResponse.ok) throw new Error('Failed to estimate from OpenAI');
  const estimateData = await estimateResponse.json();
  const estimateContent = estimateData.choices[0].message.content;
  const jsonMatch = estimateContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse estimate');

  const estimates = JSON.parse(jsonMatch[0]);

  // 2. Novelty Score - check substring similarity with last 30 days
  const noveltyScore = recentConcepts.some((concept: string) => {
    const similarity = Math.min(
      candidate.concept_text.length,
      concept.length
    ) / Math.max(candidate.concept_text.length, concept.length);
    return similarity > 0.85;
  }) ? 0.3 : 0.95; // Penalize if very similar

  // 3. Strategic Alignment with target_mix
  const targetForPillar = candidate.strategy_brief?.target_mix?.[candidate.pillar] || 0.1;
  const strategicAlignment = Math.min(1.0, targetForPillar * 2); // 0-1 range

  // 4. Production Confidence - high for formats we render, lower for complex ones
  const productionConfidence = ['static_truth', 'founder_note'].includes(candidate.format) ? 0.95 : 0.7;

  // 5. Compute weighted total
  const total_score =
    weights.w_engagement * estimates.engagement_probability +
    weights.w_conversion * estimates.conversion_probability +
    weights.w_novelty * noveltyScore +
    weights.w_strategic * strategicAlignment +
    weights.w_format * estimates.format_strength +
    weights.w_audience * estimates.audience_relevance +
    weights.w_production * productionConfidence;

  return {
    total_score: Math.min(1.0, Math.max(0.0, total_score)),
    predicted_engagement: estimates.engagement_probability,
    predicted_conversion: estimates.conversion_probability,
    novelty_score: noveltyScore,
    strategic_alignment: strategicAlignment,
    format_strength: estimates.format_strength,
    audience_relevance: estimates.audience_relevance,
    production_confidence: productionConfidence,
  };
}

async function scoreCandidates() {
  const supabase = getServiceClient();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];

  // Check if already run today
  const { data: existingRun } = await supabase
    .from('job_runs')
    .select('id')
    .eq('job_name', 'candidates-score')
    .eq('run_key', dateKey)
    .single();

  if (existingRun) {
    return { ok: true, scored: 0, note: 'Already scored today' };
  }

  // Get active model weights
  const { data: weights } = await supabase
    .from('model_weights')
    .select('w_engagement, w_conversion, w_novelty, w_strategic, w_format, w_audience, w_production')
    .eq('is_active', true)
    .single();

  if (!weights) throw new Error('No active model weights found');

  // Get all unscored candidates from today
  const { data: candidates } = await supabase
    .from('content_candidates')
    .select('*, content_strategy_briefs(target_mix)')
    .eq('status', 'generated')
    .gte('created_at', `${dateKey}T00:00:00Z`);

  if (!candidates || candidates.length === 0) {
    return { ok: true, scored: 0 };
  }

  // Get recent concepts for novelty check (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: recentPublished } = await supabase
    .from('published_posts')
    .select('concept_text')
    .gte('created_at', `${thirtyDaysAgo}T00:00:00Z`);

  const recentConcepts = recentPublished?.map((p: any) => p.concept_text) || [];

  // Score each candidate
  const updates = [];
  for (const candidate of candidates) {
    try {
      const scores = await scoreCandidate(candidate, weights, recentConcepts, apiKey);
      updates.push({
        id: candidate.id,
        ...scores,
        status: 'scored',
      });
    } catch (error) {
      console.error(`Failed to score candidate ${candidate.id}:`, error);
    }
  }

  // Update all candidates
  if (updates.length > 0) {
    for (const update of updates) {
      const { id, ...data } = update;
      const { error } = await supabase
        .from('content_candidates')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    }
  }

  // Record job run
  const { error: jobRunErr } = await supabase.from('job_runs').insert({
    job_name: 'candidates-score',
    run_key: dateKey,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  if (jobRunErr) throw jobRunErr;

  return { ok: true, scored: updates.length };
}

export async function GET() {
  try {
    const result = await scoreCandidates();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Candidates score cron failed:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
