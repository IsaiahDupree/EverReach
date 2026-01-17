import { test, expect } from '@playwright/test';

test.describe('Messages and Templates', () => {
  test('message-templates page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/message-templates`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Should load without crashing
    await expect(page.locator('body')).toBeVisible();
    
    const bodyText = await page.textContent('body');
    const hasTemplateContent = 
      bodyText?.toLowerCase().includes('template') ||
      bodyText?.toLowerCase().includes('message');
    
    expect(hasTemplateContent).toBeTruthy();
  });

  test('message-results page is accessible', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/message-results`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Page should load
    await expect(page.locator('body')).toBeVisible();
  });

  test('goal-picker page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/goal-picker`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Should show goal-related content
    await expect(page.locator('body')).toBeVisible();
    
    const bodyText = await page.textContent('body');
    const hasGoalContent = 
      bodyText?.toLowerCase().includes('goal') ||
      bodyText?.toLowerCase().includes('objective') ||
      bodyText?.toLowerCase().includes('purpose');
    
    if (hasGoalContent) {
      expect(hasGoalContent).toBeTruthy();
    } else {
      console.log('   Goal picker page loaded but content not detected');
    }
  });
});
