/**
 * APP-KIT: Webhook Security Utilities
 *
 * Production-hardened webhook verification for RevenueCat, Stripe, and generic webhooks.
 *
 * Principles:
 * 1. FAIL-CLOSED: Reject requests in production when secrets are not configured
 * 2. HMAC VERIFICATION: Verify webhook signatures before processing
 * 3. ERROR SANITIZATION: Never leak error.message to the caller
 * 4. IDEMPOTENCY: Log events before processing, skip duplicates
 *
 * ✅ KEEP: These patterns. Customize the specific webhook handlers for your providers.
 */

import { createHmac } from 'crypto';

// ============================================
// ✅ KEEP: HMAC Signature Verification
// ============================================

/**
 * Verify an HMAC-SHA256 signature from a webhook provider.
 * Used by RevenueCat, Stripe (with tweaks), and many others.
 */
export function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string,
  algorithm = 'sha256'
): boolean {
  if (!signature || !secret) return false;

  try {
    const expected = createHmac(algorithm, secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;

    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

// ============================================
// ✅ KEEP: Fail-Closed Auth Middleware
// ============================================

interface WebhookAuthResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Verify a webhook request using both signature and Bearer token.
 * Fail-closed in production: rejects if neither secret is configured.
 *
 * @example
 * ```ts
 * const auth = verifyWebhookAuth({
 *   rawBody: await request.text(),
 *   signatureHeader: request.headers.get('x-revenuecat-signature'),
 *   authHeader: request.headers.get('authorization'),
 *   signatureSecret: process.env.REVENUECAT_WEBHOOK_SECRET,
 *   bearerToken: process.env.REVENUECAT_WEBHOOK_BEARER,
 * });
 * if (!auth.authorized) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export function verifyWebhookAuth(options: {
  rawBody: string;
  signatureHeader?: string | null;
  authHeader?: string | null;
  signatureSecret?: string;
  bearerToken?: string;
}): WebhookAuthResult {
  const { rawBody, signatureHeader, authHeader, signatureSecret, bearerToken } = options;

  const isDev =
    process.env.NODE_ENV === 'development' ||
    process.env.VERCEL_ENV === 'preview';

  // Check HMAC signature
  const isSignatureValid =
    signatureHeader && signatureSecret
      ? verifyHmacSignature(rawBody, signatureHeader, signatureSecret)
      : false;

  // Check Bearer token
  const isBearerValid =
    bearerToken && authHeader
      ? authHeader === `Bearer ${bearerToken}`
      : false;

  // If either passes, authorized
  if (isSignatureValid || isBearerValid) {
    return { authorized: true };
  }

  // In dev/preview, allow through with a warning
  if (isDev) {
    console.warn('[webhook] Auth skipped in development mode');
    return { authorized: true, reason: 'dev-mode-bypass' };
  }

  // Fail-closed in production
  if (!signatureSecret && !bearerToken) {
    return { authorized: false, reason: 'No webhook secrets configured' };
  }

  return { authorized: false, reason: 'Invalid signature or bearer token' };
}

// ============================================
// ✅ KEEP: Safe Error Response
// ============================================

/**
 * Return a sanitized error response. Never expose internal error messages.
 * Log the real error server-side for debugging.
 */
export function safeErrorResponse(
  error: unknown,
  publicMessage = 'Internal server error',
  status = 500
) {
  // Log the real error server-side
  console.error('[webhook-error]', error instanceof Error ? error.message : error);

  // Return generic message to caller
  return new Response(
    JSON.stringify({ error: publicMessage }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
