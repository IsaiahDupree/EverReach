import { test, expect } from '@playwright/test';

test('Subscription Plans shows title', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/subscription-plans`, { waitUntil: 'networkidle' });
  
  // Wait for React Native web to hydrate
  await page.waitForTimeout(1000);
  
  await expect(page.getByText('Choose Your Plan')).toBeVisible({ timeout: 10000 });
});
