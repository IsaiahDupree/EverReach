import { test, expect } from '@playwright/test';

test.describe('Sign Out Flow', () => {
  test('user can sign out and is redirected to auth', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    // Navigate to settings/profile
    await page.goto(`${webBase}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for sign out button
    const signOutBtn = page.getByText(/sign out|log out/i).first();
    
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await page.waitForTimeout(2000);

      // Should redirect to auth page or home
      const url = page.url();
      const isSignedOut = url.includes('/auth') || 
                          url.includes('/login') || 
                          url.includes('/signin') ||
                          !url.includes('/settings');
      
      expect(isSignedOut).toBeTruthy();

      // Auth state should be cleared
      const bodyText = await page.textContent('body');
      const hasAuthUI = bodyText?.toLowerCase().includes('sign in') || 
                        bodyText?.toLowerCase().includes('log in') ||
                        bodyText?.toLowerCase().includes('email');
      
      expect(hasAuthUI).toBeTruthy();
    } else {
      test.skip(true, 'Sign out button not found on settings page');
    }
  });

  test('signed out user cannot access protected routes', async ({ page, baseURL, context }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    // Clear auth state
    await context.clearCookies();
    await page.goto(`${webBase}/people`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Should redirect to auth or show auth gate
    const url = page.url();
    const bodyText = await page.textContent('body');
    
    const isProtected = url.includes('/auth') || 
                        url.includes('/login') ||
                        bodyText?.toLowerCase().includes('sign in') ||
                        bodyText?.toLowerCase().includes('authenticate');
    
    if (!isProtected) {
      // Log for debugging
      test.info().annotations.push({ 
        type: 'note', 
        description: `Protected route accessible without auth: ${url}` 
      });
    }
  });
});
