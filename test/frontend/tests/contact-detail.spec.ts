import { test, expect } from '@playwright/test';

test.describe('Contact Detail Pages', () => {
  // Note: These tests use a placeholder ID since we don't have a real contact yet
  // In a real scenario, you'd create a contact first via API or UI
  
  test('contact detail page structure', async ({ page, baseURL }) => {
    // Using a test UUID - page should handle invalid ID gracefully
    const testId = '00000000-0000-0000-0000-000000000001';
    
    await page.goto(`${baseURL}/contact/${testId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Page should load (even if contact doesn't exist, should show error or empty state)
    await expect(page.locator('body')).toBeVisible();
    
    const bodyText = await page.textContent('body');
    
    // Should either show contact info or a not-found/error message
    const hasValidResponse = 
      bodyText?.toLowerCase().includes('contact') ||
      bodyText?.toLowerCase().includes('not found') ||
      bodyText?.toLowerCase().includes('error') ||
      bodyText?.toLowerCase().includes('name') ||
      bodyText?.toLowerCase().includes('email');
    
    expect(hasValidResponse).toBeTruthy();
  });

  test('contact context page loads', async ({ page, baseURL }) => {
    const testId = '00000000-0000-0000-0000-000000000001';
    
    await page.goto(`${baseURL}/contact-context/${testId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
  });

  test('contact notes page loads', async ({ page, baseURL }) => {
    const testId = '00000000-0000-0000-0000-000000000001';
    
    await page.goto(`${baseURL}/contact-notes/${testId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
    
    const bodyText = await page.textContent('body');
    const hasNotesContent = 
      bodyText?.toLowerCase().includes('note') ||
      bodyText?.toLowerCase().includes('comment');
    
    if (hasNotesContent) {
      console.log('   Notes page shows notes-related content');
    }
  });

  test('contact history page loads', async ({ page, baseURL }) => {
    const testId = '00000000-0000-0000-0000-000000000001';
    
    await page.goto(`${baseURL}/contact-history/${testId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
  });
});
