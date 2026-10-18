/**
 * Intent Score Calculator
 * 
 * Calculates user intent score (0-100) based on behavioral signals
 * Used for lead qualification and persona assignment
 */

export interface IntentSignal {
  type: 'page_view' | 'feature_click' | 'time_on_site' | 'time_on_site_per_min' | 'return_visit' | 
        'email_open' | 'email_click' | 'video_watch' | 'download' | 
        'pricing_view' | 'comparison_view' | 'trial_start';
  weight: number;
  occurred_at: Date;
  metadata?: Record<string, any>;
}

export interface IntentWeights {
  page_view: number;
  feature_click: number;
  time_on_site: number;
  time_on_site_per_min: number;
  return_visit: number;
  email_open: number;
  email_click: number;
  video_watch: number;
  download: number;
  pricing_view: number;
  comparison_view: number;
  trial_start: number;
}

export interface IntentScoreResult {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'very_high';
  signals_count: number;
  top_signals: IntentSignal[];
  recency_bonus: number;
  frequency_bonus: number;
  breakdown: {
    engagement: number;
    purchase_intent: number;
    recency: number;
    frequency: number;
  };
}

/**
 * Default intent weights (calibrated for B2B SaaS)
 */
export const DEFAULT_INTENT_WEIGHTS: IntentWeights = {
  page_view: 1,
  feature_click: 3,
  time_on_site: 2,
  time_on_site_per_min: 2,
  return_visit: 5,
  email_open: 2,
  email_click: 4,
  video_watch: 6,
  download: 8,
  pricing_view: 12,
  comparison_view: 10,
  trial_start: 25
};

/**
 * Calculate intent score from signals
 */
export function calculateIntentScore(
  signals: IntentSignal[],
  weights: IntentWeights = DEFAULT_INTENT_WEIGHTS
): IntentScoreResult {
  if (signals.length === 0) {
    return {
      score: 0,
      level: 'low',
      signals_count: 0,
      top_signals: [],
      recency_bonus: 0,
      frequency_bonus: 0,
      breakdown: {
        engagement: 0,
        purchase_intent: 0,
        recency: 0,
        frequency: 0
      }
    };
  }

  // Calculate base score
  let baseScore = 0;
  let engagementScore = 0;
  let purchaseIntentScore = 0;

  for (const signal of signals) {
    const weight = weights[signal.type] || 0;
    baseScore += weight;

    // Categorize signals
    if (['page_view', 'feature_click', 'time_on_site_per_min', 'email_open'].includes(signal.type)) {
      engagementScore += weight;
    }
    if (['pricing_view', 'comparison_view', 'trial_start', 'download'].includes(signal.type)) {
      purchaseIntentScore += weight;
    }
  }

  // Calculate recency bonus (decay over 30 days)
  const now = new Date();
  const recencyScores = signals.map(signal => {
    const ageInDays = (now.getTime() - signal.occurred_at.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 10 - (ageInDays / 3)); // Max 10 points, decays to 0 over 30 days
  });
  const recencyBonus = Math.max(...recencyScores, 0);

  // Calculate frequency bonus (more signals = higher intent)
  const frequencyBonus = Math.min(15, Math.log2(signals.length) * 5);

  // Total score (cap at 100)
  const totalScore = Math.min(100, baseScore + recencyBonus + frequencyBonus);

  // Determine intent level
  const level = getIntentLevel(totalScore);

  // Get top 5 signals by weight
  const topSignals = [...signals]
    .sort((a, b) => (weights[b.type] || 0) - (weights[a.type] || 0))
    .slice(0, 5);

  return {
    score: Math.round(totalScore),
    level,
    signals_count: signals.length,
    top_signals: topSignals,
    recency_bonus: Math.round(recencyBonus),
    frequency_bonus: Math.round(frequencyBonus),
    breakdown: {
      engagement: Math.round(engagementScore),
      purchase_intent: Math.round(purchaseIntentScore),
      recency: Math.round(recencyBonus),
      frequency: Math.round(frequencyBonus)
    }
  };
}

/**
 * Determine intent level from score
 */
function getIntentLevel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
  if (score < 20) return 'low';
  if (score < 50) return 'medium';
  if (score < 75) return 'high';
  return 'very_high';
}

/**
 * Extract signals from event history
 */
export function extractIntentSignals(events: Array<{
  event_name: string;
  occurred_at: string;
  properties?: Record<string, any>;
}>): IntentSignal[] {
  const signals: IntentSignal[] = [];

  for (const event of events) {
    const occurredAt = new Date(event.occurred_at);

    switch (event.event_name) {
      case 'screen_view':
      case 'landing_view':
        signals.push({
          type: 'page_view',
          weight: DEFAULT_INTENT_WEIGHTS.page_view,
          occurred_at: occurredAt,
          metadata: { screen: event.properties?.screen }
        });
        break;

      case 'feature_clicked':
      case 'cta_clicked':
        signals.push({
          type: 'feature_click',
          weight: DEFAULT_INTENT_WEIGHTS.feature_click,
          occurred_at: occurredAt,
          metadata: { feature: event.properties?.feature }
        });
        break;

      case 'app_open':
      case 'session_start':
        signals.push({
          type: 'return_visit',
          weight: DEFAULT_INTENT_WEIGHTS.return_visit,
          occurred_at: occurredAt
        });
        break;

      case 'email_opened':
        signals.push({
          type: 'email_open',
          weight: DEFAULT_INTENT_WEIGHTS.email_open,
          occurred_at: occurredAt,
          metadata: { campaign: event.properties?.campaign_id }
        });
        break;

      case 'email_clicked':
        signals.push({
          type: 'email_click',
          weight: DEFAULT_INTENT_WEIGHTS.email_click,
          occurred_at: occurredAt,
          metadata: { campaign: event.properties?.campaign_id }
        });
        break;

      case 'paywall_view':
        signals.push({
          type: 'pricing_view',
          weight: DEFAULT_INTENT_WEIGHTS.pricing_view,
          occurred_at: occurredAt,
          metadata: { plan: event.properties?.plan_shown }
        });
        break;

      case 'trial_started':
        signals.push({
          type: 'trial_start',
          weight: DEFAULT_INTENT_WEIGHTS.trial_start,
          occurred_at: occurredAt,
          metadata: { plan: event.properties?.plan }
        });
        break;

      // Add more event mappings as needed
    }

    // Time on site from session duration
    if (event.properties?.duration_minutes) {
      const minutes = event.properties.duration_minutes;
      signals.push({
        type: 'time_on_site_per_min',
        weight: DEFAULT_INTENT_WEIGHTS.time_on_site_per_min * minutes,
        occurred_at: occurredAt,
        metadata: { duration_minutes: minutes }
      });
    }
  }

  return signals;
}

/**
 * Recommend persona bucket based on intent score and signals
 */
export function recommendPersona(
  intentResult: IntentScoreResult,
  userContext?: {
    industry?: string;
    job_title?: string;
    company_size?: string;
  }
): {
  persona_slug: string;
  confidence: number;
  reasoning: string;
} {
  const { score, breakdown, top_signals } = intentResult;

  // High purchase intent + high engagement = Automation Pro
  if (breakdown.purchase_intent > 30 && breakdown.engagement > 20) {
    return {
      persona_slug: 'automation_pro',
      confidence: 0.85,
      reasoning: 'High purchase intent and engagement signals indicate power user potential'
    };
  }

  // High trial activity = Tech Entrepreneur
  if (top_signals.some(s => s.type === 'trial_start')) {
    return {
      persona_slug: 'tech_entrepreneur',
      confidence: 0.80,
      reasoning: 'Trial activation indicates proactive product evaluation'
    };
  }

  // High engagement but low purchase intent = Creative in Transition
  if (breakdown.engagement > 25 && breakdown.purchase_intent < 15) {
    return {
      persona_slug: 'creative_transition',
      confidence: 0.70,
      reasoning: 'High exploration with moderate urgency suggests research phase'
    };
  }

  // Corporate context = Corporate Executive
  if (userContext?.company_size && parseInt(userContext.company_size) > 500) {
    return {
      persona_slug: 'corporate_executive',
      confidence: 0.75,
      reasoning: 'Large company size indicates enterprise decision-making process'
    };
  }

  // Low score but consistent visits = Networking Enthusiast
  if (score < 40 && breakdown.frequency > 10) {
    return {
      persona_slug: 'networking_enthusiast',
      confidence: 0.65,
      reasoning: 'Consistent low-intensity engagement suggests casual interest'
    };
  }

  // Default to lowest confidence
  return {
    persona_slug: 'student_early_career',
    confidence: 0.50,
    reasoning: 'Limited signals, defaulting to entry-level persona'
  };
}

/**
 * Calculate intent trend (increasing, stable, decreasing)
 */
export function calculateIntentTrend(
  currentScore: number,
  previousScore: number
): {
  trend: 'increasing' | 'stable' | 'decreasing';
  change: number;
  percentage_change: number;
} {
  const change = currentScore - previousScore;
  const percentageChange = previousScore > 0 
    ? (change / previousScore) * 100 
    : 0;

  let trend: 'increasing' | 'stable' | 'decreasing';
  if (Math.abs(change) < 5) {
    trend = 'stable';
  } else if (change > 0) {
    trend = 'increasing';
  } else {
    trend = 'decreasing';
  }

  return {
    trend,
    change: Math.round(change),
    percentage_change: Math.round(percentageChange)
  };
}
