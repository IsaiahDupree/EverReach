/**
 * Warmth Calculation Constants and Utilities
 * 
 * Defines which interaction types affect warmth scoring.
 * Internal actions (notes, system events) should NOT affect warmth.
 */

/**
 * Interaction kinds that represent actual contact activity
 * and should affect warmth calculation.
 * 
 * DO NOT include internal actions like:
 * - 'note' (internal notes)
 * - 'screenshot_note' (screenshot analysis)
 * - 'pipeline_update' (stage changes)
 * - 'system' (automated events)
 */
export const WARMTH_INTERACTION_KINDS = [
  // Communication channels
  'email',
  'call',
  'sms',
  'meeting',
  'dm',
  
  // Social media
  'social',
  'linkedin',
  'twitter',
  'instagram',
  'facebook',
  
  // Messaging platforms
  'whatsapp',
  'telegram',
  'slack',
  
  // Other real interactions
  'video_call',
  'in_person',
] as const;

/**
 * Check if an interaction kind affects warmth
 */
export function affectsWarmth(kind: string): boolean {
  return (WARMTH_INTERACTION_KINDS as readonly string[]).includes(kind);
}

/**
 * Warmth calculation constants
 */
export const WARMTH_CONFIG = {
  BASE_SCORE: 40,
  MAX_RECENCY_BOOST: 25,
  MAX_FREQUENCY_BOOST: 15,
  CHANNEL_BREADTH_BONUS: 5,
  DECAY_START_DAYS: 7,
  DECAY_PER_DAY: 0.5,
  MAX_DECAY: 30,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  
  // Time windows
  RECENCY_WINDOW_DAYS: 90,
  FREQUENCY_WINDOW_DAYS: 90,
  CHANNEL_BREADTH_WINDOW_DAYS: 30,
  
  // Frequency caps
  MAX_FREQUENCY_INTERACTIONS: 6,
  MIN_CHANNEL_KINDS_FOR_BONUS: 2,
} as const;
