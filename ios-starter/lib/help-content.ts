/**
 * Help Content Library
 * Feature: HO-HELP-002
 *
 * Centralized help content for warmth scores, bands, and contact pipeline.
 * Used by HelpOverlay and Tooltip components to provide contextual help.
 *
 * @module lib/help-content
 */

/**
 * Warmth Score detail item
 */
export interface WarmthScoreDetail {
  point: string;
  explanation: string;
}

/**
 * Warmth Score example item
 */
export interface WarmthScoreExample {
  score: number;
  description: string;
}

/**
 * Warmth Score help content
 */
export interface WarmthScoreHelp {
  title: string;
  description: string;
  details: WarmthScoreDetail[];
  examples: WarmthScoreExample[];
}

/**
 * Warmth Band definition
 */
export interface WarmthBand {
  level: number;
  name: string;
  description: string;
  scoreRange: string;
  color?: string;
}

/**
 * Warmth Bands help content
 */
export interface WarmthBandsHelp {
  title: string;
  description: string;
  bands: WarmthBand[];
}

/**
 * Pipeline Stage definition
 */
export interface PipelineStage {
  name: string;
  description: string;
  action: string;
}

/**
 * Contact Pipeline help content
 */
export interface ContactPipelineHelp {
  title: string;
  description: string;
  stages: PipelineStage[];
  bestPractices: string[];
}

/**
 * Subscription help content interface
 */
export interface SubscriptionHelp {
  title: string;
  description: string;
  tiers: Array<{
    name: string;
    description: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

/**
 * Profile help content interface
 */
export interface ProfileHelp {
  title: string;
  description: string;
  fields: Array<{
    name: string;
    description: string;
  }>;
  tips: string[];
}

/**
 * All help content structure
 */
export interface HelpContent {
  warmthScore: WarmthScoreHelp;
  warmthBands: WarmthBandsHelp;
  pipeline: ContactPipelineHelp;
  subscription: SubscriptionHelp;
  profile: ProfileHelp;
}

/**
 * Type for help content keys
 */
export type HelpContentKey = keyof HelpContent;

/**
 * Centralized help content
 */
export const HELP_CONTENT: HelpContent = {
  /**
   * Warmth Score Help Content
   */
  warmthScore: {
    title: 'Warmth Score',
    description:
      'Warmth Score measures the strength and recency of your relationship with a contact. It helps you identify which contacts need attention and which relationships are strong.',
    details: [
      {
        point: 'Score Range',
        explanation: 'Warmth scores range from 0 to 100, with higher scores indicating stronger, more active relationships.',
      },
      {
        point: 'Recency Factor',
        explanation: 'Recent interactions significantly boost warmth scores. The score decays over time without new contact.',
      },
      {
        point: 'Frequency Impact',
        explanation: 'Regular communication maintains higher warmth scores. Consistent touchpoints prevent relationship decay.',
      },
      {
        point: 'Interaction Quality',
        explanation: 'Different interaction types have varying impacts. In-person meetings and calls typically boost scores more than text messages.',
      },
    ],
    examples: [
      {
        score: 90,
        description: 'Close contact you spoke with this week - very warm relationship',
      },
      {
        score: 65,
        description: 'Regular contact you connect with monthly - warm relationship',
      },
      {
        score: 40,
        description: 'Contact you haven\'t reached out to in 3+ months - cooling down',
      },
      {
        score: 15,
        description: 'Distant contact with minimal recent interaction - cold relationship',
      },
    ],
  },

  /**
   * Warmth Bands Help Content
   */
  warmthBands: {
    title: 'Warmth Bands',
    description:
      'Warmth Bands categorize your contacts into groups based on relationship strength. This helps you prioritize who to reach out to and identify at-risk relationships.',
    bands: [
      {
        level: 4,
        name: 'Hot',
        description: 'Strong, active relationships. These are your most engaged contacts.',
        scoreRange: '75-100',
        color: '#ef4444', // red
      },
      {
        level: 3,
        name: 'Warm',
        description: 'Solid relationships with regular contact. Maintain these connections.',
        scoreRange: '50-74',
        color: '#f59e0b', // amber
      },
      {
        level: 2,
        name: 'Cool',
        description: 'Relationships that need attention. Reach out soon to prevent further cooling.',
        scoreRange: '25-49',
        color: '#3b82f6', // blue
      },
      {
        level: 1,
        name: 'Cold',
        description: 'Distant or dormant relationships. Consider rekindling these connections.',
        scoreRange: '0-24',
        color: '#6b7280', // gray
      },
    ],
  },

  /**
   * Contact Pipeline Help Content
   */
  pipeline: {
    title: 'Contact Pipeline',
    description:
      'The Contact Pipeline helps you systematically nurture relationships. Move contacts through stages as you deepen the relationship and create opportunities.',
    stages: [
      {
        name: 'New',
        description: 'Recently added contacts you want to get to know better',
        action: 'Send initial outreach or introduction message',
      },
      {
        name: 'Reaching Out',
        description: 'Contacts you\'re actively trying to connect with',
        action: 'Schedule a call or meeting to establish relationship',
      },
      {
        name: 'Connected',
        description: 'Contacts with established relationships',
        action: 'Maintain regular touchpoints and provide value',
      },
      {
        name: 'Engaged',
        description: 'Active relationships with ongoing collaboration or mutual benefit',
        action: 'Deepen connection through shared projects or introductions',
      },
      {
        name: 'Partner',
        description: 'Strong, strategic relationships with significant mutual value',
        action: 'Collaborate closely and explore partnership opportunities',
      },
    ],
    bestPractices: [
      'Move contacts forward intentionally - each stage requires specific actions',
      'Don\'t skip stages - building genuine relationships takes time',
      'Review your pipeline weekly to identify who needs attention',
      'Combine pipeline stage with warmth score to prioritize outreach',
      'Not every contact needs to reach Partner stage - focus on quality over quantity',
      'Use notes to track what you discuss and what you learn about each person',
    ],
  },

  /**
   * Subscription Help Content
   */
  subscription: {
    title: 'Subscription & Pricing',
    description:
      'Choose the plan that best fits your needs. All plans include core features with increasing limits and capabilities.',
    tiers: [
      {
        name: 'Free',
        description: 'Perfect for getting started with limited items and basic features.',
      },
      {
        name: 'Basic',
        description: 'For casual users who need more items and standard features without ads.',
      },
      {
        name: 'Pro',
        description: 'Most popular choice with unlimited items, advanced features, and priority support.',
      },
      {
        name: 'Premium',
        description: 'For power users who need API access, white-label options, and dedicated support.',
      },
    ],
    faqs: [
      {
        question: 'Can I change my plan later?',
        answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.',
      },
      {
        question: 'How do I cancel my subscription?',
        answer: 'Cancel anytime in your App Store settings. You\'ll retain access until the end of your billing period.',
      },
      {
        question: 'Will I be charged right away?',
        answer: 'Your payment method will be charged when you confirm your subscription. Renewals happen automatically.',
      },
      {
        question: 'What happens if I downgrade?',
        answer: 'Your data is safe! If you exceed the new plan\'s limits, older items will be archived until you upgrade again.',
      },
    ],
  },

  /**
   * Profile Help Content
   */
  profile: {
    title: 'Your Profile',
    description:
      'Customize your profile information and settings. Your profile helps personalize your experience across the app.',
    fields: [
      {
        name: 'Display Name',
        description: 'The name shown throughout the app. Make it recognizable to others if you share content.',
      },
      {
        name: 'Avatar',
        description: 'Your profile picture. Upload a photo from your device to personalize your account.',
      },
      {
        name: 'Email',
        description: 'Your account email cannot be changed here. Contact support if you need to update it.',
      },
    ],
    tips: [
      'Use a clear, recent photo for your avatar',
      'Keep your display name professional if using for work',
      'Your email is used for login and important notifications',
      'Changes save automatically when you tap the Save button',
    ],
  },
};

/**
 * Get help content by key
 *
 * @param key - The help content key to retrieve
 * @returns The help content object, or null if key is invalid
 *
 * @example
 * ```typescript
 * const warmthHelp = getHelpContent('warmthScore');
 * if (warmthHelp) {
 *   console.log(warmthHelp.title); // "Warmth Score"
 * }
 * ```
 */
export function getHelpContent(
  key: string
): WarmthScoreHelp | WarmthBandsHelp | ContactPipelineHelp | SubscriptionHelp | ProfileHelp | null {
  if (key in HELP_CONTENT) {
    return HELP_CONTENT[key as HelpContentKey];
  }
  return null;
}

/**
 * Get warmth band by score
 *
 * @param score - The warmth score (0-100)
 * @returns The warmth band object
 *
 * @example
 * ```typescript
 * const band = getWarmthBandByScore(85);
 * console.log(band.name); // "Hot"
 * ```
 */
export function getWarmthBandByScore(score: number): WarmthBand {
  const bands = HELP_CONTENT.warmthBands.bands;

  if (score >= 75) return bands[0]; // Hot
  if (score >= 50) return bands[1]; // Warm
  if (score >= 25) return bands[2]; // Cool
  return bands[3]; // Cold
}

/**
 * Get pipeline stage by name
 *
 * @param stageName - The stage name to find
 * @returns The pipeline stage object, or null if not found
 *
 * @example
 * ```typescript
 * const stage = getPipelineStageByName('Connected');
 * console.log(stage?.action); // "Maintain regular touchpoints..."
 * ```
 */
export function getPipelineStageByName(stageName: string): PipelineStage | null {
  const stage = HELP_CONTENT.pipeline.stages.find(
    (s) => s.name.toLowerCase() === stageName.toLowerCase()
  );
  return stage || null;
}

