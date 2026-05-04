/**
 * Mobile Endpoint Audit — Smoke Tests
 *
 * Tests EVERY endpoint the iOS/Android mobile app calls against the deployed backend.
 * Verifies routes are registered (not 404 HTML) and return proper JSON.
 *
 * Run: see package.json test:smoke script
 */

const BASE = process.env.BACKEND_BASE_URL || 'https://ever-reach-be.vercel.app';

interface EndpointCheck {
  method: string;
  path: string;
  body?: any;
  expect: number[];
  label: string;
  /** Which mobile file calls this */
  calledFrom: string;
  /** Is this critical for core mobile UX? */
  critical?: boolean;
}

// ============================================================================
// Every endpoint the mobile app calls, extracted from:
//   hooks/, lib/, app/, features/, providers/, components/, constants/
// ============================================================================
const endpoints: EndpointCheck[] = [
  // ─── Health & Config (public, no auth) ─────────────────────────────
  { method: 'GET', path: '/api/health', expect: [200], label: 'health', calledFrom: 'constants/endpoints.ts', critical: true },
  { method: 'GET', path: '/api/v1/warmth/modes', expect: [200], label: 'warmth modes', calledFrom: 'lib/warmth-manager.ts', critical: true },
  { method: 'GET', path: '/api/v1/config/paywall-strategy', expect: [200], label: 'paywall strategy', calledFrom: 'hooks/useLivePaywall.ts' },
  { method: 'GET', path: '/api/v1/contacts/import/health', expect: [200], label: 'import health', calledFrom: 'hooks/useContactImport.ts' },

  // ─── Me / User Profile ─────────────────────────────────────────────
  { method: 'GET', path: '/api/v1/me', expect: [401], label: 'me profile', calledFrom: 'app/subscription-plans.tsx', critical: true },
  { method: 'GET', path: '/api/v1/me/entitlements', expect: [401], label: 'me entitlements', calledFrom: 'providers/EntitlementsProviderV3.tsx', critical: true },
  { method: 'GET', path: '/api/v1/me/account', expect: [401], label: 'me account', calledFrom: 'constants/endpoints.ts' },
  { method: 'GET', path: '/api/v1/me/compose-settings', expect: [401], label: 'me compose-settings', calledFrom: 'providers/TemplatesProvider.tsx' },
  { method: 'GET', path: '/api/v1/me/onboarding-status', expect: [401], label: 'me onboarding-status', calledFrom: 'constants/endpoints.ts' },
  { method: 'GET', path: '/api/v1/me/usage-summary', expect: [401], label: 'me usage-summary', calledFrom: 'constants/endpoints.ts' },
  { method: 'GET', path: '/api/v1/me/impact-summary', expect: [401], label: 'me impact-summary', calledFrom: 'lib/api.ts' },
  { method: 'GET', path: '/api/v1/me/plan-recommendation', expect: [401], label: 'me plan-recommendation', calledFrom: 'lib/api.ts' },
  { method: 'GET', path: '/api/v1/me/persona-notes', expect: [401], label: 'me persona-notes', calledFrom: 'constants/endpoints.ts' },
  { method: 'PUT', path: '/api/v1/me/compose-settings', expect: [401, 405], label: 'me compose-settings PUT', calledFrom: 'providers/TemplatesProvider.tsx' },

  // ─── Contacts ──────────────────────────────────────────────────────
  { method: 'GET', path: '/api/v1/contacts', expect: [401], label: 'contacts list', calledFrom: 'hooks/useContacts.ts', critical: true },
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000', expect: [401, 404], label: 'contact by id', calledFrom: 'hooks/useContactDetail.ts', critical: true },
  { method: 'POST', path: '/api/v1/contacts', body: {}, expect: [401], label: 'create contact', calledFrom: 'hooks/useContacts.ts', critical: true },
  { method: 'PUT', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000', body: {}, expect: [401, 405], label: 'update contact', calledFrom: 'features/contacts/screens/ContactDetail.tsx' },
  { method: 'DELETE', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000', expect: [401, 405], label: 'delete contact', calledFrom: 'features/contacts/screens/ContactDetail.tsx' },

  // ─── Contact Sub-Resources ─────────────────────────────────────────
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/notes', expect: [401], label: 'contact notes GET', calledFrom: 'features/contacts/screens/ContactNotes.tsx', critical: true },
  { method: 'POST', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/notes', body: {}, expect: [401], label: 'contact notes POST', calledFrom: 'features/contacts/screens/ContactContext.tsx' },
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/tags', expect: [401, 405], label: 'contact tags', calledFrom: 'constants/endpoints.ts' },
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/messages', expect: [401], label: 'contact messages', calledFrom: 'hooks/useContactDetail.ts' },
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/files', expect: [401], label: 'contact files', calledFrom: 'constants/endpoints.ts' },
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/pipeline', expect: [401], label: 'contact pipeline GET', calledFrom: 'features/contacts/screens/ContactDetail.tsx', critical: true },
  { method: 'PUT', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/pipeline', body: {}, expect: [401, 405], label: 'contact pipeline PUT', calledFrom: 'features/contacts/screens/ContactDetail.tsx' },
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/pipeline/history', expect: [401], label: 'contact pipeline history', calledFrom: 'hooks/useContactDetail.ts' },
  { method: 'POST', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/pipeline/move', body: {}, expect: [401], label: 'contact pipeline move', calledFrom: 'features/contacts/screens/ContactDetail.tsx' },
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/goal-suggestions', expect: [401], label: 'contact goal-suggestions', calledFrom: 'hooks/useGoalSuggestions.ts' },
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/warmth/mode', expect: [401], label: 'contact warmth mode GET', calledFrom: 'components/WarmthModeSelector.tsx', critical: true },
  { method: 'PUT', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/warmth/mode', body: {}, expect: [401, 405], label: 'contact warmth mode PUT', calledFrom: 'components/WarmthModeSelector.tsx' },
  { method: 'POST', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/warmth/recompute', body: {}, expect: [401], label: 'contact warmth recompute', calledFrom: 'app/(tabs)/settings.tsx' },
  { method: 'GET', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/context-summary', expect: [401, 404, 500], label: 'contact context-summary', calledFrom: 'features/contacts/screens/ContactDetail.tsx' },
  { method: 'POST', path: '/api/v1/contacts/00000000-0000-0000-0000-000000000000/avatar', body: {}, expect: [401, 405], label: 'contact avatar upload', calledFrom: 'lib/avatarUpload.ts' },

  // ─── Contact Import ────────────────────────────────────────────────
  { method: 'POST', path: '/api/v1/contacts/import/google/start', body: {}, expect: [401], label: 'google import start', calledFrom: 'hooks/useContactImport.ts' },
  { method: 'GET', path: '/api/v1/contacts/import/status/test-id', expect: [401], label: 'import status', calledFrom: 'hooks/useContactImport.ts' },
  { method: 'GET', path: '/api/v1/contacts/import/list', expect: [401], label: 'import list', calledFrom: 'scripts/test-endpoints.ts' },

  // ─── Screenshot Analysis (critical mobile flow) ────────────────────
  { method: 'GET', path: '/api/v1/screenshots', expect: [401], label: 'screenshots list', calledFrom: 'constants/endpoints.ts', critical: true },
  { method: 'POST', path: '/api/v1/screenshots', body: {}, expect: [400, 401], label: 'screenshot upload', calledFrom: 'hooks/useScreenshotAnalysis.ts', critical: true },
  { method: 'GET', path: '/api/v1/screenshots/00000000-0000-0000-0000-000000000000', expect: [401, 404], label: 'screenshot by id', calledFrom: 'constants/endpoints.ts', critical: true },
  { method: 'POST', path: '/api/v1/screenshots/00000000-0000-0000-0000-000000000000/analyze', body: {}, expect: [401, 404], label: 'screenshot analyze', calledFrom: 'hooks/useScreenshotAnalysis.ts', critical: true },
  { method: 'POST', path: '/api/v1/analysis/screenshot', body: {}, expect: [401, 400], label: 'analysis screenshot (legacy)', calledFrom: 'app/openai-test.tsx' },
  { method: 'GET', path: '/api/v1/analysis/screenshot/test-id', expect: [401, 404], label: 'analysis screenshot by id', calledFrom: 'backend-vercel openapi' },

  // ─── Messages & Compose ────────────────────────────────────────────
  { method: 'GET', path: '/api/v1/messages', expect: [401], label: 'messages list', calledFrom: 'constants/endpoints.ts', critical: true },
  { method: 'POST', path: '/api/v1/messages/prepare', body: {}, expect: [401, 403], label: 'messages prepare', calledFrom: 'lib/api-examples.ts', critical: true },
  { method: 'POST', path: '/api/v1/messages/send', body: {}, expect: [401, 403], label: 'messages send', calledFrom: 'lib/api-examples.ts', critical: true },
  { method: 'POST', path: '/api/v1/compose', body: {}, expect: [401], label: 'compose', calledFrom: 'lib/agent-api.ts' },
  { method: 'POST', path: '/api/v1/compose/validate', body: {}, expect: [401], label: 'compose validate', calledFrom: 'constants/endpoints.ts' },

  // ─── Goals ─────────────────────────────────────────────────────────
  { method: 'GET', path: '/api/v1/goals', expect: [401], label: 'goals list', calledFrom: 'constants/endpoints.ts', critical: true },
  { method: 'GET', path: '/api/v1/goals/00000000-0000-0000-0000-000000000000', expect: [401], label: 'goal by id', calledFrom: 'constants/endpoints.ts' },
  { method: 'POST', path: '/api/v1/goals/00000000-0000-0000-0000-000000000000/pin', body: {}, expect: [401], label: 'goal pin', calledFrom: 'constants/endpoints.ts' },

  // ─── Pipelines & Templates ─────────────────────────────────────────
  { method: 'GET', path: '/api/v1/pipelines', expect: [401], label: 'pipelines list', calledFrom: 'constants/endpoints.ts', critical: true },
  { method: 'GET', path: '/api/v1/templates', expect: [401], label: 'templates list', calledFrom: 'providers/TemplatesProvider.tsx' },
  { method: 'POST', path: '/api/v1/templates', body: {}, expect: [401], label: 'templates create', calledFrom: 'providers/TemplatesProvider.tsx' },

  // ─── Interactions ──────────────────────────────────────────────────
  { method: 'GET', path: '/api/v1/interactions', expect: [401], label: 'interactions list', calledFrom: 'hooks/useContactHistory.ts' },
  { method: 'POST', path: '/api/v1/interactions', body: {}, expect: [401], label: 'create interaction', calledFrom: 'hooks/useScreenshotAnalysis.ts' },

  // ─── Files ─────────────────────────────────────────────────────────
  { method: 'GET', path: '/api/v1/files', expect: [401], label: 'files list', calledFrom: 'constants/endpoints.ts' },
  { method: 'POST', path: '/api/v1/files', body: {}, expect: [401], label: 'files sign/create', calledFrom: 'features/contacts/screens/ContactContext.tsx' },

  // ─── Search ────────────────────────────────────────────────────────
  { method: 'POST', path: '/api/v1/search', body: { q: 'test' }, expect: [401], label: 'search', calledFrom: 'constants/endpoints.ts', critical: true },

  // ─── Agent / AI ────────────────────────────────────────────────────
  { method: 'POST', path: '/api/v1/agent/chat', body: {}, expect: [401], label: 'agent chat', calledFrom: 'lib/agent-api.ts', critical: true },
  { method: 'POST', path: '/api/v1/agent/analyze/contact', body: {}, expect: [401], label: 'agent analyze contact', calledFrom: 'features/contacts/screens/ContactContext.tsx' },
  { method: 'POST', path: '/api/v1/agent/suggest/actions', body: {}, expect: [401], label: 'agent suggest actions', calledFrom: 'features/contacts/screens/ContactContext.tsx' },
  { method: 'POST', path: '/api/v1/agent/compose/smart', body: {}, expect: [401], label: 'agent compose smart', calledFrom: 'lib/agent-api.ts' },
  { method: 'GET', path: '/api/v1/agent/tools', expect: [401], label: 'agent tools', calledFrom: 'lib/agent-api.ts' },
  { method: 'POST', path: '/api/v1/agent/voice-note/process', body: {}, expect: [401], label: 'agent voice-note process', calledFrom: 'lib/agent-api.ts' },
  { method: 'POST', path: '/api/v1/agent/analyze/screenshot', body: {}, expect: [401], label: 'agent analyze screenshot', calledFrom: 'repos/MediaRepo.ts' },

  // ─── Subscription & Billing ────────────────────────────────────────
  { method: 'POST', path: '/api/v1/subscriptions/sync', body: {}, expect: [401], label: 'subscriptions sync', calledFrom: 'lib/subscriptionManager.ts', critical: true },
  { method: 'DELETE', path: '/api/v1/me/subscription', expect: [401], label: 'me subscription DELETE', calledFrom: 'mobile subscription management' },
  { method: 'POST', path: '/api/v1/me/subscription', body: {}, expect: [401], label: 'me subscription POST', calledFrom: 'mobile subscription management' },
  { method: 'POST', path: '/api/v1/billing/restore', body: {}, expect: [401], label: 'billing restore', calledFrom: 'providers/EntitlementsProviderV3.tsx' },
  { method: 'POST', path: '/api/v1/billing/app-store/transactions', body: {}, expect: [401], label: 'app-store transactions', calledFrom: 'constants/endpoints.ts' },
  { method: 'POST', path: '/api/v1/billing/play/transactions', body: {}, expect: [401], label: 'play transactions', calledFrom: 'constants/endpoints.ts' },
  { method: 'GET', path: '/api/v1/config/paywall-live?platform=ios', expect: [401], label: 'paywall-live', calledFrom: 'hooks/useLivePaywall.ts' },

  // ─── Media Upload ──────────────────────────────────────────────────
  { method: 'POST', path: '/api/v1/media/upload', body: {}, expect: [401], label: 'media upload', calledFrom: 'mobile media upload flow', critical: true },

  // ─── Warmth ────────────────────────────────────────────────────────
  { method: 'POST', path: '/api/v1/warmth/recompute', body: {}, expect: [401], label: 'warmth recompute (global)', calledFrom: 'lib/warmth-manager.ts' },

  // ─── Feature Requests ──────────────────────────────────────────────
  { method: 'GET', path: '/api/v1/feature-requests', expect: [401], label: 'feature requests GET', calledFrom: 'lib/featureRequests.ts' },
  { method: 'POST', path: '/api/v1/feature-requests', body: {}, expect: [401], label: 'feature requests POST', calledFrom: 'lib/featureRequests.ts' },

  // ─── Merge ─────────────────────────────────────────────────────────
  { method: 'POST', path: '/api/v1/merge/contacts', body: {}, expect: [401], label: 'merge contacts', calledFrom: 'mobile merge flow' },

  // ─── Transcription ─────────────────────────────────────────────────
  { method: 'POST', path: '/api/v1/transcribe', body: {}, expect: [401, 400, 405], label: 'transcribe', calledFrom: 'constants/endpoints.ts' },

  // ─── Persona Notes Sub-Resources ───────────────────────────────────
  { method: 'GET', path: '/api/v1/me/persona-notes/test-id', expect: [401], label: 'persona note by id', calledFrom: 'constants/endpoints.ts' },
  { method: 'POST', path: '/api/v1/me/persona-notes/test-id/transcribe', body: {}, expect: [401], label: 'persona note transcribe', calledFrom: 'hooks/useScreenshotAnalysis.ts' },

  // ─── Events / Telemetry ────────────────────────────────────────────
  { method: 'POST', path: '/api/v1/events/track', body: {}, expect: [200, 400, 401], label: 'events track', calledFrom: 'lib/backendAnalytics.ts' },
  { method: 'POST', path: '/api/telemetry/events', body: {}, expect: [200, 400, 401], label: 'telemetry events', calledFrom: 'lib/telemetry' },

  // ─── Webhooks (backend-to-backend, but must be deployed) ───────────
  { method: 'POST', path: '/api/webhooks/revenuecat', body: {}, expect: [400, 401, 403, 500], label: 'revenuecat webhook', calledFrom: 'RevenueCat dashboard' },
  { method: 'POST', path: '/api/webhooks/stripe', body: {}, expect: [400, 401, 403, 500], label: 'stripe webhook', calledFrom: 'Stripe dashboard' },

  // ─── Audit Logs ────────────────────────────────────────────────────
  { method: 'GET', path: '/api/v1/audit-logs', expect: [401, 403], label: 'audit-logs', calledFrom: 'admin' },

  // ─── Ops ───────────────────────────────────────────────────────────
  { method: 'GET', path: '/api/v1/ops/health', expect: [200, 401], label: 'ops health', calledFrom: 'constants/endpoints.ts' },
  { method: 'GET', path: '/api/v1/ops/config-status', expect: [200, 401], label: 'ops config-status', calledFrom: 'constants/endpoints.ts' },

  // ─── Push Notifications ────────────────────────────────────────────
  { method: 'POST', path: '/api/v1/me/push-tokens', body: {}, expect: [401], label: 'push tokens register', calledFrom: 'lib/notifications.ts' },

  // ─── App Data (provider) ───────────────────────────────────────────
  { method: 'GET', path: '/api/v1/app-data', expect: [401, 404], label: 'app-data', calledFrom: 'providers/AppDataProvider.tsx' },
];

// ============================================================================
// Test helpers
// ============================================================================

async function hitEndpoint(ep: EndpointCheck): Promise<{
  status: number;
  isJson: boolean;
  is404Html: boolean;
  body: string;
}> {
  const url = `${BASE}${ep.path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await fetch(url, {
    method: ep.method,
    headers,
    body: ep.body ? JSON.stringify(ep.body) : undefined,
  });

  const text = await res.text();
  const isJson = text.startsWith('{') || text.startsWith('[');
  const is404Html = text.includes('This page could not be found') || (res.status === 404 && text.includes('<!DOCTYPE'));

  return { status: res.status, isJson, is404Html, body: text.slice(0, 300) };
}

// ============================================================================
// Tests
// ============================================================================

describe('Mobile Endpoint Audit: Route Existence', () => {
  for (const ep of endpoints) {
    const tag = ep.critical ? '[CRITICAL] ' : '';
    it(`${tag}${ep.method} ${ep.path} — ${ep.label}`, async () => {
      const result = await hitEndpoint(ep);

      // FAIL if we get a 404 HTML page — means route is not deployed
      if (result.is404Html) {
        throw new Error(
          `ROUTE NOT DEPLOYED: ${ep.method} ${ep.path} returned 404 HTML.\n` +
          `Called from: ${ep.calledFrom}\n` +
          `${ep.critical ? 'THIS IS A CRITICAL MOBILE ENDPOINT.' : ''}`
        );
      }

      // Check status code matches expected
      expect(ep.expect).toContain(result.status);

      // All API responses should be JSON (not HTML), except redirects
      if (result.status !== 302) {
        expect(result.isJson).toBe(true);
      }
    }, 15000);
  }
});

// Summary test that prints a table at the end
describe('Mobile Endpoint Audit: Summary', () => {
  it('prints full audit results', async () => {
    const results: Array<{
      method: string;
      path: string;
      label: string;
      status: number;
      ok: boolean;
      deployed: boolean;
      critical: boolean;
    }> = [];

    for (const ep of endpoints) {
      const result = await hitEndpoint(ep);
      const deployed = !result.is404Html;
      const ok = deployed && ep.expect.includes(result.status);
      results.push({
        method: ep.method,
        path: ep.path,
        label: ep.label,
        status: result.status,
        ok,
        deployed,
        critical: ep.critical || false,
      });
    }

    // Print summary
    const deployed = results.filter(r => r.deployed);
    const notDeployed = results.filter(r => !r.deployed);
    const wrongStatus = results.filter(r => r.deployed && !r.ok);
    const criticalFails = results.filter(r => r.critical && !r.ok);

    console.log('\n' + '='.repeat(80));
    console.log('MOBILE ENDPOINT AUDIT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total endpoints tested: ${results.length}`);
    console.log(`  Deployed & OK:     ${results.filter(r => r.ok).length}`);
    console.log(`  NOT DEPLOYED:      ${notDeployed.length}`);
    console.log(`  Wrong status:      ${wrongStatus.length}`);
    console.log(`  CRITICAL FAILURES: ${criticalFails.length}`);

    if (notDeployed.length > 0) {
      console.log('\n--- NOT DEPLOYED (404 HTML) ---');
      for (const r of notDeployed) {
        console.log(`  ${r.critical ? 'CRITICAL ' : ''}${r.method} ${r.path} — ${r.label}`);
      }
    }

    if (wrongStatus.length > 0) {
      console.log('\n--- WRONG STATUS CODE ---');
      for (const r of wrongStatus) {
        console.log(`  ${r.method} ${r.path} — got ${r.status} — ${r.label}`);
      }
    }

    console.log('='.repeat(80) + '\n');

    // This test always passes — it's just for the summary output
    expect(true).toBe(true);
  }, 120000);
});
