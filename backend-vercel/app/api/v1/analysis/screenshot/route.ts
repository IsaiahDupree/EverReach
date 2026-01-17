import { options, ok, badRequest, serverError, created } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { screenshotAnalysisCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/analysis/screenshot
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = screenshotAnalysisCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('screenshot_analyses')
      .insert([{ owner_user_id: user.id, contact_id: parsed.data.contact_id ?? null, file_url: parsed.data.file_url, status: 'pending', ocr_text: null, inferred_goal_id: null, inferred_goal_text: null, variables: {}, confidence: null }])
      .select('id, status')
      .single();
    if (error) return serverError(error.message, req);
    return created({ analysis_id: data.id, status: data.status }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
