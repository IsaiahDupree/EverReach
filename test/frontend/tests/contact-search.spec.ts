import { test, expect } from '@playwright/test';

function getApiBase(baseURL: string): string | null {
  if (process.env.TEST_API_BASE) return process.env.TEST_API_BASE;
  if (baseURL.includes('localhost:8081')) return baseURL.replace('8081', '3000');
  return null;
}

async function getAnyContact(request: any, baseURL: string): Promise<{ id: string, name: string } | null> {
  const apiBase = getApiBase(baseURL);
  if (!apiBase) return null;
  const res = await request.get(`${apiBase}/api/v1/contacts?limit=10`, { headers: { 'accept': 'application/json' } });
  if (!res.ok()) return null;
  const data = await res.json();
  const items = data.items || data.contacts || data || [];
  if (!items.length) return null;
  const first = items[0];
  const name = first.display_name || first.fullName || first.name || '';
  return { id: first.id, name };
}

test.describe('Contact Search (People screen)', () => {
  test('typing filters to a known contact', async ({ page, baseURL, request }) => {
    const contact = await getAnyContact(request, baseURL);
    test.skip(!contact, 'No contacts available');

    await page.goto(`${baseURL}/people`, { waitUntil: 'networkidle' });

    // Search input present
    const input = page.getByPlaceholder('Search people, companies, tags...', { exact: false });
    await expect(input).toBeVisible();

    // Type a substring of the contact's name
    const query = contact!.name.split(' ')[0] || contact!.name;
    await input.fill(query);

    // Expect the contact name to be visible somewhere in the list
    await expect(page.getByText(new RegExp(contact!.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeVisible({ timeout: 5000 });
  });
});
