/**
 * RevenueCat Webhook Endpoint (legacy path)
 * POST /api/v1/billing/revenuecat/webhook
 *
 * DEPRECATED: This route re-exports the canonical handler at /api/webhooks/revenuecat.
 * Both URLs remain active so existing RevenueCat dashboard config keeps working.
 * All logic, auth, idempotency, and DB updates live in the canonical handler.
 */

export { POST, OPTIONS } from '@/app/api/webhooks/revenuecat/route';
export { runtime } from '@/app/api/webhooks/revenuecat/route';
