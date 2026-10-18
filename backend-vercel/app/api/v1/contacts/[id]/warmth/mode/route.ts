import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { applyModeSwitchNoJump, warmthScoreFromAnchor, type WarmthMode } from "@/lib/warmth-ewma";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// PATCH /v1/contacts/:id/warmth/mode - Switch warmth mode
export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const body = await req.json();
    const { mode } = body;

    // Validate mode
    const validModes: WarmthMode[] = ['slow', 'medium', 'fast', 'test'];
    if (!mode || !validModes.includes(mode)) {
      return badRequest(`Invalid mode. Must be one of: ${validModes.join(', ')}`, req);
    }

    const supabase = getClientOrThrow(req);

    // Get current contact state with anchor columns
    const { data: contact, error: fetchErr } = await supabase
      .from('contacts')
      .select('id, warmth, warmth_mode, warmth_band, warmth_anchor_score, warmth_anchor_at')
      .eq('id', params.id)
      .maybeSingle();

    if (fetchErr) return serverError(fetchErr.message, req);
    if (!contact) return badRequest('Contact not found', req);

    // Calculate current score from anchor (not cached warmth)
    const scoreBefore = contact.warmth_anchor_score && contact.warmth_anchor_at
      ? warmthScoreFromAnchor(
          contact.warmth_anchor_score,
          contact.warmth_anchor_at,
          contact.warmth_mode || 'medium'
        )
      : (contact.warmth || 0);
    const modeBefore = contact.warmth_mode || 'medium';

    // If already in this mode, return early (no-op)
    if (modeBefore === mode) {
      return ok({
        contact_id: params.id,
        mode_before: modeBefore,
        mode_after: mode,
        score_before: scoreBefore,
        score_after: scoreBefore,
        band_after: contact.warmth_band || 'cold',
        changed_at: new Date().toISOString(),
        message: `Already in ${mode} mode. No change needed.`,
      }, req);
    }

    // Apply mode switch with NO SCORE JUMP using anchor model
    // This re-anchors to current score with new decay rate
    const updated = applyModeSwitchNoJump(
      {
        warmth_mode: (contact.warmth_mode || 'medium') as WarmthMode,
        warmth_anchor_score: contact.warmth_anchor_score || scoreBefore,
        warmth_anchor_at: contact.warmth_anchor_at || new Date().toISOString(),
      },
      mode as WarmthMode
    );

    // Update contact with new anchor (score stays same, decay rate changes)
    const { error: updateErr } = await supabase
      .from('contacts')
      .update(updated)
      .eq('id', params.id);

    if (updateErr) return serverError(updateErr.message, req);

    // Log mode change
    await supabase
      .from('warmth_mode_changes')
      .insert({
        contact_id: params.id,
        user_id: user.id,
        from_mode: modeBefore,
        to_mode: mode,
        score_before: scoreBefore,
        score_after: updated.warmth, // Score stays the same!
      });

    return ok({
      contact_id: params.id,
      mode_before: modeBefore,
      mode_after: mode,
      score_before: scoreBefore,
      score_after: updated.warmth,
      band_after: updated.warmth_band,
      changed_at: updated.warmth_anchor_at,
      message: `Mode changed to ${mode}. Score unchanged: ${updated.warmth}. Future decay rate adjusted.`,
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// GET /v1/contacts/:id/warmth/mode - Get warmth mode info
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const supabase = getClientOrThrow(req);

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('id, warmth, warmth_mode, warmth_band, last_interaction_at')
      .eq('id', params.id)
      .maybeSingle();

    if (error) return serverError("Internal server error", req);
    if (!contact) return badRequest('Contact not found', req);

    const mode: WarmthMode = (contact.warmth_mode as WarmthMode) || 'medium';

    return ok({
      contact_id: contact.id,
      current_mode: mode,
      current_score: contact.warmth || 0,
      current_band: contact.warmth_band || 'cold',
      last_interaction_at: contact.last_interaction_at,
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
