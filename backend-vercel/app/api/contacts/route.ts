import { buildCorsHeaders, created, ok, options } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { contactCreateSchema } from "@/lib/validation";

function getOrigin(req: Request) {
  return req.headers.get("origin") ?? undefined;
}

function getIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") || "unknown";
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

export async function GET(req: Request) {
  const origin = getOrigin(req);

  // Auth required
  const user = await getUser(req);
  if (!user) return jsonError(401, "unauthorized", "Missing or invalid access token", null, origin);

  // Rate limit (per-user, per-route)
  const rl = checkRateLimit(`u:${user.id}:GET:/contacts`, 60, 60_000);
  if (!rl.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests", { retryAfter: rl.retryAfter }, origin);
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  try {
    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get("limit") || "20");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
    const cursor = url.searchParams.get("cursor") || undefined; // ISO date string of created_at

    const supabase = getClientOrThrow(req);
    let query = supabase
      .from("contacts")
      .select("id, display_name, emails, phones, tags, created_at, updated_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (cursor) {
      // Return rows with created_at < cursor (strictly older)
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) {
      return jsonError(500, "db_select_failed", "Failed to load contacts", null, origin);
    }

    const items = data ?? [];
    const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;

    return ok({ items, limit, nextCursor }, req);
  } catch (err: any) {
    return jsonError(500, "unexpected", "Unexpected server error", null, origin);
  }
}

export async function POST(req: Request) {
  const origin = getOrigin(req);

  // Auth required
  const user = await getUser(req);
  if (!user) return jsonError(401, "unauthorized", "Missing or invalid access token", null, origin);

  // Rate limit (per-user, per-route)
  const rl = checkRateLimit(`u:${user.id}:POST:/contacts`, 30, 60_000);
  if (!rl.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests", { retryAfter: rl.retryAfter }, origin);
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  // Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON", null, origin);
  }
  const parsed = contactCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "validation_error", "Invalid request payload", parsed.error.flatten(), origin);
  }

  // Insert (RLS assigns ownership via trigger when user_id null)
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from("contacts")
      .insert([{ ...parsed.data }])
      .select("id, display_name, created_at")
      .single();

    if (error) {
      return jsonError(500, "db_insert_failed", "Failed to create contact", null, origin);
    }

    return created({ contact: data }, req);
  } catch (err: any) {
    return jsonError(500, "unexpected", "Unexpected server error", null, origin);
  }
}
