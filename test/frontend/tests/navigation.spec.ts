import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to health page via URL', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Navigate to health page
    await page.goto(`${baseURL}/health`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Verify we're on the health page
    await expect(page.getByText('Connectivity Checks')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to subscription plans via URL', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Navigate to subscription plans
    await page.goto(`${baseURL}/subscription-plans`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Verify we're on the subscription plans page
    await expect(page.getByText('Choose Your Plan')).toBeVisible({ timeout: 10000 });
  });

  test('should handle back navigation', async ({ page, baseURL }) => {
    // Start at home
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Go to health
    await page.goto(`${baseURL}/health`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await expect(page.getByText('Connectivity Checks')).toBeVisible({ timeout: 10000 });

    // Go back
    await page.goBack();
    await page.waitForTimeout(1000);

    // Should be back at home (or previous page)
    expect(page.url()).not.toContain('/health');
  });
});
