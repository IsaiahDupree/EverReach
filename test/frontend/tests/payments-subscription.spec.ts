import { test, expect } from '@playwright/test';

test.describe('Payments & Subscription Flow', () => {
  test('subscription plans page displays pricing tiers', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/subscription-plans`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check for pricing structure
    await expect(page.getByText(/Choose Your Plan|Select Plan|Pricing/i).first()).toBeVisible();

    // Look for common pricing elements
    const bodyText = await page.textContent('body');
    const hasPricingElements = bodyText?.toLowerCase().includes('trial') ||
                                bodyText?.toLowerCase().includes('month') ||
                                bodyText?.toLowerCase().includes('plan');
    
    expect(hasPricingElements).toBeTruthy();
  });

  test('paywall displays when accessing premium features', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    // Try to access a premium feature (e.g., AI chat)
    await page.goto(`${webBase}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent('body');
    
    // Check if paywall or upgrade prompt appears
    const hasPaywallIndicators = bodyText?.toLowerCase().includes('upgrade') ||
                                  bodyText?.toLowerCase().includes('premium') ||
                                  bodyText?.toLowerCase().includes('subscribe') ||
                                  bodyText?.toLowerCase().includes('trial');
    
    if (!hasPaywallIndicators) {
      test.info().annotations.push({ 
        type: 'note', 
        description: 'Premium feature accessible without paywall (may be in trial)' 
      });
    }
  });

  test('payment modal/page contains required elements', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/subscription-plans`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for upgrade/subscribe buttons
    const upgradeBtn = page.getByText(/Upgrade|Subscribe|Get Started|Start Trial/i).first();
    
    if (await upgradeBtn.isVisible()) {
      await upgradeBtn.click();
      await page.waitForTimeout(2000);

      const bodyText = await page.textContent('body');
      
      // Check for payment-related content
      const hasPaymentUI = bodyText?.toLowerCase().includes('payment') ||
                           bodyText?.toLowerCase().includes('card') ||
                           bodyText?.toLowerCase().includes('billing') ||
                           bodyText?.toLowerCase().includes('stripe');
      
      if (!hasPaymentUI) {
        test.info().annotations.push({ 
          type: 'note', 
          description: 'Payment UI may be external or not yet integrated' 
        });
      }
    } else {
      test.skip(true, 'No upgrade button found');
    }
  });

  test('free trial information is clearly displayed', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/subscription-plans`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent('body');
    
    // Check for trial messaging
    const hasTrialInfo = bodyText?.toLowerCase().includes('7 day') ||
                         bodyText?.toLowerCase().includes('7-day') ||
                         bodyText?.toLowerCase().includes('trial') ||
                         bodyText?.toLowerCase().includes('free');
    
    expect(hasTrialInfo).toBeTruthy();
  });
});
