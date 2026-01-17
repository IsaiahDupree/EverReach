/**
 * Meta Pixel + Conversions API Integration
 * 
 * Client-side: Meta Pixel for browser tracking
 * Server-side: Conversions API for accurate attribution
 */

import { Platform } from 'react-native';

// Meta Pixel ID - Set via environment variable
const PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID || '';

// Conversions API Access Token (for server-side events)
const CONVERSIONS_API_TOKEN = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || '';

// Check if we're on web platform AND in browser (not SSR)
const IS_WEB = Platform.OS === 'web';
const IS_BROWSER = IS_WEB && typeof window !== 'undefined' && typeof document !== 'undefined';

// Meta Domain Verification ID - This is added via +html.tsx for SSR, not dynamically
const DOMAIN_VERIFICATION_ID = '0iq3tr1n2l3el130yp44fgehya7jcw';

// Initialize Meta Pixel (client-side, browser only - NOT during SSR)
export function initializeMetaPixel(): void {
  // Skip during SSR - no window/document available
  if (!IS_BROWSER) {
    return;
  }
  
  if (!PIXEL_ID) {
    console.log('[MetaPixel] Skipping pixel initialization (no pixel ID)');
    return;
  }

  // Check if already initialized
  if ((window as any).fbq) {
    console.log('[MetaPixel] Already initialized');
    return;
  }

  try {
    // Meta Pixel base code
    const script = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${PIXEL_ID}');
      fbq('track', 'PageView');
    `;

    // Execute the script
    const scriptElement = document.createElement('script');
    scriptElement.innerHTML = script;
    document.head.appendChild(scriptElement);

    // Add noscript fallback
    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);

    console.log('[MetaPixel] Initialized successfully');
  } catch (error) {
    console.error('[MetaPixel] Failed to initialize:', error);
  }
}

// Track page view
export function trackPageView(url?: string): void {
  if (!IS_WEB || !PIXEL_ID) return;

  try {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView', url ? { page: url } : undefined);
      console.log('[MetaPixel] PageView tracked:', url || 'current page');
    }
  } catch (error) {
    console.error('[MetaPixel] Failed to track PageView:', error);
  }
}

// Track standard events
export function trackEvent(
  eventName: 'ViewContent' | 'CompleteRegistration' | 'StartTrial' | 'Purchase' | 'AddPaymentInfo' | 'Lead' | 'Contact' | string,
  params?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    num_items?: number;
    [key: string]: any;
  }
): void {
  if (!IS_WEB || !PIXEL_ID) return;

  try {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', eventName, params);
      console.log('[MetaPixel] Event tracked:', eventName, params);
    }
  } catch (error) {
    console.error('[MetaPixel] Failed to track event:', error);
  }
}

// Track custom events
export function trackCustomEvent(eventName: string, params?: Record<string, any>): void {
  if (!IS_WEB || !PIXEL_ID) return;

  try {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('trackCustom', eventName, params);
      console.log('[MetaPixel] Custom event tracked:', eventName, params);
    }
  } catch (error) {
    console.error('[MetaPixel] Failed to track custom event:', error);
  }
}

/**
 * Server-side Conversions API event
 * Call this from your backend or API routes for more accurate tracking
 */
export async function sendServerEvent(
  eventName: string,
  eventData: {
    event_time?: number;
    event_source_url?: string;
    user_data?: {
      em?: string; // Hashed email
      ph?: string; // Hashed phone
      fn?: string; // Hashed first name
      ln?: string; // Hashed last name
      client_user_agent?: string;
      fbc?: string; // Facebook click ID
      fbp?: string; // Facebook browser ID
    };
    custom_data?: {
      currency?: string;
      value?: number;
      content_name?: string;
      content_category?: string;
      content_ids?: string[];
      content_type?: string;
      [key: string]: any;
    };
    action_source?: 'website' | 'app' | 'phone_call' | 'chat' | 'email' | 'other';
  }
): Promise<boolean> {
  if (!PIXEL_ID || !CONVERSIONS_API_TOKEN) {
    console.log('[MetaPixel] Server event skipped (no pixel ID or token)');
    return false;
  }

  try {
    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: eventData.event_time || Math.floor(Date.now() / 1000),
          action_source: eventData.action_source || 'website',
          event_source_url: eventData.event_source_url,
          user_data: eventData.user_data || {},
          custom_data: eventData.custom_data || {},
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${CONVERSIONS_API_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[MetaPixel] Server event failed:', error);
      return false;
    }

    console.log('[MetaPixel] Server event sent:', eventName);
    return true;
  } catch (error) {
    console.error('[MetaPixel] Failed to send server event:', error);
    return false;
  }
}

// Hash function for user data (SHA-256)
export async function hashUserData(value: string): Promise<string> {
  if (!value) return '';
  
  const normalized = value.toLowerCase().trim();
  
  if (IS_WEB && typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for non-web or no crypto API
  return normalized;
}

// Get Facebook browser ID from cookie
export function getFbp(): string | null {
  if (!IS_WEB || typeof document === 'undefined') return null;
  
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match ? match[1] : null;
}

// Get Facebook click ID from URL or cookie
export function getFbc(): string | null {
  if (!IS_WEB || typeof window === 'undefined') return null;
  
  // Check URL first for fbclid
  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get('fbclid');
  if (fbclid) {
    // Generate fbc format: fb.{subdomain_index}.{creation_time}.{fbclid}
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    // Save to cookie for future use (90 days expiry)
    saveFbcToCookie(fbc);
    return fbc;
  }
  
  // Check cookie
  const match = document.cookie.match(/_fbc=([^;]+)/);
  return match ? match[1] : null;
}

// Save fbc to cookie for persistence across sessions
function saveFbcToCookie(fbc: string): void {
  if (!IS_BROWSER) return;
  try {
    const expires = new Date();
    expires.setDate(expires.getDate() + 90); // 90 days
    document.cookie = `_fbc=${fbc}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    console.log('[MetaPixel] Saved fbc to cookie:', fbc);
  } catch (e) {
    console.error('[MetaPixel] Failed to save fbc cookie:', e);
  }
}

// Initialize fbc capture on page load (call this early in app lifecycle)
export function initializeFbcCapture(): void {
  if (!IS_BROWSER) return;
  
  // Check for fbclid in URL and save to cookie
  const fbc = getFbc();
  if (fbc) {
    console.log('[MetaPixel] fbc captured:', fbc);
  }
}
