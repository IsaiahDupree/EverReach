/**
 * Candidate Generation — Cron Job
 *
 * Uses OpenAI to generate 20 post concept candidates from today's strategy brief.
 * Each candidate has: pillar, subtopic, awareness_level, format, hook_type, cta_type, target_emotion, concept_text
 *
 * Trigger: daily at 00:45 UTC
 * GET /api/cron/candidates-generate
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const VALID_FORMATS = ['static_truth', 'carousel_psychology', 'carousel_framework', 'product_screenshot', 'founder_note', 'short_reel_concept'];
const VALID_HOOKS = ['signs', 'mistakes', 'truths', 'why_this_happens', 'tiny_habit', 'realization', 'framework', 'myth_busting'];
const VALID_CTAS = ['save_this', 'share_this', 'follow_for_more', 'comment_prompt', 'profile_visit', 'install_app'];
const VALID_AWARENESS = ['unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware'];

async function generateCandidates() {
  const supabase = getServiceClient();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];

  // Check if already run today
  const { data: existingRun } = await supabase
    .from('job_runs')
    .select('id')
    .eq('job_name', 'candidates-generate')
    .eq('run_key', dateKey)
    .single();

  if (existingRun) {
    const { data: candidates } = await supabase
      .from('content_candidates')
      .select('id')
      .gte('created_at', `${dateKey}T00:00:00Z`)
      .limit(1);
    return {
      ok: true,
      count: 20,
      brief_id: 'today',
      note: 'Already generated today',
      candidates_generated: candidates?.length || 0,
    };
  }

  // Get today's strategy brief
  const { data: todayBrief } = await supabase
    .from('content_strategy_briefs')
    .select('id, primary_objective, secondary_objective, target_mix, exclusions')
    .eq('scope_type', 'daily')
    .gte('created_at', `${dateKey}T00:00:00Z`)
    .single();

  if (!todayBrief) throw new Error('No strategy brief found for today');

  // Generate 20 candidates using OpenAI
  const prompt = `You are a content strategist for EverReach, an app about maintaining relationships and friendships.

Today's Strategy:
- Primary Objective: ${todayBrief.primary_objective}
- Secondary Objective: ${todayBrief.secondary_objective}
- Target Mix: ${JSON.stringify(todayBrief.target_mix)}
- Avoid: ${todayBrief.exclusions?.join(', ') || 'none'}

Generate exactly 20 post concept candidates as a JSON array. Each candidate must have:
- pillar: one of [friendship_fade, relationship_systems, warmth_score, outreach_intelligence, adult_friendship_psychology, product_education, proof_and_trust, conversion]
- awareness_level: one of [unaware, problem_aware, solution_aware, product_aware, most_aware]
- format: one of [static_truth, carousel_psychology, carousel_framework, product_screenshot, founder_note, short_reel_concept]
- hook_type: one of [signs, mistakes, truths, why_this_happens, tiny_habit, realization, framework, myth_busting]
- cta_type: one of [save_this, share_this, follow_for_more, comment_prompt, profile_visit, install_app]
- subtopic: a specific angle within the pillar
- target_emotion: the primary emotion to trigger (e.g., recognition, hope, curiosity, guilt, joy)
- concept_text: a 1-2 sentence concept description

Response format: ONLY a JSON array, no markdown or explanation.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse candidates from OpenAI');

  let candidates = JSON.parse(jsonMatch[0]);

  // Validate and fix candidates
  candidates = candidates.slice(0, 20).map((c: any) => ({
    ...c,
    strategy_brief_id: todayBrief.id,
    status: 'generated',
    pillar: VALID_FORMATS.includes(c.pillar) ? c.pillar : 'friendship_fade',
    awareness_level: VALID_AWARENESS.includes(c.awareness_level) ? c.awareness_level : 'problem_aware',
    format: VALID_FORMATS.includes(c.format) ? c.format : 'static_truth',
    hook_type: VALID_HOOKS.includes(c.hook_type) ? c.hook_type : 'truths',
    cta_type: VALID_CTAS.includes(c.cta_type) ? c.cta_type : 'save_this',
    subtopic: c.subtopic || 'general',
    target_emotion: c.target_emotion || 'recognition',
    concept_text: c.concept_text || 'Concept TBD',
  }));

  // Insert all candidates
  const { error: insertErr, data: inserted } = await supabase
    .from('content_candidates')
    .insert(candidates)
    .select('id');

  if (insertErr) throw insertErr;

  // Record job run
  const { error: jobRunErr } = await supabase.from('job_runs').insert({
    job_name: 'candidates-generate',
    run_key: dateKey,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  if (jobRunErr) throw jobRunErr;

  return {
    ok: true,
    count: inserted?.length || candidates.length,
    brief_id: todayBrief.id,
  };
}

export async function GET() {
  try {
    const result = await generateCandidates();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Candidates generate cron failed:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
