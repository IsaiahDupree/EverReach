import { test, expect } from '@playwright/test';
import type { Page, Request as PWRequest } from '@playwright/test';

// Utility to capture requests made to backend v1 endpoints
function recordApiCalls(page: Page) {
  const calls: { url: string; method: string }[] = [];
  page.on('request', (req: PWRequest) => {
    const url = req.url();
    const m = req.method();
    // Capture any request that includes /api/v1/ or /v1/ (some routes may be proxied)
    if (url.includes('/api/v1/') || url.match(/\/v1\//)) {
      calls.push({ url, method: m });
    }
  });
  return calls;
}

function hasCall(calls: { url: string; method: string }[], method: string, pathLike: RegExp) {
  return calls.some(c => c.method.toUpperCase() === method.toUpperCase() && pathLike.test(c.url));
}

// Map of UI routes to expected API patterns (best-effort, non-destructive)
const scenarios: Array<{
  name: string;
  uiPath: string;
  expected: Array<{ method: string; pathLike: RegExp; optional?: boolean }>;
}> = [
  {
    name: 'Contacts list (People / Home)',
    uiPath: '/home',
    expected: [
      { method: 'GET', pathLike: /\/api\/v1\/contacts(\?|$)|\/v1\/contacts(\?|$)/i, optional: true }
    ]
  },
  {
    name: 'Message templates',
    uiPath: '/message-templates',
    expected: [
      { method: 'GET', pathLike: /\/api\/v1\/templates(\?|$)|\/v1\/templates(\?|$)/i, optional: true }
    ]
  },
  {
    name: 'Template detail (optional)',
    uiPath: '/message-templates',
    expected: [
      // Some UIs fetch specific template(s)
      { method: 'GET', pathLike: /\/api\/v1\/templates\/.+|\/v1\/templates\/.+/i, optional: true }
    ]
  },
  {
    name: 'Goal picker',
    uiPath: '/goal-picker',
    expected: [
      // UI may fetch goals/types or templates indirectly
      { method: 'GET', pathLike: /\/api\/v1\/templates|\/v1\/templates/i, optional: true }
    ]
  },
  {
    name: 'Settings (Me)',
    uiPath: '/settings',
    expected: [
      { method: 'GET', pathLike: /\/api\/v1\/me(\?|$)|\/v1\/me(\?|$)/i, optional: true }
    ]
  },
  {
    name: 'Mode settings (Me)',
    uiPath: '/mode-settings',
    expected: [
      { method: 'GET', pathLike: /\/api\/v1\/me(\?|$)|\/v1\/me(\?|$)/i, optional: true }
    ]
  },
  {
    name: 'Contact context summary',
    uiPath: '/contact-context/00000000-0000-0000-0000-000000000001',
    expected: [
      { method: 'GET', pathLike: /\/api\/v1\/contacts\/.*\/context-summary|\/v1\/contacts\/.*\/context-summary/i }
    ]
  },
  {
    name: 'Contact notes',
    uiPath: '/contact-notes/00000000-0000-0000-0000-000000000001',
    expected: [
      { method: 'GET', pathLike: /\/api\/v1\/contacts\/.*\/notes|\/v1\/contacts\/.*\/notes/i, optional: true }
    ]
  },
  {
    name: 'Contact messages (timeline)',
    uiPath: '/contact/00000000-0000-0000-0000-000000000001',
    expected: [
      { method: 'GET', pathLike: /\/api\/v1\/contacts\/.*\/messages|\/v1\/contacts\/.*\/messages/i, optional: true }
    ]
  },
  {
    name: 'Feature requests',
    uiPath: '/feature-request',
    expected: [
      { method: 'GET', pathLike: /\/api\/v1\/feature-buckets(\?|$)|\/v1\/feature-buckets(\?|$)/i, optional: true },
      { method: 'POST', pathLike: /\/api\/v1\/feature-requests(\?|$)|\/v1\/feature-requests(\?|$)/i, optional: true }
    ]
  },
  {
    name: 'Uploads (avatar upload test)',
    uiPath: '/avatar-upload-test',
    expected: [
      { method: 'POST', pathLike: /\/api\/v1\/uploads\/sign|\/v1\/uploads\/sign/i, optional: true }
    ]
  },
  {
    name: 'Pipelines (optional)',
    uiPath: '/contact/00000000-0000-0000-0000-000000000001',
    expected: [
      { method: 'GET', pathLike: /\/api\/v1\/pipelines(\?|$)|\/v1\/pipelines(\?|$)/i, optional: true },
      { method: 'GET', pathLike: /\/api\/v1\/pipelines\/.+\/stages|\/v1\/pipelines\/.+\/stages/i, optional: true }
    ]
  }
];

for (const scenario of scenarios) {
  test.describe(`API Coverage: ${scenario.name}`, () => {
    test(`UI triggers expected API calls`, async ({ page, baseURL }) => {
      const calls = recordApiCalls(page);

      await page.goto(`${baseURL}${scenario.uiPath}`, { waitUntil: 'networkidle' });
      // Allow client effects to fire
      await page.waitForTimeout(2000);

      // Validate expected calls (optional vs required)
      for (const exp of scenario.expected) {
        const ok = hasCall(calls, exp.method, exp.pathLike);
        if (exp.optional) {
          // Optional endpoints: log if present, do not fail if missing
          if (ok) console.log(`   Detected optional call: ${exp.method} ${exp.pathLike}`);
        } else {
          expect(ok).toBeTruthy();
        }
      }

      // Page should be visible regardless
      await expect(page.locator('body')).toBeVisible();
    });
  });
}
