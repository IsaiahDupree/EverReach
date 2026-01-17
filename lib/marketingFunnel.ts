/**
 * Marketing Funnel Tracking
 * 
 * Complete attribution chain from ad impression to conversion:
 * Ad Impression → Click → Landing → Install → First Open → Activation → Conversion
 */

import analytics from './analytics';
import { setUTMParams, envelopeManager } from './eventEnvelope';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

// ============================================================================
// Types
// ============================================================================

export type AdNetwork = 'meta' | 'tt' | 'google' | 'twitter' | 'linkedin' | 'organic';
export type AdPlacement = 'feed' | 'story' | 'search' | 'display' | 'video' | 'other';
export type InstallSource = 'app_store' | 'play_store' | 'web' | 'direct' | 'unknown';
export type ActivationType = 'contacts_10_plus' | 'first_outreach' | 'first_contact' | 'profile_completed';

export interface AdImpressionData {
  network: AdNetwork;
  campaign_id: string;
  creative_id: string;
  placement?: AdPlacement;
  ad_set_id?: string;
}

export interface AdClickData extends AdImpressionData {
  click_id?: string;
  destination_url?: string;
}

export interface LandingPageData {
  page: string;
  referrer?: string;
  variant?: string;
}

export interface InstallData {
  network?: AdNetwork;
  campaign_id?: string;
  install_source: InstallSource;
  install_referrer?: string;
}

export interface LeadCaptureData {
  source: 'lp' | 'quiz' | 'waitlist' | 'popup' | 'footer';
  email?: string;
  lead_score?: number;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  FIRST_INSTALL_TIME: '@first_install_time',
  FIRST_OPEN_TRACKED: '@first_open_tracked',
  ACTIVATION_EVENTS: '@activation_events',
  INSTALL_ATTRIBUTION: '@install_attribution',
} as const;

// ============================================================================
// Marketing Funnel Tracking Functions
// ============================================================================

/**
 * Track ad impression (external - called from ad platform SDK)
 */
export async function trackAdImpression(data: AdImpressionData): Promise<void> {
  await analytics.track('ad_impression', {
    network: data.network,
    campaign_id: data.campaign_id,
    creative_id: data.creative_id,
    placement: data.placement,
    ad_set_id: data.ad_set_id,
  });
}

/**
 * Track ad click (external - called from ad platform SDK or deep link)
 */
export async function trackAdClick(data: AdClickData): Promise<void> {
  // Set UTM parameters from ad click
  if (data.campaign_id) {
    await setUTMParams({
      utm_source: data.network,
      utm_campaign: data.campaign_id,
      utm_medium: 'cpc',
      utm_content: data.creative_id,
    });
  }

  await analytics.track('ad_click', {
    network: data.network,
    campaign_id: data.campaign_id,
    creative_id: data.creative_id,
    placement: data.placement,
    click_id: data.click_id,
    destination_url: data.destination_url?.substring(0, 200),
  });
}

/**
 * Track landing page view
 */
export async function trackLandingView(data: LandingPageData): Promise<void> {
  await analytics.track('landing_view', {
    page: data.page,
    referrer: data.referrer?.substring(0, 200),
    variant: data.variant,
  });
}

/**
 * Track lead capture (email signup, waitlist, etc.)
 */
export async function trackLeadCapture(data: LeadCaptureData): Promise<void> {
  await analytics.track('lead_captured', {
    source: data.source,
    has_email: !!data.email,
    lead_score: data.lead_score,
  });
}

/**
 * Track app install
 * Call this once when app is first installed
 */
export async function trackInstall(data: InstallData): Promise<void> {
  try {
    // Check if already tracked
    const existingInstall = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_INSTALL_TIME);
    if (existingInstall) {
      console.log('[MarketingFunnel] Install already tracked');
      return;
    }

    // Store install time
    const installTime = Date.now().toString();
    await AsyncStorage.setItem(STORAGE_KEYS.FIRST_INSTALL_TIME, installTime);

    // Store install attribution
    await AsyncStorage.setItem(STORAGE_KEYS.INSTALL_ATTRIBUTION, JSON.stringify(data));

    // Set install source in envelope
    await envelopeManager.setInstallSource(data.install_source);

    // Track install event
    await analytics.track('install_tracked', {
      network: data.network,
      campaign_id: data.campaign_id,
      install_source: data.install_source,
      install_referrer: data.install_referrer?.substring(0, 200),
    });

    console.log('[MarketingFunnel] Install tracked:', data.install_source);
  } catch (error) {
    console.error('[MarketingFunnel] Error tracking install:', error);
  }
}

/**
 * Track first app open after install
 * Call this on first app launch
 */
export async function trackFirstOpen(): Promise<void> {
  try {
    // Check if already tracked
    const alreadyTracked = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_OPEN_TRACKED);
    if (alreadyTracked === 'true') {
      return;
    }

    // Get install attribution
    const attributionStr = await AsyncStorage.getItem(STORAGE_KEYS.INSTALL_ATTRIBUTION);
    const attribution = attributionStr ? JSON.parse(attributionStr) : {};

    // Mark as tracked
    await AsyncStorage.setItem(STORAGE_KEYS.FIRST_OPEN_TRACKED, 'true');

    // Track first open
    await analytics.track('first_open_post_install', {
      install_source: attribution.install_source || 'unknown',
      network: attribution.network,
      campaign_id: attribution.campaign_id,
    });

    console.log('[MarketingFunnel] First open tracked');
  } catch (error) {
    console.error('[MarketingFunnel] Error tracking first open:', error);
  }
}

/**
 * Track activation event (key milestone)
 */
export async function trackActivation(type: ActivationType, metadata?: Record<string, any>): Promise<void> {
  try {
    // Get existing activation events
    const existingStr = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVATION_EVENTS);
    const existing = existingStr ? JSON.parse(existingStr) : {};

    // Check if this type already tracked
    if (existing[type]) {
      console.log('[MarketingFunnel] Activation already tracked:', type);
      return;
    }

    // Mark as tracked
    existing[type] = {
      tracked_at: new Date().toISOString(),
      metadata,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVATION_EVENTS, JSON.stringify(existing));

    // Track activation event
    await analytics.track('activation_event', {
      type,
      ...metadata,
    });

    console.log('[MarketingFunnel] Activation tracked:', type);
  } catch (error) {
    console.error('[MarketingFunnel] Error tracking activation:', error);
  }
}

/**
 * Track qualified signup (high-quality user)
 */
export async function trackQualifiedSignup(leadScore: number): Promise<void> {
  await analytics.track('qualified_signup', {
    lead_score: leadScore,
  });
}

/**
 * Parse deep link and extract UTM parameters
 * Call this in app startup to handle deep links
 */
export async function handleDeepLink(url?: string): Promise<void> {
  try {
    const parsedUrl = url ? Linking.parse(url) : await Linking.parseInitialURLAsync();
    
    if (!parsedUrl || !parsedUrl.queryParams) {
      return;
    }

    const params = parsedUrl.queryParams;

    // Extract UTM parameters
    const utmParams: any = {};
    if (params.utm_source) utmParams.utm_source = params.utm_source as string;
    if (params.utm_campaign) utmParams.utm_campaign = params.utm_campaign as string;
    if (params.utm_medium) utmParams.utm_medium = params.utm_medium as string;
    if (params.utm_content) utmParams.utm_content = params.utm_content as string;
    if (params.utm_term) utmParams.utm_term = params.utm_term as string;

    // Set UTM params if any found
    if (Object.keys(utmParams).length > 0) {
      await setUTMParams(utmParams);
      console.log('[MarketingFunnel] UTM params extracted from deep link:', utmParams);
    }

    // Extract ad network info
    if (params.fbclid) {
      // Facebook click ID
      await trackAdClick({
        network: 'meta',
        campaign_id: params.campaign_id as string || 'unknown',
        creative_id: params.creative_id as string || 'unknown',
        click_id: params.fbclid as string,
      });
    } else if (params.gclid) {
      // Google click ID
      await trackAdClick({
        network: 'google',
        campaign_id: params.campaign_id as string || 'unknown',
        creative_id: params.creative_id as string || 'unknown',
        click_id: params.gclid as string,
      });
    } else if (params.ttclid) {
      // TikTok click ID
      await trackAdClick({
        network: 'tt',
        campaign_id: params.campaign_id as string || 'unknown',
        creative_id: params.creative_id as string || 'unknown',
        click_id: params.ttclid as string,
      });
    }
  } catch (error) {
    console.error('[MarketingFunnel] Error handling deep link:', error);
  }
}

/**
 * Get install attribution
 */
export async function getInstallAttribution(): Promise<InstallData | null> {
  try {
    const attributionStr = await AsyncStorage.getItem(STORAGE_KEYS.INSTALL_ATTRIBUTION);
    return attributionStr ? JSON.parse(attributionStr) : null;
  } catch (error) {
    console.error('[MarketingFunnel] Error getting install attribution:', error);
    return null;
  }
}

/**
 * Check if activation milestone has been reached
 */
export async function hasActivated(type: ActivationType): Promise<boolean> {
  try {
    const existingStr = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVATION_EVENTS);
    const existing = existingStr ? JSON.parse(existingStr) : {};
    return !!existing[type];
  } catch (error) {
    console.error('[MarketingFunnel] Error checking activation:', error);
    return false;
  }
}

/**
 * Initialize marketing funnel tracking
 * Call this at app startup
 */
export async function initializeMarketingFunnel(): Promise<void> {
  try {
    // Handle deep link
    await handleDeepLink();

    // Check if this is first install
    const installTime = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_INSTALL_TIME);
    if (!installTime) {
      // First install - track it
      await trackInstall({
        install_source: 'app_store', // Default, should be detected by platform
      });
    }

    // Track first open if not already tracked
    await trackFirstOpen();

    console.log('[MarketingFunnel] Initialized');
  } catch (error) {
    console.error('[MarketingFunnel] Initialization error:', error);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export const marketingFunnel = {
  // Core tracking
  trackAdImpression,
  trackAdClick,
  trackLandingView,
  trackLeadCapture,
  trackInstall,
  trackFirstOpen,
  trackActivation,
  trackQualifiedSignup,
  
  // Utilities
  handleDeepLink,
  getInstallAttribution,
  hasActivated,
  initialize: initializeMarketingFunnel,
};

export default marketingFunnel;
