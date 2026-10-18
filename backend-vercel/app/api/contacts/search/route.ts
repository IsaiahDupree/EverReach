import { ok, options, buildCorsHeaders } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";

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

export async function GET(req: Request) {
  const origin = getOrigin(req);

  const user = await getUser(req);
  if (!user) return jsonError(401, "unauthorized", "Missing or invalid access token", null, origin);

  const rl = checkRateLimit(`u:${user.id}:GET:/contacts/search`, 60, 60_000);
  if (!rl.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests", { retryAfter: rl.retryAfter }, origin);
    res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
    return res;
  }

  try {
    const url = new URL(req.url);
    const rawQuery = (url.searchParams.get("q") || "").trim();
    const limitParam = Number(url.searchParams.get("limit") || "10");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;

    if (!rawQuery) return jsonError(400, "missing_q", "Query parameter 'q' is required", null, origin);

    // Sanitize input: remove potentially malicious SQL characters
    // Allow alphanumeric, spaces, hyphens, underscores, and basic punctuation only
    const sanitizedQuery = rawQuery.replace(/[^\w\s\-@.,']/g, '').trim();

    if (!sanitizedQuery) {
      return jsonError(400, "invalid_query", "Query contains invalid characters", null, origin);
    }

    const supabase = getClientOrThrow(req);

    // Use sanitized query for full-text search
    // textSearch is parameterized by Supabase client, preventing SQL injection
    const { data, error } = await supabase
      .from("contacts")
      .select("id, display_name, emails, phones, company, tags, updated_at")
      .textSearch("search_tsv", sanitizedQuery, { type: "websearch" })
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Don't expose internal error details to prevent information leakage
      console.error('[Search Error]', error);
      return jsonError(500, "db_search_failed", "Unable to complete search", null, origin);
    }

    return ok({ items: data ?? [], limit, q: sanitizedQuery }, req);
  } catch (err: any) {
    // Log but don't expose sensitive error details
    console.error('[Search Exception]', err);
    return jsonError(500, "unexpected", "An error occurred while processing your request", null, origin);
  }
}
