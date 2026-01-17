import { test as setup, expect } from '@playwright/test';

const authFile = 'test/frontend/.auth/user.json';

setup('authenticate', async ({ page, baseURL }) => {
  // Get credentials from environment (same as agent tests)
  const email = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';
  const password = process.env.TEST_PASSWORD;
  
  if (!password) {
    throw new Error('TEST_PASSWORD environment variable is required');
  }

  console.log(`[Auth Setup] Signing in as ${email}...`);

  // Navigate to sign-in page
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // Wait for React Native web hydration

  // Fill in sign-in form (adjust selectors based on your actual form)
  // Look for email input
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name*="email" i]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);

  // Look for password input
  const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i], input[name*="password" i]').first();
  await passwordInput.fill(password);

  // Click sign-in button
  const signInButton = page.locator('button, [role="button"]').filter({ hasText: /sign in/i }).first();
  await signInButton.click();

  // Wait for navigation to authenticated page
  await page.waitForURL(url => !url.pathname.includes('sign') && !url.pathname.includes('login'), { timeout: 15000 });
  
  // Wait for app to load
  await page.waitForTimeout(2000);

  console.log(`[Auth Setup] Successfully signed in as ${email}`);
  console.log(`[Auth Setup] Current URL: ${page.url()}`);

  // Save authenticated state
  await page.context().storageState({ path: authFile });
  
  console.log(`[Auth Setup] Saved auth state to ${authFile}`);
});
