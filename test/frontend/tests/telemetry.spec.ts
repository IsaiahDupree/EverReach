import { test, expect } from '@playwright/test';

/**
 * Telemetry E2E (Web):
 * - Navigate to telemetry debug screen
 * - Simulate duration + purchase events
 * - Assert debug event rows rendered
 */

test('telemetry: simulate duration and purchase produce events', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const cfgBase = (testInfo.project.use as any).baseURL as string | undefined;
  const envBase = process.env.WEB_BASE_URL;
  const BASE = envBase || cfgBase || 'http://localhost:8081';

  await page.goto(`${BASE}/telemetry-debug`, { waitUntil: 'networkidle' });

  // Click simulate buttons
  await page.getByTestId('btn-sim-duration').click();
  await page.getByTestId('btn-sim-purchase').click();

  // Wait for events to render
  await page.waitForTimeout(500);

  const rows = page.getByTestId('debug-event-row');
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(2);
});
