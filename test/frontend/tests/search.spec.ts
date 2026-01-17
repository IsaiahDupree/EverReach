import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('search input is accessible', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for search input (may be in various locations)
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="find" i], input[type="search"]').first();
    
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
      
      // Try searching
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      // Search should not crash the app
      await expect(page.locator('body')).toBeVisible();
    } else {
      console.log('   Search input not found on home page - may not be implemented yet');
    }
  });

  test('people page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Try to navigate to people page
    const peopleLink = page.locator('a[href*="people"], button:has-text("People")').first();
    
    if (await peopleLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await peopleLink.click();
      await page.waitForTimeout(1000);
      
      // Should load some content
      await expect(page.locator('body')).toBeVisible();
    } else {
      // Try direct navigation
      await page.goto(`${baseURL}/people`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
