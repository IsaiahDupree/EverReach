import { test, expect } from '@playwright/test';

test('Health page renders connectivity cards', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/health`, { waitUntil: 'networkidle' });
  
  // Wait for React Native web to hydrate
  await page.waitForTimeout(2000);
  
  await expect(page.getByText('Connectivity Checks')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Backend')).toBeVisible();
  await expect(page.getByText('Supabase (Auth Settings)')).toBeVisible();
});
