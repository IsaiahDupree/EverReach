/**
 * APP-KIT: Cron Route Authentication
 *
 * Verifies that cron requests come from Vercel's cron scheduler
 * (or your own cron service) by checking the CRON_SECRET header.
 *
 * Usage in any cron route:
 * ```ts
 * import { verifyCron } from '@/lib/cron-auth';
 *
 * export async function GET(request: Request) {
 *   const authError = verifyCron(request);
 *   if (authError) return authError;
 *   // ... your cron logic
 * }
 * ```
 *
 * Environment variable required: CRON_SECRET
 * Set in Vercel dashboard → Settings → Environment Variables
 *
 * In vercel.json:
 * ```json
 * { "crons": [{ "path": "/api/cron/daily-warmth", "schedule": "0 3 * * *" }] }
 * ```
 *
 * ✅ KEEP: This pattern for all cron routes.
 */

/**
 * Verify that a request comes from an authorized cron scheduler.
 * Returns a Response if unauthorized, null if authorized.
 */
export function verifyCron(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET;

  // Fail-closed: reject if CRON_SECRET is not configured in production
  if (!cronSecret && process.env.NODE_ENV === 'production') {
    console.error('[cron] CRON_SECRET not configured');
    return new Response(
      JSON.stringify({ error: 'Cron not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // In development, allow all cron requests
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  // Check the authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return null;
}
