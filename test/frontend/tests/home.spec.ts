import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load home page after authentication', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check that we're not on the sign-in page
    await expect(page.getByText('Sign In')).not.toBeVisible();
    
    // Home page should have loaded
    expect(page.url()).toContain('/home');
  });

  test('should remain authenticated on page reload', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Reload the page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Should still be authenticated (not redirected to sign-in)
    await expect(page.getByText('Sign In')).not.toBeVisible();
    expect(page.url()).toContain('/home');
  });
});
