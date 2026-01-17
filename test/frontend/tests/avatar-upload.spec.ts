import { test, expect } from '@playwright/test';

test.describe('Avatar Upload Test Page', () => {
  test('page loads and shows test actions', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/avatar-upload-test`, { waitUntil: 'networkidle' });

    await expect(page.getByText('Avatar Upload Test', { exact: false })).toBeVisible();
    await expect(page.getByText('Test uploading profile images to contacts', { exact: false })).toBeVisible();

    // The bulk test button should be present
    await expect(page.getByRole('button', { name: /Test Bulk Upload/i })).toBeVisible();

    // Contacts list header
    await expect(page.getByText(/Available Contacts \(/)).toBeVisible();
  });
});
