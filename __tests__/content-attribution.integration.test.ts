import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';

import {
  ContentAttributionController,
  attributionAnalyticsProperties,
  type AttributionIngestPayload,
  type AttributionStorage,
} from '@/lib/contentAttributionCore';

class InMemoryAttributionStorage implements AttributionStorage {
  private readonly records = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.records.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.records.set(key, value);
  }
}

function postJson(
  url: string,
  payload: AttributionIngestPayload,
  authenticatedUserId: string,
): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = request(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer local-user:${authenticatedUserId}`,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    }, (response) => {
      response.resume();
      response.on('end', () => resolve({
        ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300),
        status: response.statusCode ?? 0,
      }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

describe('content attribution integration', () => {
  let server: Server;
  let endpoint: string;
  const received: AttributionIngestPayload[] = [];

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as AttributionIngestPayload;
        const authenticatedUserId = req.headers.authorization?.replace('Bearer local-user:', '');
        if (req.url !== '/api/v1/attribution/ingest'
          || req.method !== 'POST'
          || authenticatedUserId !== payload.expected_user_id) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'identity_mismatch' }));
          return;
        }
        received.push(payload);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, attribution_subject_verified: true }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    endpoint = `http://127.0.0.1:${address.port}/api/v1/attribution/ingest`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  test('preserves immutable first touch, carries current lineage to auth, and persists once', async () => {
    const storage = new InMemoryAttributionStorage();
    const timestamps = [
      '2026-08-20T01:00:00.000Z',
      '2026-08-20T02:00:00.000Z',
    ];
    const controller = new ContentAttributionController(
      storage,
      (payload) => postJson(endpoint, payload, payload.expected_user_id),
      () => timestamps.shift() ?? '2026-08-20T03:00:00.000Z',
    );

    await controller.captureUrl(
      'https://www.everreach.app/?utm_source=instagram&utm_medium=organic_social&utm_campaign=creator-retention&utm_content=script_a11ef6047ae3ffc57f0c&actp_content_id=script_a11ef6047ae3ffc57f0c&actp_offer_id=everreach-trial',
      'https://www.instagram.com/',
    );
    await controller.captureUrl(
      'https://www.everreach.app/?utm_source=youtube&utm_medium=organic_social&utm_campaign=follow-up&utm_content=published_video_2&actp_content_id=content_2&actp_published_id=published_video_2',
      'https://www.youtube.com/',
    );

    const firstTouch = await controller.getFirstTouch();
    const lastTouch = await controller.getLastTouch();
    expect(firstTouch).toMatchObject({
      utm_source: 'instagram',
      utm_content: 'script_a11ef6047ae3ffc57f0c',
      actp_content_id: 'script_a11ef6047ae3ffc57f0c',
      actp_offer_id: 'everreach-trial',
      referrer: 'https://www.instagram.com/',
    });
    expect(lastTouch).toMatchObject({
      utm_source: 'youtube',
      utm_content: 'published_video_2',
      actp_content_id: 'content_2',
      actp_published_id: 'published_video_2',
    });

    const authDestination = await controller.buildDestination('/auth?isSignUp=true');
    const authUrl = new URL(authDestination, 'https://www.everreach.app');
    expect(authUrl.searchParams.get('isSignUp')).toBe('true');
    expect(authUrl.searchParams.get('utm_content')).toBe('published_video_2');
    expect(authUrl.searchParams.get('actp_content_id')).toBe('content_2');
    expect(authUrl.searchParams.get('actp_published_id')).toBe('published_video_2');

    const userId = '2a4fa1d7-65f9-45ca-b750-02b112b1df37';
    await expect(controller.persistFirstTouch(userId)).resolves.toMatchObject({ status: 'persisted' });
    await expect(controller.persistFirstTouch(userId)).resolves.toMatchObject({ status: 'already_persisted' });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      expected_user_id: userId,
      utm_source: 'instagram',
      utm_content: 'script_a11ef6047ae3ffc57f0c',
      actp_content_id: 'script_a11ef6047ae3ffc57f0c',
      landing_page: 'https://www.everreach.app/',
    });
  });

  test('rejects an attribution subject that differs from the authenticated identity', async () => {
    const storage = new InMemoryAttributionStorage();
    const controller = new ContentAttributionController(
      storage,
      (payload) => postJson(
        endpoint,
        payload,
        '63834faa-304f-407a-b3dc-cb90b65be796',
      ),
    );

    await controller.captureUrl(
      'https://www.everreach.app/?utm_content=script_a11ef6047ae3ffc57f0c&actp_content_id=script_a11ef6047ae3ffc57f0c',
    );

    await expect(
      controller.persistFirstTouch('a6251001-5ffb-48fb-81f8-b5c942d6779c'),
    ).rejects.toThrow('Attribution ingest failed with HTTP 400');
  });

  test('retains every supported content field in analytics properties', () => {
    const properties = attributionAnalyticsProperties({
      utm_source: 'instagram',
      utm_content: 'script_a11ef6047ae3ffc57f0c',
      actp_content_id: 'content_1',
      actp_published_id: 'published_1',
      actp_campaign_id: 'campaign_1',
      actp_narrative_id: 'narrative_1',
      actp_offer_id: 'offer_1',
      actp_series_id: 'series_1',
      actp_episode_id: 'episode_1',
      actp_experiment_id: 'experiment_1',
      actp_variant_id: 'variant_1',
      unrelated_property: 'excluded',
    });

    expect(properties).toEqual({
      utm_source: 'instagram',
      utm_content: 'script_a11ef6047ae3ffc57f0c',
      actp_content_id: 'content_1',
      actp_published_id: 'published_1',
      actp_campaign_id: 'campaign_1',
      actp_narrative_id: 'narrative_1',
      actp_offer_id: 'offer_1',
      actp_series_id: 'series_1',
      actp_episode_id: 'episode_1',
      actp_experiment_id: 'experiment_1',
      actp_variant_id: 'variant_1',
    });
  });
});
