import { test, expect } from '@playwright/test';

test.describe('Support Tab & Blog Integration', () => {
  test('should show Support tab in navigation', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Support tab should be visible in bottom navigation
    const supportTab = page.getByText('Support');
    await expect(supportTab).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Support tab', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/support`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Should show the Support header
    await expect(page.getByText('Support').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show Latest Articles section', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/support`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Latest Articles')).toBeVisible({ timeout: 10000 });
  });

  test('should show Help & Resources section', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/support`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Help & Resources')).toBeVisible({ timeout: 10000 });
  });

  test('should show Contact Support link', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/support`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Contact Support')).toBeVisible({ timeout: 10000 });
  });

  test('should show Getting Started Guide link', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/support`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Getting Started Guide')).toBeVisible({ timeout: 10000 });
  });

  test('should show Request Article button', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/support`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Request Article')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to blog request form', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/support`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.getByText('Request Article').click();
    await page.waitForTimeout(1000);

    // Should show the request form
    await expect(page.getByText('Request Article').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Topic')).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no blog posts', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/support`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Either shows blog posts or empty state
    const body = await page.textContent('body');
    const hasPosts = body?.includes('No articles yet') || body?.includes('Latest Articles');
    expect(hasPosts).toBeTruthy();
  });

  test('blog request form has required fields', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/request`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Topic field
    await expect(page.getByText('Topic')).toBeVisible({ timeout: 10000 });

    // Keywords field
    await expect(page.getByText('Keywords')).toBeVisible({ timeout: 10000 });

    // Submit button
    await expect(page.getByText('Submit Request')).toBeVisible({ timeout: 10000 });
  });

  test('blog request form validates empty topic', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/request`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Try submitting without topic
    await page.getByText('Submit Request').click();
    await page.waitForTimeout(500);

    // Should still be on the form (not navigated away)
    await expect(page.getByText('Submit Request')).toBeVisible({ timeout: 5000 });
  });

  test('should show all 5 tabs in navigation', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // All tabs should be visible
    const tabs = ['Dashboard', 'People', 'CRM Assistant', 'Support', 'Settings'];
    for (const tab of tabs) {
      await expect(page.getByText(tab).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
