/**
 * App Store Webhook (legacy /api/webhooks/app-store) Tests
 *
 * Covers app/api/webhooks/app-store/route.ts -- previously had ZERO test
 * coverage despite being the entry point that decides whether to trust an
 * inbound Apple App Store Server Notification. The handler must:
 *  1. Reject (401 invalid_signature) any request whose signedTransactionInfo
 *     JWS does not verify -- this is the only thing standing between "Apple
 *     told us this happened" and "an attacker's HTTP client told us this
 *     happened". A regression here (e.g. decoding the JWT without verifying
 *     it) must be caught by a test, not shipped silently.
 *  2. Only update `user_subscriptions` after verification succeeds, using
 *     the correct status for each Apple notificationType.
 */

// Jest globals are available without import (see jest.config.js)

jest.mock('jose', () => ({
  compactVerify: jest.fn(),
  createRemoteJWKSet: jest.fn(() => ({})),
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseServiceClient: jest.fn(),
}));

jest.mock('@/lib/receipt-validation', () => ({
  normalizeSubscriptionStatus: jest.fn((s: string) => s),
}));

import { compactVerify } from 'jose';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { POST } from '@/app/api/webhooks/app-store/route';

const mockCompactVerify = compactVerify as jest.Mock;
const mockGetSupabaseServiceClient = getSupabaseServiceClient as jest.Mock;

function makeSupabaseStub(existingSub: any) {
  const updateEqMock = jest.fn(() => Promise.resolve({ data: null, error: null }));
  const updateMock = jest.fn(() => ({ eq: updateEqMock }));
  const rpcMock = jest.fn(() => Promise.resolve({ data: null, error: null }));
  const client = {
    from: jest.fn((table: string) => {
      if (table !== 'user_subscriptions') throw new Error(`Unexpected table: ${table}`);
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: existingSub, error: null })),
            })),
          })),
        })),
        update: updateMock,
      };
    }),
    rpc: rpcMock,
    __updateMock: updateMock,
    __updateEqMock: updateEqMock,
    __rpcMock: rpcMock,
  };
  return client;
}

function fakeVerifiedPayloadBytes(payload: any): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

async function postWebhook(body: unknown) {
  const req = new Request('http://localhost/api/webhooks/app-store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as any);
}

describe('POST /api/webhooks/app-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects (401) when the transaction JWS fails signature verification, and never touches the DB', async () => {
    mockCompactVerify.mockRejectedValueOnce(new Error('signature invalid'));
    const supabaseStub = makeSupabaseStub(null);
    mockGetSupabaseServiceClient.mockReturnValue(supabaseStub);

    const res = await postWebhook({
      notificationType: 'DID_RENEW',
      data: {
        bundleId: 'com.everreach.app',
        environment: 'Production',
        signedTransactionInfo: 'header.payload.sig',
      },
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('invalid_signature');
    expect(mockCompactVerify).toHaveBeenCalledWith('header.payload.sig', expect.anything());
    // Unverified payloads must never reach the subscriptions table.
    expect(supabaseStub.from).not.toHaveBeenCalled();
  });

  it('processes a verified DID_RENEW notification and marks the subscription active', async () => {
    const transactionInfo = {
      originalTransactionId: 'orig-tx-1',
      productId: 'pro_monthly',
      expiresDate: String(Date.now() + 1_000_000),
    };
    mockCompactVerify.mockResolvedValueOnce({ payload: fakeVerifiedPayloadBytes(transactionInfo) });

    const existingSub = { id: 'sub-1', user_id: 'user-1', status: 'billing_issue' };
    const supabaseStub = makeSupabaseStub(existingSub);
    mockGetSupabaseServiceClient.mockReturnValue(supabaseStub);

    const res = await postWebhook({
      notificationType: 'DID_RENEW',
      data: {
        bundleId: 'com.everreach.app',
        environment: 'Production',
        signedTransactionInfo: 'header.payload.sig',
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(supabaseStub.__updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    );
    expect(supabaseStub.__updateEqMock).toHaveBeenCalledWith('id', 'sub-1');
  });

  it('processes a verified REFUND notification and marks the subscription canceled, not active', async () => {
    const transactionInfo = {
      originalTransactionId: 'orig-tx-2',
      productId: 'pro_monthly',
      expiresDate: String(Date.now() + 1_000_000),
    };
    mockCompactVerify.mockResolvedValueOnce({ payload: fakeVerifiedPayloadBytes(transactionInfo) });

    const existingSub = { id: 'sub-2', user_id: 'user-2', status: 'active' };
    const supabaseStub = makeSupabaseStub(existingSub);
    mockGetSupabaseServiceClient.mockReturnValue(supabaseStub);

    const res = await postWebhook({
      notificationType: 'REFUND',
      data: {
        bundleId: 'com.everreach.app',
        environment: 'Production',
        signedTransactionInfo: 'header.payload.sig',
      },
    });

    expect(res.status).toBe(200);
    const updateArg = supabaseStub.__updateMock.mock.calls[0][0];
    expect(updateArg.status).toBe('canceled');
    expect(updateArg.status).not.toBe('active');
  });

  it('returns a warning without updating any row when the subscription cannot be found', async () => {
    const transactionInfo = {
      originalTransactionId: 'unknown-tx',
      productId: 'pro_monthly',
      expiresDate: String(Date.now() + 1_000_000),
    };
    mockCompactVerify.mockResolvedValueOnce({ payload: fakeVerifiedPayloadBytes(transactionInfo) });

    const supabaseStub = makeSupabaseStub(null);
    mockGetSupabaseServiceClient.mockReturnValue(supabaseStub);

    const res = await postWebhook({
      notificationType: 'DID_RENEW',
      data: {
        bundleId: 'com.everreach.app',
        environment: 'Production',
        signedTransactionInfo: 'header.payload.sig',
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.warning).toBe('subscription_not_found');
    expect(supabaseStub.__updateMock).not.toHaveBeenCalled();
  });
});
