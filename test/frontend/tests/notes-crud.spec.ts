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

test.describe('Contact Notes - CRUD (web)', () => {
  test('add a text note and see it in the timeline', async ({ page, baseURL, request }) => {
    const id = await getAnyContactId(request, baseURL ?? 'http://localhost:8081');
    test.skip(!id, 'No contacts available');

    await page.goto(`${baseURL}/contact-notes/${id}`, { waitUntil: 'networkidle' });

    // Unique note
    const stamp = Date.now();
    const noteText = `Playwright note ${stamp}`;

    // Focus the textarea and enter text
    const input = page.getByPlaceholder('What happened in your interaction with this contact?', { exact: false });
    await input.click();
    await input.fill(noteText);

    // Click Add Note
    const addBtn = page.getByRole('button', { name: /Add Note/i });
    await addBtn.click();

    // Expect the new note to appear in the list/timeline
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 5000 });
  });
});
