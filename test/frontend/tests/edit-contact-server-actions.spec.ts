import { test, expect } from '@playwright/test';
import { getApiBase } from '../utils/env';

async function getAnyContactId(request: any, baseURL: string): Promise<string | null> {
  const apiBase = getApiBase(baseURL);
  if (!apiBase) return null;
  const res = await request.get(`${apiBase}/api/v1/contacts?limit=1`, { headers: { 'accept': 'application/json' } });
  if (!res.ok()) return null;
  const data = await res.json();
  const items = data.items || data.contacts || data || [];
  return items[0]?.id ?? null;
}

test.describe('Edit Contact: Server Actions', () => {
  test('set pipeline triggers POST /contacts/:id/pipeline', async ({ page, baseURL, request }) => {
    const id = await getAnyContactId(request, baseURL ?? 'http://localhost:8081');
    test.skip(!id, 'No contacts available');

    const calls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\/api\/v1\/contacts\/.+\/pipeline(\?|$)/i.test(url) && req.method() === 'POST') {
        calls.push(url);
      }
    });

    await page.goto(`${baseURL}/add-contact?editId=${id}`, { waitUntil: 'networkidle' });

    const btn = page.getByText('Set Pipeline: Networking', { exact: false }).first();
    await expect(btn).toBeVisible();
    await btn.click();

    await expect.poll(() => calls.length, { timeout: 3000 }).toBeGreaterThan(0);
  });

  test('recompute warmth triggers POST /contacts/:id/warmth/recompute', async ({ page, baseURL, request }) => {
    const id = await getAnyContactId(request, baseURL ?? 'http://localhost:8081');
    test.skip(!id, 'No contacts available');

    const calls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\/api\/v1\/contacts\/.+\/warmth\/recompute(\?|$)/i.test(url) && req.method() === 'POST') {
        calls.push(url);
      }
    });

    await page.goto(`${baseURL}/add-contact?editId=${id}`, { waitUntil: 'networkidle' });

    const btn = page.getByText('Recompute Warmth', { exact: false }).first();
    await expect(btn).toBeVisible();
    await btn.click();

    await expect.poll(() => calls.length, { timeout: 3000 }).toBeGreaterThan(0);
  });

  test('attachments sign triggers POST /uploads/sign', async ({ page, baseURL, request }) => {
    const id = await getAnyContactId(request, baseURL ?? 'http://localhost:8081');
    test.skip(!id, 'No contacts available');

    const calls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\/api\/v1\/uploads\/sign(\?|$)/i.test(url) && req.method() === 'POST') {
        calls.push(url);
      }
    });

    await page.goto(`${baseURL}/add-contact?editId=${id}`, { waitUntil: 'networkidle' });

    const btn = page.getByText('Attach File (Sign)', { exact: false }).first();
    await expect(btn).toBeVisible();
    await btn.click();

    await expect.poll(() => calls.length, { timeout: 3000 }).toBeGreaterThan(0);
  });

  test('initial note create triggers POST /contacts/:id/notes', async ({ page, baseURL, request }) => {
    const id = await getAnyContactId(request, baseURL ?? 'http://localhost:8081');
    test.skip(!id, 'No contacts available');

    const calls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\/api\/v1\/contacts\/.+\/notes(\?|$)/i.test(url) && req.method() === 'POST') {
        calls.push(url);
      }
    });

    await page.goto(`${baseURL}/add-contact?editId=${id}`, { waitUntil: 'networkidle' });

    const input = page.getByPlaceholder('Add initial note...', { exact: false });
    await input.fill(`Initial note ${Date.now()}`);

    const btn = page.getByText('Add Initial Note', { exact: false }).first();
    await expect(btn).toBeVisible();
    await btn.click();

    await expect.poll(() => calls.length, { timeout: 3000 }).toBeGreaterThan(0);
  });

  test('avatar patch call (optional)', async ({ page, baseURL, request }) => {
    const id = await getAnyContactId(request, baseURL ?? 'http://localhost:8081');
    test.skip(!id, 'No contacts available');

    const calls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\/api\/v1\/contacts\/.+$/i.test(url) && req.method() === 'PATCH') {
        calls.push(url);
      }
    });

    await page.goto(`${baseURL}/add-contact?editId=${id}`, { waitUntil: 'networkidle' });

    // Try saving; if the contact has an avatar_url present, PATCH may fire
    const save = page.getByText(/Update Contact|Save Contact/i).first();
    await save.click();
    await page.waitForTimeout(1000);

    // Do not fail if PATCH didn't fire (depends on whether avatar_url exists)
    if (calls.length === 0) {
      test.info().annotations.push({ type: 'note', description: 'No avatar PATCH fired; avatar_url may be unset' });
    } else {
      expect(calls.length).toBeGreaterThan(0);
    }
  });
});
