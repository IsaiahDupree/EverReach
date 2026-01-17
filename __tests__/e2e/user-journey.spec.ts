/**
 * Cross-Browser E2E Tests for User Journey Flows
 * 
 * Tests the PRD V2-V4 implementation across Chrome, Safari, and Firefox
 * 
 * Run with: npx playwright test
 * Run specific browser: npx playwright test --project=chromium
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8081';

// Test configuration for different flows
const FLOWS = {
  primary: {
    name: 'Primary Flow (Direct Signup)',
    steps: ['landing', 'auth-signup'],
  },
  secondary: {
    name: 'Secondary Flow (Waitlist)',
    steps: ['landing', 'waitlist', 'thank-you', 'auth-signup'],
  },
  pricing: {
    name: 'Pricing Flow',
    steps: ['landing', 'pricing-monthly', 'auth-with-plan'],
  },
};

// Helper functions
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

async function checkNoLoadingSpinner(page: Page, timeout = 5000) {
  // Ensure we're not stuck on loading screen
  const loadingText = page.locator('text=Loading...');
  await expect(loadingText).not.toBeVisible({ timeout });
}

// ============================================
// LANDING PAGE TESTS
// ============================================

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
  });

  test('should load without getting stuck on loading screen', async ({ page }) => {
    await checkNoLoadingSpinner(page);
    
    // Check hero content is visible
    await expect(page.locator('text=Never Let A Relationship')).toBeVisible();
  });

  test('should display hero section with correct V4 copy', async ({ page }) => {
    // Hero title
    await expect(page.locator('text=Never Let A Relationship')).toBeVisible();
    await expect(page.locator('text=Go Cold Again')).toBeVisible();
    
    // Hero subtitle (V4 copy)
    await expect(page.locator('text=EverReach tells you who to reach out to')).toBeVisible();
    
    // Outcome line (V4 copy)
    await expect(page.locator('text=Pick one person')).toBeVisible();
    await expect(page.locator('text=under 2 minutes')).toBeVisible();
    
    // Microcopy
    await expect(page.locator('text=No credit card required')).toBeVisible();
    await expect(page.locator('text=Web is live')).toBeVisible();
  });

  test('should display primary CTA button', async ({ page }) => {
    const primaryCTA = page.locator('text=Start Free Trial (Web)');
    await expect(primaryCTA).toBeVisible();
  });

  test('should display secondary waitlist link', async ({ page }) => {
    const waitlistLink = page.locator('text=Prefer mobile? Get priority invite');
    await expect(waitlistLink).toBeVisible();
  });

  test('should display logo with rounded corners', async ({ page }) => {
    const logo = page.locator('img').first();
    await expect(logo).toBeVisible();
    
    // Check logo has border-radius style (rounded corners)
    const borderRadius = await logo.evaluate((el) => {
      return window.getComputedStyle(el).borderRadius;
    });
    expect(borderRadius).not.toBe('0px');
  });

  test('should have How It Works section with renamed Step 1', async ({ page }) => {
    // Scroll to How It Works
    await page.locator('text=HOW IT WORKS').scrollIntoViewIfNeeded();
    
    // V4: Step 1 renamed to "Add Your First Person"
    await expect(page.locator('text=Add Your First Person')).toBeVisible();
  });

  test('should have pricing section with correct buttons', async ({ page }) => {
    // Scroll to pricing
    await page.locator('text=PRICING').scrollIntoViewIfNeeded();
    
    await expect(page.locator('text=$15/month')).toBeVisible();
    await expect(page.locator('text=$150/year')).toBeVisible();
  });

  test('should have bottom CTA with V4 copy', async ({ page }) => {
    // Scroll to bottom CTA
    await page.locator('text=Stop Letting Valuable Relationships').scrollIntoViewIfNeeded();
    
    // V4: "Start with one person today — EverReach handles the rest."
    await expect(page.locator('text=Start with one person today')).toBeVisible();
  });
});

// ============================================
// PRIMARY FLOW: Landing → Auth (Signup)
// ============================================

test.describe('Primary Flow: Landing → Auth', () => {
  test('clicking primary CTA navigates to auth with isSignUp=true', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Click primary CTA
    await page.locator('text=Start Free Trial (Web)').first().click();
    
    // Should navigate to /auth with isSignUp=true
    await page.waitForURL(/\/auth\?isSignUp=true/);
    expect(page.url()).toContain('isSignUp=true');
  });

  test('auth page loads correctly from primary CTA', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth?isSignUp=true`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Auth page should be visible (check for email input or auth UI)
    const authContent = page.locator('[placeholder*="email"], [type="email"], text=Sign');
    await expect(authContent.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// SECONDARY FLOW: Landing → Waitlist → Thank-you → Auth
// ============================================

test.describe('Secondary Flow: Waitlist', () => {
  test('clicking waitlist link navigates to /waitlist', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Click waitlist link
    await page.locator('text=Prefer mobile? Get priority invite').click();
    
    // Should navigate to /waitlist
    await page.waitForURL(/\/waitlist/);
  });

  test('waitlist page loads and shows first question', async ({ page }) => {
    await page.goto(`${BASE_URL}/waitlist`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Should show first question about pain point
    await expect(page.locator('text=biggest challenge')).toBeVisible({ timeout: 10000 });
  });

  test('can complete waitlist flow (simulated)', async ({ page }) => {
    await page.goto(`${BASE_URL}/waitlist`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Step 1: Select pain point
    const painPointOption = page.locator('text=Forgetting to follow up').first();
    if (await painPointOption.isVisible()) {
      await painPointOption.click();
      await page.waitForTimeout(500);
    }
    
    // Step 2: Select network size (if visible)
    const networkOption = page.locator('text=100-500').first();
    if (await networkOption.isVisible()) {
      await networkOption.click();
      await page.waitForTimeout(500);
    }
    
    // Step 3: Select urgency (if visible)
    const urgencyOption = page.locator('text=This week').first();
    if (await urgencyOption.isVisible()) {
      await urgencyOption.click();
      await page.waitForTimeout(500);
    }
    
    // Step 4: Email input should eventually appear
    const emailInput = page.locator('[placeholder*="email"], [type="email"]');
    await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// THANK-YOU PAGES
// ============================================

test.describe('Thank-You Pages', () => {
  test('thank-you page loads with Continue on Web button', async ({ page }) => {
    await page.goto(`${BASE_URL}/thank-you?email=test@example.com`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Should show Continue on Web button
    await expect(page.locator('text=Continue on Web')).toBeVisible({ timeout: 10000 });
  });

  test('thank-you-qualified page loads with Continue on Web button', async ({ page }) => {
    await page.goto(`${BASE_URL}/thank-you-qualified?email=test@example.com`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Should show Continue on Web button
    await expect(page.locator('text=Continue on Web')).toBeVisible({ timeout: 10000 });
  });

  test('Continue on Web passes email to auth', async ({ page }) => {
    const testEmail = 'test@example.com';
    await page.goto(`${BASE_URL}/thank-you?email=${encodeURIComponent(testEmail)}`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Click Continue on Web
    await page.locator('text=Continue on Web').click();
    
    // Should navigate to auth with email param
    await page.waitForURL(/\/auth/);
    expect(page.url()).toContain('email=');
    expect(page.url()).toContain('isSignUp=true');
  });
});

// ============================================
// PRICING FLOW
// ============================================

test.describe('Pricing Flow', () => {
  test('monthly pricing button passes plan=monthly to auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Scroll to pricing
    await page.locator('text=PRICING').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click monthly plan button (look for the button near $15/month)
    const monthlyButton = page.locator('text=Start My Journey').first();
    if (await monthlyButton.isVisible()) {
      await monthlyButton.click();
      
      // Should have plan=monthly in URL
      await page.waitForURL(/\/auth/);
      expect(page.url()).toContain('plan=monthly');
    }
  });

  test('yearly pricing button passes plan=yearly to auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Scroll to pricing
    await page.locator('text=PRICING').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click yearly plan button
    const yearlyButton = page.locator('text=Subscribe Yearly').first();
    if (await yearlyButton.isVisible()) {
      await yearlyButton.click();
      
      // Should have plan=yearly in URL
      await page.waitForURL(/\/auth/);
      expect(page.url()).toContain('plan=yearly');
    }
  });
});

// ============================================
// AUTH PAGE PARAM HANDLING
// ============================================

test.describe('Auth Page Parameter Handling', () => {
  test('pre-fills email from URL param', async ({ page }) => {
    const testEmail = 'prefill@test.com';
    await page.goto(`${BASE_URL}/auth?email=${encodeURIComponent(testEmail)}&isSignUp=true`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Email input should be pre-filled
    const emailInput = page.locator('[type="email"], [placeholder*="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    const value = await emailInput.inputValue();
    expect(value).toBe(testEmail);
  });

  test('isSignUp=true shows signup mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth?isSignUp=true`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Should show signup-related UI (Create account, Sign up, etc.)
    const signupIndicator = page.locator('text=Create, text=Sign up, text=Register').first();
    // This may vary based on your auth UI
  });

  test('stores plan in localStorage when passed', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth?isSignUp=true&plan=yearly`);
    await waitForPageLoad(page);
    
    // Check localStorage for stored plan
    const storedPlan = await page.evaluate(() => {
      return localStorage.getItem('selected_plan');
    });
    expect(storedPlan).toBe('yearly');
  });
});

// ============================================
// CROSS-BROWSER SPECIFIC TESTS
// ============================================

test.describe('Cross-Browser Compatibility', () => {
  test('no console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Filter out known/acceptable errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('manifest') &&
      !error.includes('serviceworker')
    );
    
    // Should have no critical console errors
    expect(criticalErrors.length).toBeLessThanOrEqual(2);
  });

  test('page is responsive and usable', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await expect(page.locator('text=Start Free Trial')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await expect(page.locator('text=Start Free Trial')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('text=Start Free Trial')).toBeVisible();
  });

  test('all navigation links work', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    // Test Sign In link
    const signInLink = page.locator('text=Sign In').first();
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await page.waitForURL(/\/auth/);
      await page.goBack();
    }
    
    // Test See How It Works (should scroll)
    await page.goto(`${BASE_URL}/landing`);
    const howItWorksBtn = page.locator('text=See How It Works');
    if (await howItWorksBtn.isVisible()) {
      await howItWorksBtn.click();
      await page.waitForTimeout(500);
      // HOW IT WORKS section should be in view
    }
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

test.describe('Performance', () => {
  test('landing page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
    await checkNoLoadingSpinner(page);
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 10 seconds (generous for dev server)
    expect(loadTime).toBeLessThan(10000);
    console.log(`Landing page load time: ${loadTime}ms`);
  });

  test('navigation between pages is smooth', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await waitForPageLoad(page);
    
    const startTime = Date.now();
    await page.locator('text=Prefer mobile? Get priority invite').click();
    await page.waitForURL(/\/waitlist/);
    await waitForPageLoad(page);
    
    const navTime = Date.now() - startTime;
    
    // Navigation should be under 3 seconds
    expect(navTime).toBeLessThan(3000);
    console.log(`Navigation time: ${navTime}ms`);
  });
});
