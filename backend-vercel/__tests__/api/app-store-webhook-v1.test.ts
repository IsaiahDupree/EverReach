/**
 * App Store Webhook (v1 / ASN v2) Tests
 *
 * Covers app/api/v1/webhooks/app-store/route.ts -- previously had ZERO test
 * coverage despite two CRITICAL-class risks:
 *  1. The signed ASN payload must be signature-verified before any of its
 *     fields are trusted (an attacker POSTing an unsigned/invalid payload
 *     must be rejected, not processed).
 *  2. The notificationType -> subscription status mapping must NOT collapse
 *     lifecycle-ending events (REFUND/REVOKE/EXPIRED/GRACE_PERIOD_EXPIRED)
 *     into 'active' -- doing so would silently re-grant Pro entitlement on
 *     a refund/revoke.
 */

// Jest globals are available without import (see jest.config.js)

jest.mock('jose', () => ({
  compactVerify: jest.fn(),
  createRemoteJWKSet: jest.fn(() => ({})),
  decodeProtectedHeader: jest.fn(),
  importJWK: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('@/lib/entitlements', () => ({
  recomputeEntitlementsForUser: jest.fn(() => Promise.resolve()),
  getProductIdForStoreSku: jest.fn(() => Promise.resolve('pro_monthly')),
  insertSubscriptionSnapshot: jest.fn(() => Promise.resolve()),
}));

import { compactVerify } from 'jose';
import { getServiceClient } from '@/lib/supabase';
import { recomputeEntitlementsForUser, insertSubscriptionSnapshot } from '@/lib/entitlements';
import { POST } from '@/app/api/v1/webhooks/app-store/route';

const mockCompactVerify = compactVerify as jest.Mock;
const mockGetServiceClient = getServiceClient as jest.Mock;
const mockInsertSnapshot = insertSubscriptionSnapshot as jest.Mock;
const mockRecomputeEntitlements = recomputeEntitlementsForUser as jest.Mock;

// Build a syntactically-valid (unsigned) compact-JWS-shaped string whose
// middle segment base64url-decodes to `payload`. The route never verifies
// this *inner* transaction JWS itself (only the outer ASN envelope), so any
// well-formed 3-segment string is sufficient here.
function fakeJws(payload: any): string {
  const seg = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${seg}.sig`;
}

function makeSupabaseStub(userId: string | null) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: userId ? { user_id: userId } : null, error: null })),
            })),
          })),
        };
      }
      if (table === 'store_receipts') {
        return { insert: jest.fn(() => Promise.resolve({ data: null, error: null })) };
      }
      throw new Error(`Unexpected table in test stub: ${table}`);
    }),
  };
}

async function postWebhook(body: unknown) {
  const req = new Request('http://localhost/api/v1/webhooks/app-store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as any);
}

describe('POST /api/v1/webhooks/app-store', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' };
    delete process.env.APPLE_ASN_VERIFY; // defaults to verify-on
    mockGetServiceClient.mockReturnValue(makeSupabaseStub('user-123'));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects a payload that fails ASN signature verification', async () => {
    mockCompactVerify.mockRejectedValueOnce(new Error('signature mismatch'));

    const res = await postWebhook({ signedPayload: 'a.b.c' });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/Invalid Apple ASN signature/i);
    expect(mockCompactVerify).toHaveBeenCalled();
    // Must never reach entitlement recomputation on an unverified payload.
    expect(mockRecomputeEntitlements).not.toHaveBeenCalled();
    expect(mockInsertSnapshot).not.toHaveBeenCalled();
  });

  it('rejects a request missing signedPayload before any verification is attempted', async () => {
    const res = await postWebhook({ notificationType: 'REFUND' });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing signedPayload/i);
    expect(mockCompactVerify).not.toHaveBeenCalled();
  });

  it.each([
    ['REFUND', 'canceled'],
    ['REVOKE', 'canceled'],
    ['EXPIRED', 'expired'],
    ['GRACE_PERIOD_EXPIRED', 'expired'],
  ])(
    'regression guard: a verified %s notification must snapshot status=%s, never "active"',
    async (notificationType, expectedStatus) => {
      const tx = {
        productId: 'pro_monthly_v1',
        originalTransactionId: '1000000000000001',
        appAccountToken: 'app-account-token-abc',
        expiresDate: String(Date.now() + 1_000_000),
      };
      const outerPayload = {
        notificationType,
        data: { signedTransactionInfo: fakeJws(tx) },
      };
      mockCompactVerify.mockResolvedValueOnce({
        payload: new TextEncoder().encode(JSON.stringify(outerPayload)),
      });

      const res = await postWebhook({ signedPayload: 'a.b.c' });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.linked).toBe(true);
      expect(mockInsertSnapshot).toHaveBeenCalledTimes(1);
      const snapshotArg = mockInsertSnapshot.mock.calls[0][1];
      expect(snapshotArg.status).toBe(expectedStatus);
      expect(snapshotArg.status).not.toBe('active');
      expect(mockRecomputeEntitlements).toHaveBeenCalledWith(expect.anything(), 'user-123');
    }
  );

  it('a verified DID_RENEW notification (positive control) does snapshot status=active', async () => {
    const tx = {
      productId: 'pro_monthly_v1',
      originalTransactionId: '1000000000000002',
      appAccountToken: 'app-account-token-abc',
      expiresDate: String(Date.now() + 1_000_000),
    };
    const outerPayload = {
      notificationType: 'DID_RENEW',
      data: { signedTransactionInfo: fakeJws(tx) },
    };
    mockCompactVerify.mockResolvedValueOnce({
      payload: new TextEncoder().encode(JSON.stringify(outerPayload)),
    });

    const res = await postWebhook({ signedPayload: 'a.b.c' });
    expect(res.status).toBe(200);

    const snapshotArg = mockInsertSnapshot.mock.calls[0][1];
    expect(snapshotArg.status).toBe('active');
  });

  it('DID_FAIL_TO_RENEW in a grace period maps to "grace", not "active"', async () => {
    const tx = {
      productId: 'pro_monthly_v1',
      originalTransactionId: '1000000000000003',
      appAccountToken: 'app-account-token-abc',
      expiresDate: String(Date.now() + 1_000_000),
    };
    const outerPayload = {
      notificationType: 'DID_FAIL_TO_RENEW',
      subtype: 'GRACE_PERIOD',
      data: { signedTransactionInfo: fakeJws(tx) },
    };
    mockCompactVerify.mockResolvedValueOnce({
      payload: new TextEncoder().encode(JSON.stringify(outerPayload)),
    });

    const res = await postWebhook({ signedPayload: 'a.b.c' });
    expect(res.status).toBe(200);

    const snapshotArg = mockInsertSnapshot.mock.calls[0][1];
    expect(snapshotArg.status).toBe('grace');
    expect(snapshotArg.status).not.toBe('active');
  });
});
