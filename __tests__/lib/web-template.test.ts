/**
 * Tests for web/index.html template
 *
 * Verifies the GA4 snippet is hardcoded in the HTML template so Google's
 * verification crawler can detect it in the raw page source.
 */

import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(
  path.resolve(__dirname, '../../web/index.html'),
  'utf-8'
);

const GA4_ID = 'G-44EPHHK7EB';

describe('web/index.html GA4 template', () => {
  it('contains the gtag.js script tag with correct measurement ID', () => {
    expect(template).toContain(
      `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
    );
  });

  it('contains the gtag config call with correct measurement ID', () => {
    expect(template).toContain(`gtag('config', '${GA4_ID}')`);
  });

  it('contains dataLayer initialization', () => {
    expect(template).toContain('window.dataLayer = window.dataLayer || []');
  });

  it('GA4 script appears in <head> before </head>', () => {
    const headEnd = template.indexOf('</head>');
    const gtagScript = template.indexOf('googletagmanager.com');
    expect(gtagScript).toBeGreaterThan(0);
    expect(gtagScript).toBeLessThan(headEnd);
  });

  it('retains Expo template placeholders', () => {
    expect(template).toContain('%LANG_ISO_CODE%');
    expect(template).toContain('%WEB_TITLE%');
  });

  it('retains expo-reset styles', () => {
    expect(template).toContain('id="expo-reset"');
  });

  it('retains root div for Expo app mount', () => {
    expect(template).toContain('<div id="root">');
  });
});
