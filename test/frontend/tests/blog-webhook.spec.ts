import { test, expect } from '@playwright/test';
import { getApiBase } from '../utils/env';
import crypto from 'crypto';

test.describe('Blog Webhook & tRPC API', () => {
  test('webhook endpoint exists and rejects unsigned requests', async ({ request, baseURL }) => {
    const apiBase = getApiBase(baseURL as any) || 'https://ever-reach-be.vercel.app';

    const response = await request.post(`${apiBase}/api/webhooks/authority-os`, {
      headers: { 'Content-Type': 'application/json' },
      data: { event: 'blog.published', data: { title: 'Test' } },
    });

    // Should reject: no valid signature
    expect([401, 500]).toContain(response.status());
  });

  test('webhook endpoint rejects invalid signature', async ({ request, baseURL }) => {
    const apiBase = getApiBase(baseURL as any) || 'https://ever-reach-be.vercel.app';

    const response = await request.post(`${apiBase}/api/webhooks/authority-os`, {
      headers: {
        'Content-Type': 'application/json',
        'X-AOS-Signature': 'sha256=invalid',
        'X-AOS-Timestamp': String(Math.floor(Date.now() / 1000)),
      },
      data: { event: 'blog.published', data: { title: 'Test' } },
    });

    expect(response.status()).toBe(401);
  });

  test('webhook endpoint rejects expired timestamp', async ({ request, baseURL }) => {
    const apiBase = getApiBase(baseURL as any) || 'https://ever-reach-be.vercel.app';

    // Timestamp from 10 minutes ago (beyond 5 min threshold)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;

    const response = await request.post(`${apiBase}/api/webhooks/authority-os`, {
      headers: {
        'Content-Type': 'application/json',
        'X-AOS-Signature': 'sha256=somesig',
        'X-AOS-Timestamp': String(oldTimestamp),
      },
      data: { event: 'blog.published', data: { title: 'Test' } },
    });

    expect(response.status()).toBe(401);
  });

  test('webhook OPTIONS returns CORS headers', async ({ request, baseURL }) => {
    const apiBase = getApiBase(baseURL as any) || 'https://ever-reach-be.vercel.app';

    const response = await request.fetch(`${apiBase}/api/webhooks/authority-os`, {
      method: 'OPTIONS',
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['access-control-allow-methods']).toContain('POST');
  });

  test('blog list tRPC endpoint responds', async ({ request, baseURL }) => {
    const apiBase = getApiBase(baseURL as any) || 'https://ever-reach-be.vercel.app';

    // tRPC batch call for blog.list
    const response = await request.get(`${apiBase}/api/trpc/blog.list`, {
      params: {
        input: JSON.stringify({ json: { limit: 5, offset: 0 } }),
      },
    });

    // Should return 200 (even if empty) or 401 if auth required
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toBeDefined();
    }
  });

  test('blog categories tRPC endpoint responds', async ({ request, baseURL }) => {
    const apiBase = getApiBase(baseURL as any) || 'https://ever-reach-be.vercel.app';

    const response = await request.get(`${apiBase}/api/trpc/blog.categories`, {
      params: {
        input: JSON.stringify({ json: {} }),
      },
    });

    expect([200, 401]).toContain(response.status());
  });

  test('health endpoint still works', async ({ request, baseURL }) => {
    const apiBase = getApiBase(baseURL as any) || 'https://ever-reach-be.vercel.app';

    const response = await request.get(`${apiBase}/api/health`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});
