import { buildCorsHeaders, ok, options } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { contactUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

function getOrigin(req: Request) {
  return req.headers.get("origin") ?? undefined;
}

function jsonError(status: number, code: string, message: string, details: any, origin?: string) {
  return new Response(
    JSON.stringify({ error: { code, message, details } }),
    { status, headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) } }
  );
}

export function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const origin = getOrigin(req);
  const id = ctx.params.id;

  const user = await getUser(req);
  if (!user) return jsonError(401, "unauthorized", "Missing or invalid access token", null, origin);

  const rl = checkRateLimit(`u:${user.id}:GET:/contacts/${id}`, 120, 60_000);
  if (!rl.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests", { retryAfter: rl.retryAfter }, origin);
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from("contacts")
      .select("id, display_name, emails, phones, company, notes, tags, avatar_url, metadata, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error) return jsonError(500, "db_select_failed", "Failed to load contact", { hint: error.message }, origin);
    if (!data) return jsonError(404, "not_found", "Contact not found", null, origin);

    return ok({ contact: data }, req);
  } catch (err: any) {
    return jsonError(500, "unexpected", "Unexpected server error", { message: err?.message }, origin);
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const origin = getOrigin(req);
  const id = ctx.params.id;

  const user = await getUser(req);
  if (!user) return jsonError(401, "unauthorized", "Missing or invalid access token", null, origin);

  const rl = checkRateLimit(`u:${user.id}:PATCH:/contacts/${id}`, 60, 60_000);
  if (!rl.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests", { retryAfter: rl.retryAfter }, origin);
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON", null, origin);
  }
  const parsed = contactUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "validation_error", "Invalid request payload", parsed.error.flatten(), origin);

  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from("contacts")
      .update(parsed.data)
      .eq("id", id)
      .select("id, display_name, updated_at")
      .single();

    if (error) return jsonError(500, "db_update_failed", "Failed to update contact", { hint: error.message }, origin);
    if (!data) return jsonError(404, "not_found", "Contact not found", null, origin);

    return ok({ contact: data }, req);
  } catch (err: any) {
    return jsonError(500, "unexpected", "Unexpected server error", { message: err?.message }, origin);
  }
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const origin = getOrigin(req);
  const id = ctx.params.id;

  const user = await getUser(req);
  if (!user) return jsonError(401, "unauthorized", "Missing or invalid access token", null, origin);

  const rl = checkRateLimit(`u:${user.id}:DELETE:/contacts/${id}`, 30, 60_000);
  if (!rl.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests", { retryAfter: rl.retryAfter }, origin);
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) return jsonError(500, "db_delete_failed", "Failed to delete contact", { hint: error.message }, origin);
    if (!data) return jsonError(404, "not_found", "Contact not found", null, origin);

    return ok({ deleted: true, id: data.id }, req);
  } catch (err: any) {
    return jsonError(500, "unexpected", "Unexpected server error", { message: err?.message }, origin);
  }
}
