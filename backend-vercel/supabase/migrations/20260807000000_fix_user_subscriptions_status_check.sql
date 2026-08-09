-- ============================================================================
-- Fix: user_subscriptions.status CHECK constraint rejects legal statuses
-- Migration: 20260807000000
-- ============================================================================
--
-- 20251026172100_revenuecat_subscriptions.sql created user_subscriptions.status
-- with CHECK (status IN ('trial','active','canceled','expired','refunded')).
--
-- But the actual app-store/play linking flow (lib/receipt-validation.ts
-- normalizeSubscriptionStatus, used by /api/v1/link/apple and
-- /api/v1/link/google) and the App Store S2S webhook
-- (app/api/webhooks/app-store/route.ts) write 'trialing', 'in_grace', and
-- 'billing_issue' into this column — none of which were legal values. Every
-- INSERT/UPDATE with one of those statuses throws a CHECK violation, so a
-- user still in their free trial (or in a billing grace period) gets a bare
-- 500 when linking their purchase or when Apple sends a DID_FAIL_TO_RENEW
-- notification.
--
-- This is also the documented/intended vocabulary: see
-- docs/SUBSCRIPTION_CANCELLATION_SYSTEM.md ("status
-- (trialing|active|in_grace|canceled|expired)") and
-- app/api/v1/billing/cancel/route.ts, which already queries
-- `.in('status', ['trialing', 'active', 'in_grace'])` against this exact
-- column. migrations/subscription_cancellation_system.sql attempted to widen
-- the constraint via `ADD COLUMN IF NOT EXISTS status TEXT CHECK (...)`, but
-- because `status` already existed, Postgres silently skips that entire
-- column-clause (CHECK included) as a no-op — the original narrow
-- constraint stayed authoritative. This migration replaces it explicitly.
--
-- 'trial' and 'refunded' are kept for backward compatibility with any
-- existing rows written under the original narrow vocabulary.

ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_status_check
  CHECK (status IN (
    'trial', 'trialing', 'active', 'in_grace', 'paused',
    'canceled', 'expired', 'refunded', 'billing_issue'
  ));
