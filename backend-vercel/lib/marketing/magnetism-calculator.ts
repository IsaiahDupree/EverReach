/**
 * Magnetism Index Calculator
 * 
 * Measures brand stickiness - how "magnetic" the product is for a user
 * Formula: (intent × 0.3) + (engagement × 0.25) + (reactivation × 0.2) + (email_ctr × 0.15) + (social_returns × 0.1)
 */

export interface MagnetismInputs {
  intent_score: number; // 0-100
  engagement_days_7d: number; // Days active in last 7 days (0-7)
  engagement_weeks_4w: number; // Weeks active in last 4 weeks (0-4)
  reactivation_count_30d: number; // Times user returned after 24h gap
  email_opens_30d: number;
  email_clicks_30d: number;
  email_sends_30d: number;
  social_returns_30d: number; // Times user returned from social media
  trial_started: boolean;
  purchase_completed: boolean;
}

export interface MagnetismResult {
  index: number; // 0-100
  band: 'cold' | 'cooling' | 'warm' | 'hot';
  risk_level: 'high_risk' | 'moderate' | 'good' | 'excellent';
  components: {
    intent: number;
    engagement: number;
    reactivation: number;
    email_ctr: number;
    social_returns: number;
  };
  recommendations: string[];
  churn_risk: number; // 0-100
}

/**
 * Calculate magnetism index
 */
export function calculateMagnetismIndex(inputs: MagnetismInputs): MagnetismResult {
  // Component 1: Intent (30%)
  const intentComponent = (inputs.intent_score / 100) * 30;

  // Component 2: Engagement (25%)
  const dau7 = (inputs.engagement_days_7d / 7) * 100;
  const wau4 = (inputs.engagement_weeks_4w / 4) * 100;
  const engagementScore = (dau7 * 0.6 + wau4 * 0.4);
  const engagementComponent = (engagementScore / 100) * 25;

  // Component 3: Reactivation (20%)
  const reactivationScore = Math.min(100, (inputs.reactivation_count_30d / 10) * 100);
  const reactivationComponent = (reactivationScore / 100) * 20;

  // Component 4: Email CTR (15%)
  const emailCTR = inputs.email_sends_30d > 0
    ? (inputs.email_clicks_30d / inputs.email_sends_30d) * 100
    : 0;
  const emailComponent = (Math.min(100, emailCTR) / 100) * 15;

  // Component 5: Social Returns (10%)
  const socialScore = Math.min(100, (inputs.social_returns_30d / 5) * 100);
  const socialComponent = (socialScore / 100) * 10;

  // Total magnetism index
  let magnetismIndex = intentComponent + engagementComponent + reactivationComponent + emailComponent + socialComponent;

  // Boosts for conversion milestones
  if (inputs.trial_started) magnetismIndex += 5;
  if (inputs.purchase_completed) magnetismIndex += 10;

  // Cap at 100
  magnetismIndex = Math.min(100, magnetismIndex);

  // Determine band
  const band = getMagnetismBand(magnetismIndex);
  const riskLevel = getRiskLevel(magnetismIndex);

  // Calculate churn risk (inverse of magnetism)
  const churnRisk = calculateChurnRisk(magnetismIndex, inputs);

  // Generate recommendations
  const recommendations = generateRecommendations(magnetismIndex, inputs, band);

  return {
    index: Math.round(magnetismIndex),
    band,
    risk_level: riskLevel,
    components: {
      intent: Math.round(intentComponent),
      engagement: Math.round(engagementComponent),
      reactivation: Math.round(reactivationComponent),
      email_ctr: Math.round(emailComponent),
      social_returns: Math.round(socialComponent)
    },
    recommendations,
    churn_risk: Math.round(churnRisk)
  };
}

/**
 * Determine magnetism band
 */
function getMagnetismBand(index: number): 'cold' | 'cooling' | 'warm' | 'hot' {
  if (index < 30) return 'cold';
  if (index < 50) return 'cooling';
  if (index < 70) return 'warm';
  return 'hot';
}

/**
 * Determine risk level
 */
function getRiskLevel(index: number): 'high_risk' | 'moderate' | 'good' | 'excellent' {
  if (index < 30) return 'high_risk';
  if (index < 50) return 'moderate';
  if (index < 70) return 'good';
  return 'excellent';
}

/**
 * Calculate churn risk
 */
function calculateChurnRisk(magnetismIndex: number, inputs: MagnetismInputs): number {
  // Base churn risk (inverse of magnetism)
  let churnRisk = 100 - magnetismIndex;

  // Adjust based on engagement pattern
  if (inputs.engagement_days_7d === 0) {
    churnRisk += 20; // No engagement in 7 days = high risk
  }

  if (inputs.reactivation_count_30d === 0) {
    churnRisk += 10; // No returns = higher risk
  }

  // Email engagement is protective
  if (inputs.email_clicks_30d > 0) {
    churnRisk -= 5;
  }

  // Trial/purchase reduces churn risk
  if (inputs.trial_started) churnRisk -= 10;
  if (inputs.purchase_completed) churnRisk -= 20;

  // Cap between 0 and 100
  return Math.max(0, Math.min(100, churnRisk));
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(
  magnetismIndex: number,
  inputs: MagnetismInputs,
  band: string
): string[] {
  const recommendations: string[] = [];

  // Band-specific recommendations
  if (band === 'cold') {
    recommendations.push('🚨 URGENT: User showing signs of churn. Send re-engagement campaign immediately.');
    recommendations.push('Consider win-back offer or personalized outreach from team.');
  } else if (band === 'cooling') {
    recommendations.push('⚠️ User engagement declining. Schedule check-in or trigger nurture sequence.');
    recommendations.push('Identify friction points and address proactively.');
  }

  // Engagement-specific
  if (inputs.engagement_days_7d < 2) {
    recommendations.push('Increase engagement: Send personalized notification highlighting new features.');
  }

  // Email-specific
  if (inputs.email_sends_30d > 0 && inputs.email_clicks_30d === 0) {
    recommendations.push('Email engagement low. Test different subject lines or send time optimization.');
  }

  // Reactivation-specific
  if (inputs.reactivation_count_30d < 3) {
    recommendations.push('Build habit formation: Send weekly value reminders or tips.');
  }

  // Trial/purchase opportunities
  if (!inputs.trial_started && magnetismIndex > 50) {
    recommendations.push('User highly engaged but not in trial. Trigger trial offer.');
  }

  if (inputs.trial_started && !inputs.purchase_completed && magnetismIndex > 60) {
    recommendations.push('Trial user with high magnetism. Send conversion campaign.');
  }

  // Positive reinforcement
  if (band === 'hot') {
    recommendations.push('✅ User highly engaged! Consider upsell or referral program invitation.');
  }

  return recommendations;
}

/**
 * Calculate magnetism trend over time
 */
export function calculateMagnetismTrend(
  current: number,
  previous: number
): {
  direction: 'up' | 'down' | 'stable';
  change: number;
  percentage_change: number;
  velocity: 'accelerating' | 'steady' | 'decelerating';
} {
  const change = current - previous;
  const percentageChange = previous > 0 ? (change / previous) * 100 : 0;

  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(change) < 5) {
    direction = 'stable';
  } else if (change > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  // Determine velocity based on magnitude of change
  let velocity: 'accelerating' | 'steady' | 'decelerating';
  if (Math.abs(percentageChange) > 20) {
    velocity = 'accelerating';
  } else if (Math.abs(percentageChange) < 5) {
    velocity = 'decelerating';
  } else {
    velocity = 'steady';
  }

  return {
    direction,
    change: Math.round(change),
    percentage_change: Math.round(percentageChange),
    velocity
  };
}

/**
 * Predict magnetism in N days based on current trajectory
 */
export function predictMagnetism(
  historicalScores: Array<{ date: string; score: number }>,
  daysAhead: number
): {
  predicted_score: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
} {
  if (historicalScores.length < 3) {
    return {
      predicted_score: historicalScores[historicalScores.length - 1]?.score || 0,
      confidence: 0.3,
      trend: 'stable'
    };
  }

  // Simple linear regression
  const n = historicalScores.length;
  const dates = historicalScores.map((s, i) => i);
  const scores = historicalScores.map(s => s.score);

  const sumX = dates.reduce((a, b) => a + b, 0);
  const sumY = scores.reduce((a, b) => a + b, 0);
  const sumXY = dates.reduce((sum, x, i) => sum + x * scores[i], 0);
  const sumX2 = dates.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict
  const predictedScore = Math.max(0, Math.min(100, slope * (n + daysAhead - 1) + intercept));

  // Confidence based on R²
  const meanY = sumY / n;
  const ssTotal = scores.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const ssResidual = scores.reduce((sum, y, i) => {
    const predicted = slope * i + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  const rSquared = 1 - (ssResidual / ssTotal);
  const confidence = Math.max(0.1, Math.min(0.9, rSquared));

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining';
  if (Math.abs(slope) < 0.5) {
    trend = 'stable';
  } else if (slope > 0) {
    trend = 'improving';
  } else {
    trend = 'declining';
  }

  return {
    predicted_score: Math.round(predictedScore),
    confidence: Math.round(confidence * 100) / 100,
    trend
  };
}

/**
 * Compare user magnetism to cohort average
 */
export function compareToCohort(
  userScore: number,
  cohortScores: number[]
): {
  percentile: number;
  above_average: boolean;
  cohort_average: number;
  difference: number;
} {
  if (cohortScores.length === 0) {
    return {
      percentile: 50,
      above_average: false,
      cohort_average: 0,
      difference: 0
    };
  }

  const cohortAverage = cohortScores.reduce((a, b) => a + b, 0) / cohortScores.length;
  const sorted = [...cohortScores].sort((a, b) => a - b);
  const rank = sorted.filter(s => s <= userScore).length;
  const percentile = (rank / sorted.length) * 100;

  return {
    percentile: Math.round(percentile),
    above_average: userScore > cohortAverage,
    cohort_average: Math.round(cohortAverage),
    difference: Math.round(userScore - cohortAverage)
  };
}
