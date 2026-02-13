/**
 * Centralized cron job authentication.
 * 
 * Usage in cron route handlers:
 *   import { verifyCron } from '@/lib/cron-auth';
 *   const authError = verifyCron(req);
 *   if (authError) return authError;
 * 
 * Checks: Authorization: Bearer <CRON_SECRET>
 * Fails closed: if CRON_SECRET is not set, rejects the request.
 */

import { NextResponse } from 'next/server';

export function verifyCron(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron Auth] CRON_SECRET env var is not set — rejecting request');
    return NextResponse.json(
      { error: 'Server misconfigured: CRON_SECRET not set' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron Auth] Unauthorized cron attempt:', {
      path: req.url,
      hasAuth: !!authHeader,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Auth passed
  return null;
}
