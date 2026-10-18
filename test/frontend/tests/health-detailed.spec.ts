import { test, expect } from '@playwright/test';

test.describe('Health Page - Detailed', () => {
  test('should show backend connectivity status', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/health`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for API calls

    // Check backend section exists
    await expect(page.getByText('Backend')).toBeVisible();
    
    // Backend should show either OK or FAILED (more flexible search)
    const pageContent = await page.textContent('body');
    const hasStatus = pageContent?.includes('OK') || pageContent?.includes('FAILED');
    expect(hasStatus).toBeTruthy();
  });

  test('should show Supabase connectivity status', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/health`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for API calls

    // Check Supabase section exists
    await expect(page.getByText('Supabase (Auth Settings)')).toBeVisible();
    
    // Supabase URL should be displayed
    const pageContent = await page.textContent('body');
    const hasSupabaseUrl = pageContent?.includes('supabase.co') || pageContent?.includes('auth/v1/settings');
    expect(hasSupabaseUrl).toBeTruthy();
  });

  test('should display backend base URL', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/health`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Should show the backend URL (ever-reach-be.vercel.app)
    const hasBackendUrl = await page.locator('text=/ever-reach-be|localhost/').isVisible().catch(() => false);
    expect(hasBackendUrl).toBeTruthy();
  });
});
