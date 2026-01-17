import { options, ok, badRequest, serverError, created } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

const mergeSchema = z.object({
  into_id: z.string().uuid(),
  from_ids: z.array(z.string().uuid()).min(1),
});

// POST /v1/merge/contacts
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    const { error } = await supabase.rpc('merge_contacts', {
      into_id: parsed.data.into_id,
      from_ids: parsed.data.from_ids,
    } as any);
    if (error) return serverError(error.message, req);
    return ok({ merged_into: parsed.data.into_id, merged_from: parsed.data.from_ids }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
