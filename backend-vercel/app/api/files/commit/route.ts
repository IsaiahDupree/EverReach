import { created, options, badRequest, serverError, buildCorsHeaders } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { fileCommitSchema } from "@/lib/validation";

export const runtime = 'nodejs';

export async function OPTIONS(req: Request){ return options(req); }

export async function POST(req: Request){
  const origin = req.headers.get("origin") ?? undefined;

  // Require auth
  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
  }

  // Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON", req);
  }
  const parsed = fileCommitSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  const { path, mime_type, size_bytes, contact_id, message_id } = parsed.data;

  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('attachments')
      .insert([{ file_path: path, mime_type, size_bytes, contact_id, message_id }])
      .select('id, file_path, created_at')
      .single();

    if (error) return serverError("Internal server error", req);
    return created({ attachment: data }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}
