/**
 * Feature Signal Sync — Cron Job
 *
 * Reads PostHog in-app feature engagement events and computes a
 * normalized signal strength per content pillar.  The signal is then
 * read by candidates-score to boost pillars that real users are
 * actively engaging with inside EverReach.
 *
 * Mapping: PostHog event name pattern → content pillar
 *   warmth_*                          → warmth_score
 *   interaction_*                     → relationship_systems
 *   voice_note_*                      → relationship_systems
 *   contact_* (except contact_import) → outreach_intelligence
 *   message_* | ai_message_*          → outreach_intelligence
 *   ai_suggestion_accepted            → outreach_intelligence
 *   screenshot_*                      → outreach_intelligence
 *   notification_clicked              → friendship_fade
 *
 * Time decay weights applied before normalization:
 *   last 7 days  × 2.0
 *   last 14 days × 1.5
 *   last 30 days × 1.0
 *
 * Trigger: daily at 04:30 UTC (after content-model-update at 04:20)
 * GET /api/cron/feature-signal-sync
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Pillar → matching event-name prefixes / exact names
// ---------------------------------------------------------------------------
const PILLAR_EVENT_MAP: Record<string, { prefixes: string[]; exact: string[] }> = {
  warmth_score: {
    prefixes: ['warmth_'],
    exact: [],
  },
  relationship_systems: {
    prefixes: ['interaction_', 'voice_note_'],
    exact: [],
  },
  outreach_intelligence: {
    prefixes: ['message_', 'ai_message_', 'screenshot_'],
    exact: [
      'contact_created',
      'contact_updated',
      'contact_viewed',
      'contacts_searched',
      'ai_suggestion_viewed',
      'ai_suggestion_accepted',
      'ai_contact_analyzed',
    ],
  },
  friendship_fade: {
    prefixes: [],
    exact: ['notification_clicked', 'contact_imported'],
  },
};

function pillarForEvent(eventName: string): string | null {
  for (const [pillar, { prefixes, exact }] of Object.entries(PILLAR_EVENT_MAP)) {
    if (exact.includes(eventName)) return pillar;
    if (prefixes.some(p => eventName.startsWith(p))) return pillar;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Time-decay weight: returns 1.0 / 1.5 / 2.0 based on how recent the date is
// ---------------------------------------------------------------------------
function decayWeight(dateStr: string, nowMs: number): number {
  const ageMs = nowMs - new Date(dateStr).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return 2.0;
  if (ageDays <= 14) return 1.5;
  return 1.0;
}

async function featureSignalSync() {
  const supabase = getServiceClient();

  const now = new Date();
  const nowMs = now.getTime();
  const dateKey = now.toISOString().split('T')[0];

  // Idempotency
  const { data: existingRun } = await supabase
    .from('job_runs')
    .select('id')
    .eq('job_name', 'feature-signal-sync')
    .eq('run_key', dateKey)
    .single();

  if (existingRun) {
    return { ok: true, note: 'Already ran today' };
  }

  // Fetch last 30 days of PostHog event cache
  const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: eventRows, error: fetchErr } = await supabase
    .from('posthog_events_cache')
    .select('date, event_name, event_count, unique_users')
    .gte('date', thirtyDaysAgo);

  if (fetchErr) throw fetchErr;

  // Accumulate weighted counts per pillar
  const pillarTotals: Record<string, { weighted: number; raw: number; users: number }> = {};

  for (const row of (eventRows ?? [])) {
    const pillar = pillarForEvent(row.event_name);
    if (!pillar) continue;

    const w = decayWeight(row.date, nowMs);

    if (!pillarTotals[pillar]) {
      pillarTotals[pillar] = { weighted: 0, raw: 0, users: 0 };
    }
    pillarTotals[pillar].weighted += (row.event_count ?? 0) * w;
    pillarTotals[pillar].raw += (row.event_count ?? 0);
    pillarTotals[pillar].users += (row.unique_users ?? 0);
  }

  // Ensure every known pillar has an entry (even if 0)
  for (const pillar of Object.keys(PILLAR_EVENT_MAP)) {
    if (!pillarTotals[pillar]) {
      pillarTotals[pillar] = { weighted: 0, raw: 0, users: 0 };
    }
  }

  // Normalize to 0-1 based on max weighted score
  const maxWeighted = Math.max(...Object.values(pillarTotals).map(v => v.weighted), 1);

  const signals = Object.entries(pillarTotals).map(([pillar, totals]) => ({
    pillar,
    signal_strength: totals.weighted / maxWeighted,
    raw_event_count: totals.raw,
    unique_users: totals.users,
    computed_at: now.toISOString(),
    is_active: true,
  }));

  // Deactivate previous signals
  await supabase
    .from('pillar_feature_signals')
    .update({ is_active: false })
    .eq('is_active', true);

  // Insert new signals
  const { error: insertErr } = await supabase
    .from('pillar_feature_signals')
    .insert(signals);

  if (insertErr) throw insertErr;

  // Record job run
  await supabase.from('job_runs').insert({
    job_name: 'feature-signal-sync',
    run_key: dateKey,
    status: 'completed',
    result: { pillars: signals.map(s => ({ pillar: s.pillar, signal: s.signal_strength.toFixed(3) })) },
    completed_at: now.toISOString(),
  });

  return {
    ok: true,
    signals: signals.map(s => ({ pillar: s.pillar, signal_strength: s.signal_strength })),
  };
}

export async function GET() {
  try {
    const result = await featureSignalSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[feature-signal-sync] failed:', error);
    const msg = (error as any)?.message || JSON.stringify(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
