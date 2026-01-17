import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /api/me/plan-recommendation
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  try {
    const url = new URL(req.url);
    const variant = (url.searchParams.get('variant') || 'baseline').toLowerCase();

    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('paywall_insights_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('window', '30d')
      .maybeSingle();
    if (error) return serverError(error.message, req);

    const row = data || {} as any;
    const composeRuns = row.compose_runs_used || 0;
    const voiceMin = Number(row.voice_minutes_used || 0);
    const messagesSent = row.messages_sent || 0;

    // Variant-based caps
    const caps =
      variant === 'growth'
        ? { compose_runs: 40, voice_minutes: 20, messages: 150 }
        : variant === 'roi'
        ? { compose_runs: 60, voice_minutes: 45, messages: 180 }
        : { compose_runs: 50, voice_minutes: 30, messages: 200 };
    const overages = {
      compose_runs: Math.max(0, composeRuns - caps.compose_runs),
      voice_minutes: Math.max(0, Math.ceil(voiceMin - caps.voice_minutes)),
      messages: Math.max(0, messagesSent - caps.messages)
    };

    let suggested_plan = 'starter';
    const anyOver = overages.compose_runs > 0 || overages.voice_minutes > 0 || overages.messages > 0;
    if (anyOver) suggested_plan = 'pro';
    // ROI variant nudges upgrade if ROI/time-saved is high even if caps not exceeded
    if (variant === 'roi') {
      const timeSaved = Number(row.time_saved_minutes || 0);
      if (timeSaved >= 120 && (composeRuns >= 30 || messagesSent >= 120)) {
        suggested_plan = 'pro';
      }
    }

    const rationale: string[] = [];
    if (overages.compose_runs > 0) rationale.push(`High drafting volume: ${composeRuns} in 30d (cap ${caps.compose_runs}).`);
    if (overages.voice_minutes > 0) rationale.push(`Voice minutes: ${voiceMin.toFixed(0)} in 30d (cap ${caps.voice_minutes}).`);
    if (overages.messages > 0) rationale.push(`Messages sent: ${messagesSent} in 30d (cap ${caps.messages}).`);
    if (variant === 'roi') {
      const timeSaved = Number(row.time_saved_minutes || 0);
      if (timeSaved >= 120) rationale.push(`High ROI: ~${timeSaved.toFixed(0)} minutes saved in 30d.`);
    }
    if (rationale.length === 0) rationale.push('You are within Starter limits — upgrade for shared templates and advanced insights.');

    const projected_overage = overages;

    return ok({ variant, suggested_plan, rationale, projected_overage }, req);
  } catch (e: any) {
    return badRequest(e?.message || 'invalid_query', req);
  }
}
