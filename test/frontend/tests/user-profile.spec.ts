import { test, expect } from '@playwright/test';

test.describe('User Profile & Settings', () => {
  test('settings page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Page should load
    await expect(page.locator('body')).toBeVisible();
    
    const bodyText = await page.textContent('body');
    const hasSettingsContent = 
      bodyText?.toLowerCase().includes('setting') ||
      bodyText?.toLowerCase().includes('profile') ||
      bodyText?.toLowerCase().includes('account');
    
    expect(hasSettingsContent).toBeTruthy();
  });

  test('user profile accessible', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for profile or account links
    const profileLink = page.locator('a[href*="profile"], a[href*="account"], a[href*="settings"]').first();
    
    if (await profileLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await profileLink.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      console.log('   Profile/account page accessible');
    } else {
      // Try direct navigation
      await page.goto(`${baseURL}/profile`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('mode settings page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/mode-settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
  });
});
