import { jwtVerify, decodeProtectedHeader, decodeJwt } from 'jose';
import crypto from 'crypto';

export type User = { id: string } | null;

const enc = new TextEncoder();

export async function getUser(req: Request): Promise<User> {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error('[auth] SUPABASE_JWT_SECRET not set');
    return null;
  }

  // Fast-path reject non-HS256 tokens (e.g., Google ID tokens are RS256)
  try {
    const header = decodeProtectedHeader(token);
    if (header?.alg && header.alg !== 'HS256') {
      let iss: string | undefined;
      try { iss = decodeJwt(token)?.iss as string | undefined; } catch {}
      console.warn(`[auth] unsupported token alg=${header.alg}${iss ? ` iss=${iss}` : ''} — expected HS256 Supabase access token`);
      return null;
    }
  } catch {
    // If header can't be decoded, fall through to verification which will fail
  }

  try {
    const { payload } = await jwtVerify(token, enc.encode(secret), {
      algorithms: ['HS256'],
      audience: 'authenticated',
      // Optionally enforce issuer if desired:
      // issuer: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1` : undefined,
    });
    const sub = payload?.sub;
    if (!sub || typeof sub !== 'string') return null;
    return { id: sub };
  } catch (e: any) {
    console.error('[auth] jwt verify failed:', e?.message);
    return null;
  }
}

/**
 * Verify cron job authentication.
 * All cron endpoints must call this to prevent unauthorized access.
 *
 * FAIL-CLOSED: Throws 401 error if verification fails.
 *
 * Setup:
 * 1. Set CRON_SECRET in environment variables
 * 2. Configure Vercel cron jobs to send Authorization: Bearer {CRON_SECRET}
 *
 * @throws Response with status 401 if verification fails
 *
 * @example
 * ```ts
 * export async function GET(req: Request) {
 *   verifyCron(req); // Throws if invalid
 *   // ... cron job logic
 * }
 * ```
 */
export function verifyCron(req: Request): void {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[auth] CRON_SECRET not configured');
    throw new Response('Server configuration error', { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');

  if (!authHeader) {
    console.warn('[auth] Cron request missing Authorization header');
    throw new Response('Unauthorized', { status: 401 });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    console.warn('[auth] Cron request has invalid Authorization format');
    throw new Response('Unauthorized', { status: 401 });
  }

  if (token !== cronSecret) {
    console.warn('[auth] Cron request has invalid secret');
    throw new Response('Unauthorized', { status: 401 });
  }

  // Verification passed
}

/**
 * Verify webhook signature.
 * Use this for external webhooks (Stripe, RevenueCat, etc.) that sign their requests.
 *
 * FAIL-CLOSED: Throws 401 error if verification fails.
 *
 * @param req - Request object
 * @param expectedSecret - Webhook secret to verify against
 * @param signatureHeader - Name of signature header (default: 'x-webhook-signature')
 * @param algorithm - HMAC algorithm (default: 'sha256')
 *
 * @throws Response with status 401 if verification fails
 *
 * @example
 * ```ts
 * export async function POST(req: Request) {
 *   const secret = process.env.REVENUECAT_WEBHOOK_SECRET!;
 *   await verifyWebhook(req, secret, 'x-revenuecat-signature');
 *   // ... webhook logic
 * }
 * ```
 */
export async function verifyWebhook(
  req: Request,
  expectedSecret: string,
  signatureHeader: string = 'x-webhook-signature',
  algorithm: 'sha256' | 'sha1' = 'sha256'
): Promise<void> {
  if (!expectedSecret) {
    console.error('[auth] Webhook secret not provided');
    throw new Response('Server configuration error', { status: 500 });
  }

  const signature = req.headers.get(signatureHeader);

  if (!signature) {
    console.warn(`[auth] Webhook missing ${signatureHeader} header`);
    throw new Response('Unauthorized', { status: 401 });
  }

  // Clone request to read body (can only read once)
  const body = await req.text();

  // Compute HMAC signature
  const hmac = crypto.createHmac(algorithm, expectedSecret);
  hmac.update(body);
  const computedSignature = hmac.digest('hex');

  // Compare signatures (constant-time comparison to prevent timing attacks)
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );

  if (!isValid) {
    console.warn('[auth] Webhook signature verification failed');
    throw new Response('Unauthorized', { status: 401 });
  }

  // Verification passed
}

/**
 * Simple secret verification for webhooks that don't use signatures.
 * Checks if a bearer token or secret header matches expected value.
 *
 * FAIL-CLOSED: Throws 401 error if verification fails.
 *
 * @param req - Request object
 * @param expectedSecret - Expected secret value
 * @param headerName - Header name to check (default: 'authorization')
 *
 * @throws Response with status 401 if verification fails
 */
export function verifyWebhookSecret(
  req: Request,
  expectedSecret: string,
  headerName: string = 'authorization'
): void {
  if (!expectedSecret) {
    console.error('[auth] Webhook secret not configured');
    throw new Response('Server configuration error', { status: 500 });
  }

  const header = req.headers.get(headerName);

  if (!header) {
    console.warn(`[auth] Webhook missing ${headerName} header`);
    throw new Response('Unauthorized', { status: 401 });
  }

  // Support both "Bearer {secret}" and plain secret
  const secret = header.startsWith('Bearer ') ? header.slice(7) : header;

  if (secret !== expectedSecret) {
    console.warn('[auth] Webhook secret verification failed');
    throw new Response('Unauthorized', { status: 401 });
  }

  // Verification passed
}
