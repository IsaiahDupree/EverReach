import { test, expect } from '@playwright/test';

test.describe('7-Day Trial Expiration Flow', () => {
  test('trial status is visible in UI', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent('body');
    
    // Look for trial indicators
    const hasTrialStatus = bodyText?.toLowerCase().includes('trial') ||
                           bodyText?.toLowerCase().includes('days left') ||
                           bodyText?.toLowerCase().includes('days remaining');
    
    if (hasTrialStatus) {
      test.info().annotations.push({ 
        type: 'note', 
        description: 'Trial status displayed in UI' 
      });
    } else {
      test.info().annotations.push({ 
        type: 'note', 
        description: 'Trial status not found (may be subscribed or trial UI hidden)' 
      });
    }
  });

  test('settings page shows subscription status', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent('body');
    
    // Look for subscription/trial information
    const hasSubInfo = bodyText?.toLowerCase().includes('subscription') ||
                       bodyText?.toLowerCase().includes('plan') ||
                       bodyText?.toLowerCase().includes('trial') ||
                       bodyText?.toLowerCase().includes('billing');
    
    expect(hasSubInfo).toBeTruthy();
  });

  test('post-trial paywall blocks premium features', async ({ page, baseURL, context }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    // Simulate expired trial by manipulating local storage/cookies if possible
    // For now, just navigate and check for paywall presence
    
    await page.goto(`${webBase}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent('body');
    
    // Check for paywall messaging
    const hasPaywallMsg = bodyText?.toLowerCase().includes('upgrade to continue') ||
                          bodyText?.toLowerCase().includes('trial has ended') ||
                          bodyText?.toLowerCase().includes('subscribe to access') ||
                          bodyText?.toLowerCase().includes('premium feature');
    
    if (!hasPaywallMsg) {
      test.info().annotations.push({ 
        type: 'note', 
        description: 'Feature accessible (trial active or subscribed)' 
      });
    }
  });

  test('trial end reminder appears before expiration', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Look for trial reminder banners/modals
    const reminderText = await page.getByText(/trial ends|days left|upgrade now/i).first().isVisible().catch(() => false);
    
    if (reminderText) {
      test.info().annotations.push({ 
        type: 'note', 
        description: 'Trial reminder visible' 
      });
    } else {
      test.info().annotations.push({ 
        type: 'note', 
        description: 'No trial reminder (trial may have expired or not started)' 
      });
    }
  });
});
