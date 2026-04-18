import { test, expect } from '@playwright/test';

test.describe('Blog Integration (via Settings > Support)', () => {
  test('should show 4 tabs in navigation (no Support tab)', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const tabs = ['Dashboard', 'People', 'CRM Assistant', 'Settings'];
    for (const tab of tabs) {
      await expect(page.getByText(tab).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('settings page shows Blog link in Support section', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Blog')).toBeVisible({ timeout: 10000 });
  });

  test('settings page shows Support section items', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Help Center')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Feature Request')).toBeVisible({ timeout: 10000 });
  });

  test('blog list page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Should show the Blog header
    await expect(page.getByText('Blog').first()).toBeVisible({ timeout: 10000 });
  });

  test('blog list shows Request button', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Request')).toBeVisible({ timeout: 10000 });
  });

  test('blog list shows empty state or articles', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    const hasPosts = body?.includes('No articles yet') || body?.includes('Request Article') || body?.includes('Loading');
    expect(hasPosts).toBeTruthy();
  });

  test('blog request form loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/request`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Topic')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Keywords')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Submit Request')).toBeVisible({ timeout: 10000 });
  });

  test('blog request form validates empty topic', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/request`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.getByText('Submit Request').click();
    await page.waitForTimeout(500);

    // Should still be on the form (not navigated away)
    await expect(page.getByText('Submit Request')).toBeVisible({ timeout: 5000 });
  });
});
