/**
 * Candidates Scoring API Route
 * POST /api/v1/content/candidates/score
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/admin-auth';

export const runtime = 'nodejs';

async function scoreCandidate(candidate: any, weights: any, recentConcepts: string[], apiKey: string) {
  const estimatePrompt = `You are a content performance estimator for EverReach.
Given this post concept for an app about relationships:
- Pillar: ${candidate.pillar}
- Hook Type: ${candidate.hook_type}
- Concept: ${candidate.concept_text}
- CTA: ${candidate.cta_type}

Estimate as JSON (no markdown):
{
  "engagement_probability": 0.0-1.0,
  "conversion_probability": 0.0-1.0,
  "format_strength": 0.0-1.0,
  "audience_relevance": 0.0-1.0
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

  const noveltyScore = recentConcepts.some((concept: string) => {
    const similarity = Math.min(candidate.concept_text.length, concept.length) / Math.max(candidate.concept_text.length, concept.length);
    return similarity > 0.85;
  })
    ? 0.3
    : 0.95;

  const strategicAlignment = Math.min(1.0, (candidate.strategy_brief?.target_mix?.[candidate.pillar] || 0.1) * 2);
  const productionConfidence = ['static_truth', 'founder_note'].includes(candidate.format) ? 0.95 : 0.7;

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

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);

    const supabase = getServiceClient();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    const { data: existingRun } = await supabase
      .from('job_runs')
      .select('id')
      .eq('job_name', 'candidates-score')
      .eq('run_key', dateKey)
      .single();

    if (existingRun) {
      return NextResponse.json({ ok: true, scored: 0, note: 'Already scored today' });
    }

    const { data: weights } = await supabase
      .from('model_weights')
      .select('w_engagement, w_conversion, w_novelty, w_strategic, w_format, w_audience, w_production')
      .eq('is_active', true)
      .single();

    if (!weights) throw new Error('No active model weights found');

    const { data: candidates } = await supabase
      .from('content_candidates')
      .select('*, content_strategy_briefs(target_mix)')
      .eq('status', 'generated')
      .gte('created_at', `${dateKey}T00:00:00Z`);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ ok: true, scored: 0 });
    }

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: recentPublished } = await supabase
      .from('published_posts')
      .select('concept_text')
      .gte('created_at', `${thirtyDaysAgo}T00:00:00Z`);

    const recentConcepts = recentPublished?.map((p: any) => p.concept_text) || [];

    const updates = [];
    for (const candidate of candidates) {
      try {
        const scores = await scoreCandidate(candidate, weights, recentConcepts, apiKey);
        updates.push({ id: candidate.id, ...scores, status: 'scored' });
      } catch (error) {
        console.error(`Failed to score candidate ${candidate.id}:`, error);
      }
    }

    if (updates.length > 0) {
      for (const update of updates) {
        const { id, ...data } = update;
        const { error } = await supabase.from('content_candidates').update(data).eq('id', id);
        if (error) throw error;
      }
    }

    const { error: jobRunErr } = await supabase.from('job_runs').insert({
      job_name: 'candidates-score',
      run_key: dateKey,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    if (jobRunErr) throw jobRunErr;

    return NextResponse.json({ ok: true, scored: updates.length });
  } catch (error) {
    console.error('Candidates score API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
