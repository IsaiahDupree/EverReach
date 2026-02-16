import { options, ok, badRequest, notFound, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { warmthScoreFromAnchor } from "@/lib/warmth-ewma";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

// Intentionally no recomputation helpers here. Mode changes must not alter the current warmth score.

// GET /api/v1/contacts/:id/warmth/mode
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getClientOrThrow(req);
  const contactId = params.id;

  try {
    const { data: contact, error } = await supabase
      .from("contacts")
      .select("id, warmth_mode, warmth, warmth_band, last_interaction_at, warmth_anchor_score, warmth_anchor_at")
      .eq("id", contactId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!contact) return notFound("Contact not found", req);

    return ok({
      contact_id: contact.id,
      current_mode: contact.warmth_mode ?? null,
      current_score: contact.warmth ?? null,
      current_band: contact.warmth_band ?? null,
      last_interaction_at: contact.last_interaction_at,
    }, req);
  } catch (error: any) {
    console.error("[GET warmth/mode] Error:", error);
    return serverError(error?.message || "Failed to get warmth mode", req);
  }
}

// PATCH /api/v1/contacts/:id/warmth/mode
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { mode?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid_json", req);
  }

  const newMode = body.mode;
  if (!newMode || !["slow", "medium", "fast", "test"].includes(newMode)) {
    return badRequest("Invalid mode. Must be one of: slow, medium, fast, test", req);
  }

  const supabase = getClientOrThrow(req);
  const contactId = params.id;

  try {
    // Get current contact data
    const { data: contact, error: fetchError } = await supabase
      .from("contacts")
      .select("id, warmth_mode, warmth, warmth_band, last_interaction_at, warmth_anchor_score, warmth_anchor_at")
      .eq("id", contactId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!contact) return notFound("Contact not found", req);

    const modeBefore = contact.warmth_mode ?? null;
    const scoreBefore = contact.warmth ?? null;

    // Preserve continuity: compute current score at change time using previous mode & anchor, and set anchor to now
    const anchorScore = (contact as any).warmth_anchor_score ?? contact.warmth ?? 0;
    const anchorAt = (contact as any).warmth_anchor_at ?? contact.last_interaction_at ?? new Date().toISOString();
    const prevMode = (contact.warmth_mode ?? 'medium') as any;
    const currentAtChange = warmthScoreFromAnchor(anchorScore, anchorAt, prevMode);

    // Update only mode + anchors; do not modify stored warmth or band
    const { error: updateError } = await supabase
      .from("contacts")
      .update({
        warmth_mode: newMode,
        warmth_anchor_score: currentAtChange,
        warmth_anchor_at: new Date().toISOString(),
        warmth_updated_at: new Date().toISOString(),
      })
      .eq("id", contactId);

    if (updateError) throw updateError;

    return ok({
      contact_id: contactId,
      mode_before: modeBefore,
      mode_after: newMode,
      score_before: scoreBefore,
      score_after: scoreBefore,
      band_after: contact.warmth_band ?? null,
      changed_at: new Date().toISOString(),
      message: modeBefore === newMode ? 'Already in this mode. No change needed.' : 'Mode updated. Score unchanged.',
    }, req);
  } catch (error: any) {
    console.error("[PATCH warmth/mode] Error:", error);
    return serverError(error?.message || "Failed to update warmth mode", req);
  }
}
