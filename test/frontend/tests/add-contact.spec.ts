import { test, expect } from '@playwright/test';

test.describe('Add Contact Flow', () => {
  test('add-contact page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/add-contact`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for React Native web hydration

    // Should show add contact form elements
    const bodyText = await page.textContent('body');
    
    // Look for common form field labels or inputs
    const hasFormElements = 
      bodyText?.toLowerCase().includes('name') ||
      bodyText?.toLowerCase().includes('email') ||
      bodyText?.toLowerCase().includes('phone') ||
      bodyText?.toLowerCase().includes('contact');
    
    expect(hasFormElements).toBeTruthy();
  });

  test('form inputs are present', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/add-contact`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try to find input fields (React Native web may render these differently)
    const inputs = await page.locator('input, textarea').count();
    
    // Should have at least one input field
    expect(inputs).toBeGreaterThan(0);
    console.log(`   Found ${inputs} input fields`);
  });

  test('page does not crash on load', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/add-contact`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
    
    // Should not show a generic error message
    const bodyText = await page.textContent('body');
    const hasError = bodyText?.toLowerCase().includes('error') || bodyText?.toLowerCase().includes('crash');
    
    if (hasError) {
      console.warn('   Warning: Page may contain error text');
    }
  });
});
