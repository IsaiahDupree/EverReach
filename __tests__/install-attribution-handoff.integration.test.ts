import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';

import {
  ContentAttributionController,
  type AttributionStorage,
  type AttributionTouch,
} from '@/lib/contentAttributionCore';
import {
  createInstallAttributionHandoff,
  installRecoveryCodeToTouchToken,
  touchTokenToInstallRecoveryCode,
} from '@/lib/installAttributionHandoffCore';

class InMemoryStorage implements AttributionStorage {
  private readonly records = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.records.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.records.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.records.delete(key);
  }
}

type RedeemResponse = {
  status: 'claimed' | 'idempotent_replay';
  touch: AttributionTouch;
};

function postRecovery(
  endpoint: string,
  recoveryCode: string,
  userId: string,
): Promise<RedeemResponse> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      recovery_code: recoveryCode,
      expected_user_id: userId,
    });
    const req = request(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer local-user:${userId}`,
        'content-length': Buffer.byteLength(body),
        'content-type': 'application/json',
      },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`Recovery failed with HTTP ${response.statusCode}`));
          return;
        }
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as RedeemResponse);
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

describe('deferred install attribution handoff', () => {
  const token = 'touch_3d594650-3434-4f9a-a9b1-472ef7fd7691';
  const touch: AttributionTouch = {
    actp_content_id: 'content_install_handoff',
    actp_published_id: 'instagram_post_install_handoff',
    actp_campaign_id: 'campaign_install_handoff',
    actp_offer_id: 'everreach_trial',
    actp_source_platform: 'instagram',
    actp_touch_token: token,
    captured_at: '2026-08-20T07:00:00.000Z',
    landing_page: 'https://www.everreach.app/landing',
    utm_source: 'instagram',
  };
  let server: Server;
  let endpoint: string;
  let redemptionCount = 0;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
          recovery_code: string;
          expected_user_id: string;
        };
        const authenticatedUser = req.headers.authorization?.replace('Bearer local-user:', '');
        const recoveredToken = installRecoveryCodeToTouchToken(body.recovery_code);
        if (req.method !== 'POST'
          || req.url !== '/api/v1/attribution/handoff/redeem'
          || authenticatedUser !== body.expected_user_id
          || recoveredToken !== token) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid_recovery' }));
          return;
        }
        redemptionCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'claimed', touch }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    endpoint = `http://127.0.0.1:${address.port}/api/v1/attribution/handoff/redeem`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  test('round-trips the complete opaque journey token', () => {
    const code = touchTokenToInstallRecoveryCode(token);
    expect(code).toBe('ER1-7NCMC-M1M6H-7SNAD-H8WQF-FZBPJ4');
    expect(code).toMatch(/^ER1-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(installRecoveryCodeToTouchToken(code!)).toBe(token);
    expect(installRecoveryCodeToTouchToken('ER1-NOT-A-VALID-CODE')).toBeNull();
  });

  test('restores the exact verified journey after install and redeems once', async () => {
    const storage = new InMemoryStorage();
    const attribution = new ContentAttributionController(
      storage,
      async () => ({ ok: true, status: 200 }),
    );
    const handoff = createInstallAttributionHandoff(
      storage,
      (code, userId) => postRecovery(endpoint, code, userId),
      (verifiedTouch) => attribution.acceptVerifiedTouch(verifiedTouch),
      (expectedToken) => attribution.reserveVerifiedToken(expectedToken),
    );
    const code = touchTokenToInstallRecoveryCode(token)!;
    const countBefore = redemptionCount;

    await expect(handoff.savePendingCode(code.toLowerCase())).resolves.toBe(code);
    await expect(handoff.redeemPending('2d41357a-e9db-47a7-8423-4e759be246a3'))
      .resolves.toMatchObject({ status: 'claimed', touch });
    await expect(handoff.redeemPending('2d41357a-e9db-47a7-8423-4e759be246a3'))
      .resolves.toMatchObject({ status: 'no_pending_code' });

    expect(redemptionCount - countBefore).toBe(1);
    expect(await handoff.getPendingCode()).toBeNull();
    expect(await attribution.getFirstTouch()).toEqual(touch);
    expect(await attribution.getLastTouch()).toEqual(touch);
  });

  test('rejects a response whose token differs from the entered recovery code', async () => {
    const storage = new InMemoryStorage();
    let applied = false;
    const handoff = createInstallAttributionHandoff(
      storage,
      async () => ({
        status: 'claimed',
        touch: {
          ...touch,
          actp_touch_token: 'touch_7df5f885-4dcc-4c87-9173-a4b272345016',
        },
      }),
      async () => { applied = true; },
      async () => () => undefined,
    );
    await handoff.savePendingCode(touchTokenToInstallRecoveryCode(token)!);
    await expect(handoff.redeemPending('ae8dc7ea-70b5-47ed-b704-6c308055eb96'))
      .rejects.toThrow('did not match');
    expect(applied).toBe(false);
  });

  test('rejects a conflicting verified local first touch before server redemption', async () => {
    const storage = new InMemoryStorage();
    const attribution = new ContentAttributionController(
      storage,
      async () => ({ ok: true, status: 200 }),
    );
    await attribution.acceptVerifiedTouch({
      ...touch,
      actp_content_id: 'different_content',
      actp_touch_token: 'touch_7df5f885-4dcc-4c87-9173-a4b272345016',
    });
    const handoff = createInstallAttributionHandoff(
      storage,
      (code, userId) => postRecovery(endpoint, code, userId),
      (verifiedTouch) => attribution.acceptVerifiedTouch(verifiedTouch),
      (expectedToken) => attribution.reserveVerifiedToken(expectedToken),
    );
    const countBefore = redemptionCount;
    await handoff.savePendingCode(touchTokenToInstallRecoveryCode(token)!);

    await expect(handoff.redeemPending('0fa1ea8f-b69c-4037-b91a-4983cb5727ea'))
      .rejects.toThrow('different verified first-touch');
    expect(redemptionCount).toBe(countBefore);
    expect(await handoff.getPendingCode()).not.toBeNull();
  });

  test('does not replay a redeemed code when the signed-in account changes', async () => {
    const storage = new InMemoryStorage();
    const attribution = new ContentAttributionController(
      storage,
      async () => ({ ok: true, status: 200 }),
    );
    const handoff = createInstallAttributionHandoff(
      storage,
      (code, userId) => postRecovery(endpoint, code, userId),
      (verifiedTouch) => attribution.acceptVerifiedTouch(verifiedTouch),
      (expectedToken) => attribution.reserveVerifiedToken(expectedToken),
    );
    const countBefore = redemptionCount;
    await handoff.savePendingCode(touchTokenToInstallRecoveryCode(token)!);
    await handoff.redeemPending('2d41357a-e9db-47a7-8423-4e759be246a3');

    await expect(handoff.redeemPending('6f07747a-1b5d-42c0-9cf5-5d087762ca5c'))
      .resolves.toMatchObject({ status: 'no_pending_code' });
    expect(redemptionCount - countBefore).toBe(1);
  });

  test('serializes a verified capture behind redemption', async () => {
    const storage = new InMemoryStorage();
    const laterToken = 'touch_a3711538-c0dc-4a97-a2da-4f907a1c494d';
    const attribution = new ContentAttributionController(
      storage,
      async () => ({ ok: true, status: 200 }),
      () => '2026-08-25T12:00:00.000Z',
      async () => laterToken,
    );
    let signalStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    let allowResponse: () => void = () => undefined;
    const responseAllowed = new Promise<void>((resolve) => { allowResponse = resolve; });
    const handoff = createInstallAttributionHandoff(
      storage,
      async (code, userId) => {
        signalStarted();
        await responseAllowed;
        return postRecovery(endpoint, code, userId);
      },
      (verifiedTouch) => attribution.acceptVerifiedTouch(verifiedTouch),
      (expectedToken) => attribution.reserveVerifiedToken(expectedToken),
    );
    await handoff.savePendingCode(touchTokenToInstallRecoveryCode(token)!);
    const redemption = handoff.redeemPending('2d41357a-e9db-47a7-8423-4e759be246a3');
    await started;
    let laterCaptureFinished = false;
    const laterCapture = attribution.captureUrl(
      'https://www.everreach.app/?actp_content_id=later_content&actp_published_id=later_post'
        + '&actp_campaign_id=later_campaign&actp_offer_id=later_offer'
        + '&actp_source_platform=youtube&actp_publication_claim=later_claim',
    );
    void laterCapture.finally(() => { laterCaptureFinished = true; });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(laterCaptureFinished).toBe(false);
    allowResponse();
    await expect(redemption).resolves.toMatchObject({ status: 'claimed' });
    await laterCapture;
    expect(await attribution.getFirstTouch()).toMatchObject({
      actp_touch_token: token,
      actp_content_id: touch.actp_content_id,
    });
    expect(await attribution.getLastTouch()).toMatchObject({
      actp_touch_token: laterToken,
      actp_content_id: 'later_content',
    });
  });
});
