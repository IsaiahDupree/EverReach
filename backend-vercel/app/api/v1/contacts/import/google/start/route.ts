/**
 * POST /api/v1/contacts/import/google/start
 * Initiates Google OAuth flow for contacts import
 */

import { options, ok, serverError, unauthorized, buildCorsHeaders } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getGoogleAuthorizationUrl } from "@/lib/google-contacts";
import { createImportJob } from "@/lib/import-jobs";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  // Rate limit: 10 requests per minute
  const rl = checkRateLimit(`u:${user.id}:POST:/v1/contacts/import/google/start`, 10, 60_000);
  if (!rl.allowed) {
    const origin = req.headers.get('origin') ?? undefined;
    const res = new Response(JSON.stringify({ error: "rate_limited", retryAfter: rl.retryAfter }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) },
    });
    if (rl.retryAfter != null) res.headers.set('Retry-After', String(rl.retryAfter));
    return res;
  }

  try {
    // Generate random state for OAuth security
    const state = crypto.randomUUID();
    
    // Create import job in database
    const job = await createImportJob(req, user.id, 'google', state);
    
    // Generate Google OAuth URL
    const authorizationUrl = getGoogleAuthorizationUrl(state);
    
    console.log(`[GoogleImport] Created job ${job.id} for user ${user.id}`);
    
    return ok({
      job_id: job.id,
      authorization_url: authorizationUrl,
    }, req);
  } catch (error: any) {
    console.error('[GoogleImport] Start failed:', error);
    return serverError(error?.message || 'Failed to start import', req);
  }
}
