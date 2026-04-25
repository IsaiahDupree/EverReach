/**
 * Tests for lib/ga4.ts
 *
 * Verifies GA4 initialization, page view tracking, and event tracking
 * behave correctly on web and no-op when not initialized.
 *
 * Uses jest.isolateModules() + synchronous require() to get a fresh module
 * instance per test, resetting the module-level `initialized` flag.
 * Platform.OS is set to 'web' inside each isolated scope before requiring ga4.
 */

/** Load a fresh ga4 module with Platform.OS='web' and optional GA4 ID. */
function loadGA4(measurementId?: string) {
  let mod: typeof import('../../lib/ga4');
  jest.isolateModules(() => {
    // Set GA4 ID before module evaluation (module reads it at load time)
    if (measurementId) {
      process.env.EXPO_PUBLIC_GA4_MEASUREMENT_ID = measurementId;
    } else {
      delete process.env.EXPO_PUBLIC_GA4_MEASUREMENT_ID;
    }
    // Set Platform.OS='web' in the isolated react-native instance
    const rn = require('react-native') as any;
    rn.Platform.OS = 'web';
    mod = require('../../lib/ga4');
  });
  return mod!;
}

beforeEach(() => {
  document.head.innerHTML = '';
  delete (window as any).dataLayer;
  delete (window as any).gtag;
  delete process.env.EXPO_PUBLIC_GA4_MEASUREMENT_ID;
});

describe('initializeGA4', () => {
  it('injects gtag script and initializes dataLayer when GA4_ID is set', () => {
    const { initializeGA4 } = loadGA4('G-TESTID123');
    initializeGA4();

    const script = document.head.querySelector('script') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.src).toContain('googletagmanager.com/gtag/js?id=G-TESTID123');
    expect(window.dataLayer).toBeDefined();
    expect(typeof window.gtag).toBe('function');
  });

  it('does nothing when EXPO_PUBLIC_GA4_MEASUREMENT_ID is not set', () => {
    const { initializeGA4 } = loadGA4(); // no ID
    initializeGA4();

    const script = document.head.querySelector('script');
    expect(script).toBeNull();
    expect((window as any).gtag).toBeUndefined();
  });

  it('only injects the script once when called multiple times', () => {
    const { initializeGA4 } = loadGA4('G-TESTID123');
    initializeGA4();
    initializeGA4();
    initializeGA4();

    const scripts = document.head.querySelectorAll('script');
    expect(scripts.length).toBe(1);
  });
});

describe('trackGA4PageView', () => {
  it('calls gtag with page_view event after init', () => {
    const { initializeGA4, trackGA4PageView } = loadGA4('G-TESTID123');
    initializeGA4();

    const gtagSpy = jest.fn();
    window.gtag = gtagSpy;

    trackGA4PageView('/blog', 'EverReach Blog');

    expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/blog',
      page_title: 'EverReach Blog',
    });
  });

  it('uses document.title when no title argument is provided', () => {
    document.title = 'Auto Title';
    const { initializeGA4, trackGA4PageView } = loadGA4('G-TESTID123');
    initializeGA4();

    const gtagSpy = jest.fn();
    window.gtag = gtagSpy;

    trackGA4PageView('/contacts');

    expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/contacts',
      page_title: 'Auto Title',
    });
  });

  it('is a no-op when called before initializeGA4', () => {
    const { trackGA4PageView } = loadGA4('G-TESTID123');
    // Don't call initializeGA4
    expect(() => trackGA4PageView('/test')).not.toThrow();
    expect((window as any).gtag).toBeUndefined();
  });
});

describe('trackGA4Event', () => {
  it('calls gtag with custom event name and params', () => {
    const { initializeGA4, trackGA4Event } = loadGA4('G-TESTID123');
    initializeGA4();

    const gtagSpy = jest.fn();
    window.gtag = gtagSpy;

    trackGA4Event('article_view', { slug: 'how-to-reconnect', category: 'relationships' });

    expect(gtagSpy).toHaveBeenCalledWith('event', 'article_view', {
      slug: 'how-to-reconnect',
      category: 'relationships',
    });
  });

  it('calls gtag with undefined params when none provided', () => {
    const { initializeGA4, trackGA4Event } = loadGA4('G-TESTID123');
    initializeGA4();

    const gtagSpy = jest.fn();
    window.gtag = gtagSpy;

    trackGA4Event('app_install_click');

    expect(gtagSpy).toHaveBeenCalledWith('event', 'app_install_click', undefined);
  });
});
