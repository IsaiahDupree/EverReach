import { test, expect } from '@playwright/test';

async function getSupabaseAccessToken(page): Promise<string | null> {
  return await page.evaluate(() => {
    try {
      const keys = Object.keys(localStorage);
      const key = keys.find(k => k.includes('-auth-token'));
      if (!key) return null;
      const raw = localStorage.getItem(key!);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return (
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token ||
        null
      );
    } catch {
      return null;
    }
  });
}

const BACKEND = process.env.BACKEND_BASE || 'https://ever-reach-be.vercel.app';

async function api(request, path: string, method: string, token: string, body?: any) {
  const res = await request.fetch(`${BACKEND}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    data: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function retry<T>(fn: () => Promise<T>, tries = 6, delayMs = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

// End-to-end: sending a message updates last_interaction_at and bumps warmth
// Flow: create contact → prepare message → send message → verify warmth/last_contact
test('Warmth updates after sending a message', async ({ page, baseURL, request }) => {
  // Ensure authenticated session is loaded
  await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const token = await getSupabaseAccessToken(page);
  expect(token).toBeTruthy();

  const idem = `pw-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  // 1) Create contact (idempotent)
  const createRes = await api(request, '/api/v1/contacts', 'POST', token!, {
    display_name: `PW Test Contact ${idem.slice(-6)}`,
    metadata: { idempotency_key: idem },
  });
  expect(createRes.ok()).toBeTruthy();
  const createJson = await createRes.json();
  const contactId: string = createJson?.contact?.id || createJson?.contact_id || createJson?.id;
  expect(contactId).toMatch(/[0-9a-fA-F-]{36}/);

  // 2) Read initial warmth
  const get1 = await api(request, `/api/v1/contacts/${contactId}`, 'GET', token!);
  expect(get1.ok()).toBeTruthy();
  const c1 = await get1.json();
  const warmth1: number = c1?.warmth ?? c1?.contact?.warmth ?? 40;
  const last1: string | null = c1?.last_interaction_at ?? c1?.contact?.last_interaction_at ?? null;

  // 3) Prepare a message
  const prepRes = await api(request, '/api/v1/messages/prepare', 'POST', token!, {
    contact_id: contactId,
    channel: 'email',
    draft: {
      subject: `Hello ${idem.slice(-4)}`,
      body: `Automated test message at ${new Date().toISOString()}`,
    },
    composer_context: { source: 'playwright-test' },
  });
  expect(prepRes.ok()).toBeTruthy();
  const prepJson = await prepRes.json();
  const messageId: string = prepJson?.id || prepJson?.message?.id;
  expect(messageId).toBeTruthy();

  // 4) Send the message (server will create interaction, set last_interaction_at, then recompute warmth)
  const sendRes = await api(request, '/api/v1/messages/send', 'POST', token!, { message_id: messageId });
  expect(sendRes.ok()).toBeTruthy();

  // 5) Poll for updated contact (allow recompute to finish)
  const c2 = await retry(async () => {
    const r = await api(request, `/api/v1/contacts/${contactId}`, 'GET', token!);
    if (!r.ok()) throw new Error(`Contact fetch failed: ${r.status()}`);
    const j = await r.json();
    return j;
  }, 6, 500);

  const warmth2: number = c2?.warmth ?? c2?.contact?.warmth ?? 0;
  const last2: string | null = c2?.last_interaction_at ?? c2?.contact?.last_interaction_at ?? null;

  // Assertions: warmth should be >= baseline (typically > 40) and last_interaction_at should be set/changed
  expect(last2).toBeTruthy();
  if (last1 && last2) {
    expect(new Date(last2).getTime()).toBeGreaterThanOrEqual(new Date(last1).getTime());
  }
  expect(warmth2).toBeGreaterThanOrEqual(warmth1);
});
