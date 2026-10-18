import { test, expect } from '@playwright/test';
import { getApiBase } from '../utils/env';

// Helper to fetch a contact id from backend
async function getAnyContactId(request: any, baseURL: string): Promise<string | null> {
  const apiBase = getApiBase(baseURL);
  if (!apiBase) return null;
  const res = await request.get(`${apiBase}/api/v1/contacts?limit=1`, { headers: { 'accept': 'application/json' } });
  if (!res.ok()) return null;
  const data = await res.json();
  const items = data.items || data.contacts || data || [];
  return items[0]?.id ?? null;
}

const ALLOWED_RGB = new Set([
  'rgb(255, 107, 107)', // #FF6B6B hot
  'rgb(255, 217, 61)',  // #FFD93D warm
  'rgb(149, 225, 211)', // #95E1D3 cool/cooling/neutral
  'rgb(78, 205, 196)',  // #4ECDC4 cold
]);

test.describe('Warmth-based visuals', () => {
  test('contact detail shows warmth badge and score', async ({ page, baseURL, request }) => {
    const id = await getAnyContactId(request, baseURL);
    test.skip(!id, 'No contacts available');

    const webBase = baseURL ?? 'http://localhost:8081';
    await page.goto(`${webBase}/contact/${id}`, { waitUntil: 'networkidle' });

    // Score label should be visible
    await expect(page.getByText(/Score:\s*\d+/)).toBeVisible();

    // Warmth band text (WARM|HOT|COOL|COLD) should appear
    const band = page.locator('text=/^(WARM|HOT|COOL|COLD)$/');
    await expect(band.first()).toBeVisible();

    // Try to read computed background color on the badge container
    const color = await band.first().evaluate((el) => {
      const parent = el.parentElement as HTMLElement | null;
      const node = parent ?? (el as HTMLElement);
      return window.getComputedStyle(node).backgroundColor;
    });

    // If color is readable, it should be one of expected or at least non-transparent
    if (color && color !== 'rgba(0, 0, 0, 0)') {
      expect(ALLOWED_RGB.has(color)).toBeTruthy();
    }
  });
});
