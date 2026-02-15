import { getWarmthBand, warmthScoreFromAnchor, WarmthMode } from './warmth-ewma';

export function withCurrentWarmth(contact: any) {
  const anchorScore = contact.warmth_anchor_score ?? contact.warmth ?? 30;
  const anchorAt = contact.warmth_anchor_at ?? contact.last_interaction_at ?? contact.updated_at ?? new Date().toISOString();
  const modeInput: WarmthMode = contact.warmth_mode ?? 'medium';
  const warmth_score_current = warmthScoreFromAnchor(anchorScore, anchorAt, modeInput);

  return {
    ...contact,
    warmth_score_current,
    warmth_band: getWarmthBand(warmth_score_current),
    warmth_mode: contact.warmth_mode ?? null,
    warmth_anchor_score: anchorScore,
    warmth_anchor_at: new Date(anchorAt).toISOString(),
  };
}
