/**
 * GA4 (Google Analytics 4) Web Integration
 *
 * Injects gtag.js on web platform and provides tracking helpers.
 * Set EXPO_PUBLIC_GA4_MEASUREMENT_ID in environment/Vercel to activate.
 */
import { Platform } from 'react-native';

const GA4_ID = process.env.EXPO_PUBLIC_GA4_MEASUREMENT_ID || '';

let initialized = false;

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * Inject the GA4 gtag.js script into the page head (web only).
 * Safe to call multiple times — only injects once.
 */
export function initializeGA4(): void {
  if (Platform.OS !== 'web' || initialized || !GA4_ID) {
    if (!GA4_ID && Platform.OS === 'web') {
      console.log('[GA4] No measurement ID set (EXPO_PUBLIC_GA4_MEASUREMENT_ID)');
    }
    return;
  }

  try {
    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, {
      send_page_view: false, // We'll send page views manually for SPA routing
    });

    // Inject the gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(script);

    initialized = true;
    console.log('[GA4] Initialized with ID:', GA4_ID);
  } catch (e) {
    console.warn('[GA4] Failed to initialize:', e);
  }
}

/**
 * Track a page view (call on route change in SPA).
 */
export function trackGA4PageView(path: string, title?: string): void {
  if (Platform.OS !== 'web' || !initialized || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  });
}

/**
 * Track a custom GA4 event.
 */
export function trackGA4Event(eventName: string, params?: Record<string, any>): void {
  if (Platform.OS !== 'web' || !initialized || !window.gtag) return;
  window.gtag('event', eventName, params);
}
