/**
 * Instagram Adaptive Scheduler
 *
 * Thompson Sampling engine that learns the best time and frequency
 * to post to Instagram based on historical engagement data.
 *
 * Algorithm:
 *   - Each (hour × day_of_week) slot has a Beta(alpha, beta) distribution.
 *   - alpha = weighted engagement successes, beta = posts - successes.
 *   - To pick next slot: sample from each slot's Beta, take argmax.
 *   - After posting, fetch metrics and update parameters.
 *   - Frequency (posts/day) adapts based on rolling 7-day engagement rate.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PostingConfig {
  user_id: string;
  min_posts_per_day: number;
  max_posts_per_day: number;
  current_target: number;
  quiet_start_hour: number;
  quiet_end_hour: number;
  learning_rate: number;
  engagement_threshold: number;
  last_posted_at: string | null;
  posts_last_7d: number;
  avg_engagement_7d: number;
  enabled: boolean;
}

export interface SlotModel {
  hour_of_day: number;
  day_of_week: number;
  alpha: number;
  beta_param: number;
  posts_in_slot: number;
  avg_engagement: number;
}

export interface ScheduledSlot {
  hour_of_day: number;
  day_of_week: number;
  scheduled_at: Date;
  expected_engagement: number;
}

// ─── Beta distribution sampler (approximation using normal transform) ────────

/** Sample from Beta(a, b) using Johnk's method approximation */
function sampleBeta(alpha: number, beta: number): number {
  // Use normal approximation for large params
  if (alpha > 1 && beta > 1) {
    const mu = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const sigma = Math.sqrt(variance);
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0.001, Math.min(0.999, mu + sigma * z));
  }
  // Exact sampling for small params via gamma ratio
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

function sampleGamma(k: number): number {
  // Marsaglia and Tsang's method
  if (k < 1) return sampleGamma(1 + k) * Math.pow(Math.random(), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      const u1 = Math.random(), u2 = Math.random();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = Math.pow(1 + c * x, 3);
    } while (v <= 0);
    const u = Math.random();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x ** 2 + d * (1 - v + Math.log(v))) return d * v;
  }
}

// ─── Core scheduler functions ─────────────────────────────────────────────────

/**
 * Get or create publisher config for a user.
 * Seeds with evidence-based priors (IG best practice: Tue-Fri, 9am–3pm, 6pm–9pm).
 */
export async function getOrCreateConfig(
  supabase: SupabaseClient,
  userId: string
): Promise<PostingConfig> {
  const { data: existing } = await supabase
    .from('instagram_publisher_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) return existing as PostingConfig;

  const { data: created } = await supabase
    .from('instagram_publisher_config')
    .insert({ user_id: userId })
    .select()
    .single();

  // Seed the model with IG best-practice priors
  await seedPriors(supabase, userId);

  return created as PostingConfig;
}

/**
 * Seed the posting model with Instagram best-practice priors.
 * High-engagement slots get alpha=2.5 (optimistic), low-engagement get alpha=1.0.
 */
export async function seedPriors(supabase: SupabaseClient, userId: string) {
  // Evidence-based high-engagement windows (UTC adjusted for US audience):
  // Mon-Fri: 9am-11am, 1pm-3pm, 7pm-9pm (roughly UTC 14-16, 18-20, 00-02)
  const highEngagementSlots = new Set([
    // Weekdays 9-11am EST = 14-16 UTC
    '1:14', '1:15', '2:14', '2:15', '3:14', '3:15', '4:14', '4:15', '5:14', '5:15',
    // Weekdays 1-3pm EST = 18-20 UTC
    '1:18', '1:19', '2:18', '2:19', '3:18', '3:19', '4:18', '4:19', '5:18', '5:19',
    // Weekdays 7-9pm EST = 00-02 UTC next day
    '2:0', '2:1', '3:0', '3:1', '4:0', '4:1', '5:0', '5:1',
    // Weekend afternoons
    '0:16', '0:17', '6:16', '6:17',
  ]);

  const rows = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isHigh = highEngagementSlots.has(`${day}:${hour}`);
      rows.push({
        user_id: userId,
        day_of_week: day,
        hour_of_day: hour,
        alpha: isHigh ? 2.5 : 1.0,
        beta_param: 1.0,
      });
    }
  }

  // Upsert only if not already exists
  await supabase
    .from('instagram_posting_model')
    .upsert(rows, { onConflict: 'user_id,hour_of_day,day_of_week', ignoreDuplicates: true });
}

/**
 * Use Thompson Sampling to pick the best next posting slot.
 * Respects quiet hours and minimum gap between posts.
 */
export async function pickNextSlot(
  supabase: SupabaseClient,
  userId: string,
  config: PostingConfig,
  fromTime: Date = new Date()
): Promise<ScheduledSlot | null> {
  const { data: modelRows } = await supabase
    .from('instagram_posting_model')
    .select('*')
    .eq('user_id', userId);

  if (!modelRows || modelRows.length === 0) {
    await seedPriors(supabase, userId);
    return pickNextSlot(supabase, userId, config, fromTime);
  }

  const slots = modelRows as SlotModel[];

  // Sample from each slot's Beta distribution
  const candidates: Array<{ slot: SlotModel; sample: number; nextOccurrence: Date }> = [];

  for (const slot of slots) {
    const sample = sampleBeta(slot.alpha, slot.beta_param);
    const nextOccurrence = nextSlotOccurrence(slot.hour_of_day, slot.day_of_week, fromTime, config);
    if (nextOccurrence) {
      candidates.push({ slot, sample, nextOccurrence });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by Thompson sample (highest = most likely to be good)
  // Among slots within the next 48h, pick the best
  const within48h = candidates.filter(
    c => c.nextOccurrence.getTime() - fromTime.getTime() < 48 * 3600 * 1000
  );

  const pool = within48h.length > 0 ? within48h : candidates;
  pool.sort((a, b) => b.sample - a.sample);

  const best = pool[0];
  return {
    hour_of_day: best.slot.hour_of_day,
    day_of_week: best.slot.day_of_week,
    scheduled_at: best.nextOccurrence,
    expected_engagement: best.slot.avg_engagement,
  };
}

/**
 * Find the next calendar occurrence of a given (hour, day_of_week) slot.
 * Skips quiet hours.
 */
function nextSlotOccurrence(
  hour: number,
  targetDay: number,
  from: Date,
  config: PostingConfig
): Date | null {
  // Is this hour in quiet hours?
  const { quiet_start_hour: qs, quiet_end_hour: qe } = config;
  const isQuiet = qs > qe
    ? (hour >= qs || hour < qe)   // overnight quiet window (e.g. 23→6)
    : (hour >= qs && hour < qe);  // same-day window
  if (isQuiet) return null;

  // Find the next occurrence of targetDay at `hour` UTC
  const candidate = new Date(from);
  candidate.setUTCMinutes(0, 0, 0);
  candidate.setUTCHours(hour);

  // Advance to the right day of week
  const currentDay = candidate.getUTCDay();
  let daysAhead = (targetDay - currentDay + 7) % 7;
  // If it's today but in the past (or < 15 min ahead), move to next week
  if (daysAhead === 0 && candidate.getTime() <= from.getTime() + 15 * 60 * 1000) {
    daysAhead = 7;
  }
  candidate.setUTCDate(candidate.getUTCDate() + daysAhead);

  return candidate;
}

/**
 * Determine if we should post now based on the current target frequency.
 * Returns true if the gap since last post meets the target cadence.
 */
export function shouldPostNow(config: PostingConfig): boolean {
  if (!config.enabled) return false;
  if (!config.last_posted_at) return true;

  const hoursSinceLast =
    (Date.now() - new Date(config.last_posted_at).getTime()) / 3600000;
  const targetGapHours = 24 / config.current_target;

  // Allow posting if we're within ±20% of the target gap
  return hoursSinceLast >= targetGapHours * 0.8;
}

/**
 * Update the Beta distribution for a slot after a post is made and metrics are in.
 * Also updates the frequency target based on rolling engagement.
 */
export async function updateModel(
  supabase: SupabaseClient,
  userId: string,
  hour: number,
  day: number,
  engagementScore: number,
  config: PostingConfig
): Promise<void> {
  const isSuccess = engagementScore >= config.engagement_threshold;

  // Update Beta parameters
  const { data: existing } = await supabase
    .from('instagram_posting_model')
    .select('alpha, beta_param, posts_in_slot, avg_engagement')
    .eq('user_id', userId)
    .eq('hour_of_day', hour)
    .eq('day_of_week', day)
    .single();

  if (existing) {
    const newAlpha = existing.alpha + (isSuccess ? 1 : 0);
    const newBeta = existing.beta_param + (isSuccess ? 0 : 1);
    const n = existing.posts_in_slot + 1;
    // EWMA for average engagement
    const newAvg = existing.avg_engagement * (n - 1) / n + engagementScore / n;

    await supabase
      .from('instagram_posting_model')
      .update({
        alpha: newAlpha,
        beta_param: newBeta,
        posts_in_slot: n,
        avg_engagement: newAvg,
        last_posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('hour_of_day', hour)
      .eq('day_of_week', day);
  }

  // Update frequency target via EWMA
  const lr = config.learning_rate;
  const targetEngagement = config.engagement_threshold * 1.5; // stretch goal
  const performanceRatio = engagementScore / targetEngagement;
  // If engagement is high → increase frequency; if low → reduce
  const newTarget = Math.max(
    config.min_posts_per_day,
    Math.min(
      config.max_posts_per_day,
      config.current_target * (1 - lr) + config.current_target * performanceRatio * lr
    )
  );

  await supabase
    .from('instagram_publisher_config')
    .update({
      current_target: newTarget,
      avg_engagement_7d:
        config.avg_engagement_7d * 0.9 + engagementScore * 0.1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Return a summary of the model for a user — best slots, current target, etc.
 */
export async function getModelSummary(supabase: SupabaseClient, userId: string) {
  const [{ data: config }, { data: topSlots }] = await Promise.all([
    supabase
      .from('instagram_publisher_config')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('instagram_posting_model')
      .select('hour_of_day, day_of_week, alpha, beta_param, posts_in_slot, avg_engagement')
      .eq('user_id', userId)
      .order('avg_engagement', { ascending: false })
      .limit(10),
  ]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return {
    config,
    top_slots: (topSlots ?? []).map((s: SlotModel) => ({
      label: `${days[s.day_of_week]} ${s.hour_of_day}:00 UTC`,
      expected_engagement: s.avg_engagement,
      posts_sampled: s.posts_in_slot,
      confidence: s.alpha / (s.alpha + s.beta_param),
    })),
  };
}
