import { test, expect } from '@playwright/test';
import { getApiBase } from '../utils/env';

test.describe('Interactions API via UI', () => {
  test('interactions endpoint is accessible', async ({ page, baseURL, request }) => {
    const apiBase = getApiBase(baseURL as any);
    if (!apiBase) test.skip(true, 'No TEST_API_BASE configured');
    const response = await request.get(`${apiBase}/api/v1/interactions`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || ''}`,
      },
    });

    // Should return 200 or 401 (if not authed via backend token)
    expect([200, 401]).toContain(response.status());
  });

  test('contact interactions page accessible', async ({ page, baseURL }) => {
    // Navigate to interactions view (if it exists as a page)
    const webBase = baseURL ?? 'http://localhost:8081';
    await page.goto(`${webBase}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check if interactions section exists
    const bodyText = await page.textContent('body');
    const hasInteractionContent = 
      bodyText?.toLowerCase().includes('interaction') ||
      bodyText?.toLowerCase().includes('activity') ||
      bodyText?.toLowerCase().includes('history');

    // This is informational - we're checking if UI exposes interactions
    if (hasInteractionContent) {
      console.log('   Interactions UI elements found');
    }
  });
});
