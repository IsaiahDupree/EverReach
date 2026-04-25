/**
 * Tests for vercel.json configuration
 *
 * Verifies caching headers are correctly configured for:
 * - Expo static asset bundles (/_expo/static/)
 * - Legacy static assets (/static/)
 * - HTML root with stale-while-revalidate
 */

import * as fs from 'fs';
import * as path from 'path';

const vercelConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../vercel.json'), 'utf-8')
);

describe('vercel.json caching headers', () => {
  const headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> =
    vercelConfig.headers;

  function getHeadersForSource(source: string) {
    const rule = headers.find((h) => h.source === source);
    return rule ? Object.fromEntries(rule.headers.map((h) => [h.key, h.value])) : null;
  }

  it('sets immutable long-cache on /_expo/static/ assets', () => {
    const h = getHeadersForSource('/_expo/static/(.*)');
    expect(h).not.toBeNull();
    expect(h!['Cache-Control']).toBe('public, max-age=31536000, immutable');
  });

  it('sets immutable long-cache on /static/ assets', () => {
    const h = getHeadersForSource('/static/(.*)');
    expect(h).not.toBeNull();
    expect(h!['Cache-Control']).toBe('public, max-age=31536000, immutable');
  });

  it('sets stale-while-revalidate on root HTML', () => {
    const h = getHeadersForSource('/');
    expect(h).not.toBeNull();
    expect(h!['Cache-Control']).toContain('stale-while-revalidate');
  });

  it('sets security headers on all routes', () => {
    const h = getHeadersForSource('/(.*)');
    expect(h).not.toBeNull();
    expect(h!['X-Content-Type-Options']).toBe('nosniff');
    expect(h!['X-Frame-Options']).toBe('DENY');
  });
});

describe('vercel.json rewrites', () => {
  it('has SPA catch-all rewrite to index.html', () => {
    const rewrites = vercelConfig.rewrites;
    const catchAll = rewrites.find((r: any) => r.source === '/(.*)');
    expect(catchAll).toBeDefined();
    expect(catchAll.destination).toBe('/index.html');
  });
});

describe('vercel.json build config', () => {
  it('uses expo export for web build', () => {
    expect(vercelConfig.buildCommand).toBe('npx expo export --platform web');
    expect(vercelConfig.outputDirectory).toBe('dist');
  });
});
