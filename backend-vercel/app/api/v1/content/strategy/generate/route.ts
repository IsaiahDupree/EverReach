/**
 * Strategy Generation API Route
 *
 * POST /api/v1/content/strategy/generate
 * Same logic as the cron job, but callable via API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {

    const supabase = getServiceClient();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    // Check if already run today
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    const { data: existingRun } = await supabase
      .from('job_runs')
      .select('id')
      .eq('job_name', 'strategy-generate')
      .eq('run_key', dateKey)
      .single();

    if (existingRun) {
      const { data: brief } = await supabase
        .from('content_strategy_briefs')
        .select('id')
        .eq('scope_type', 'daily')
        .gte('created_at', `${dateKey}T00:00:00Z`)
        .single();
      return NextResponse.json({ ok: true, brief_id: brief?.id, note: 'Already generated today' });
    }

    // Fetch recent signals
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: signals } = await supabase
      .from('content_signals')
      .select('signal_text, signal_category')
      .gte('created_at', `${sevenDaysAgo}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(50);

    const signalSummary = signals
      ?.map((s: any) => `${s.signal_category}: ${s.signal_text}`)
      .join('\n') || 'No signals available';

    const prompt = `You are a content strategy expert for EverReach, an app about relationships and friendship.
Based on the following recent signals from user behavior and app store reviews, generate a daily content strategy.

SIGNALS:
${signalSummary}

Generate a JSON response with these fields (ONLY JSON, no markdown):
{
  "primary_objective": "The main focus for today's content (1-2 sentences)",
  "secondary_objective": "A secondary focus area",
  "target_mix": {
    "friendship_fade": 0.15,
    "relationship_systems": 0.15,
    "warmth_score": 0.10,
    "outreach_intelligence": 0.10,
    "adult_friendship_psychology": 0.15,
    "product_education": 0.15,
    "proof_and_trust": 0.10,
    "conversion": 0.10
  },
  "exclusions": ["Any pillars or CTAs to avoid today"],
  "notes": "Any additional strategy notes"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error?.error?.message || response.statusText}`);
    }

    const responseData = await response.json();
    const content = responseData.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse OpenAI response');

    const strategy = JSON.parse(jsonMatch[0]);

    // Validate and normalize target_mix
    const sum = Object.values(strategy.target_mix || {}).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number;
    if (Math.abs((sum as number) - 1.0) > 0.05) {
      const normalized: any = {};
      Object.entries(strategy.target_mix || {}).forEach(([k, v]: any) => {
        normalized[k] = v / (sum as number);
      });
      strategy.target_mix = normalized;
    }

    // Save brief
    const { data: brief, error: insertErr } = await supabase
      .from('content_strategy_briefs')
      .insert({
        scope_type: 'daily',
        primary_objective: strategy.primary_objective,
        secondary_objective: strategy.secondary_objective,
        target_mix: strategy.target_mix,
        exclusions: strategy.exclusions,
        notes: strategy.notes,
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;
    if (!brief) throw new Error('Failed to insert strategy brief');

    // Record in job_runs
    const { error: jobRunErr } = await supabase.from('job_runs').insert({
      job_name: 'strategy-generate',
      run_key: dateKey,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    if (jobRunErr) throw jobRunErr;

    return NextResponse.json({ ok: true, brief_id: brief.id });
  } catch (error) {
    console.error('Strategy generate API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
