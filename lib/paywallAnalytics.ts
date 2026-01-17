import { paywallConfigService } from './paywallConfig';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';

export type PaywallEventType = 
  | 'impression' 
  | 'cta_click' 
  | 'dismissed' 
  | 'skipped' 
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_cancelled';

export async function trackPaywallEvent(
  eventType: PaywallEventType,
  metadata?: Record<string, any>
) {
  const timestamp = new Date().toISOString();
  console.log('\n📊 [PaywallAnalytics] TRACKING EVENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Event: ${eventType}`);
  console.log(`   Time: ${timestamp}`);
  if (metadata) {
    console.log(`   Metadata:`, metadata);
  }
  
  try {
    const config = await paywallConfigService.getConfig();
    const authToken = await AsyncStorage.getItem('@auth_token');
    
    const eventData = {
      event_type: eventType,
      platform: 'mobile',
      config_snapshot: {
        strategy_id: config.strategy.id,
        strategy_name: config.strategy.name,
        strategy_mode: config.strategy.mode,
        presentation_id: config.presentation.id,
        presentation_variant: config.presentation.variant,
        trial_id: config.trial.id,
        trial_type: config.trial.type,
      },
      metadata,
      occurred_at: timestamp,
    };

    console.log('   Config Snapshot:');
    console.log(`     Strategy: ${config.strategy.name} (${config.strategy.mode})`);
    console.log(`     Presentation: ${config.presentation.variant}`);
    console.log(`     Trial: ${config.trial.type}`);

    // Send to backend analytics
    const url = `${API_BASE}/api/v1/analytics/paywall`;
    console.log(`   Sending to: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(eventData),
    });
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.warn(`\n⚠️  [PaywallAnalytics] Failed to track event`);
      console.warn(`   Status: ${response.status}`);
      console.warn(`   Duration: ${duration}ms`);
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log(`\n✅ [PaywallAnalytics] Event tracked successfully (${duration}ms)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  } catch (error) {
    // Quietly log analytics failures (likely CORS or network issues)
    // These are non-critical and shouldn't break the app
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('CORS') || errorMessage.includes('NetworkError')) {
      console.warn(`⚠️  [PaywallAnalytics] Analytics blocked (CORS/Network) - non-critical`);
    } else {
      console.warn(`⚠️  [PaywallAnalytics] Failed to track ${eventType}:`, errorMessage);
    }
    // Don't throw - analytics failures shouldn't break the app
  }
}

/**
 * Track paywall impression (when paywall is shown)
 */
export async function trackPaywallImpression(metadata?: Record<string, any>) {
  return trackPaywallEvent('impression', metadata);
}

/**
 * Track CTA click (when "Subscribe" or "Upgrade" button is clicked)
 */
export async function trackPaywallCTAClick(metadata?: Record<string, any>) {
  return trackPaywallEvent('cta_click', metadata);
}

/**
 * Track paywall dismissed (when user closes paywall)
 */
export async function trackPaywallDismissed(metadata?: Record<string, any>) {
  return trackPaywallEvent('dismissed', metadata);
}

/**
 * Track paywall skipped (when user clicks "Skip" or "Maybe later")
 */
export async function trackPaywallSkipped(metadata?: Record<string, any>) {
  return trackPaywallEvent('skipped', metadata);
}

/**
 * Track checkout started (when user enters payment flow)
 */
export async function trackCheckoutStarted(metadata?: Record<string, any>) {
  return trackPaywallEvent('checkout_started', metadata);
}

/**
 * Track checkout completed (when user successfully subscribes)
 */
export async function trackCheckoutCompleted(metadata?: Record<string, any>) {
  return trackPaywallEvent('checkout_completed', metadata);
}

/**
 * Track checkout cancelled (when user exits payment flow)
 */
export async function trackCheckoutCancelled(metadata?: Record<string, any>) {
  return trackPaywallEvent('checkout_cancelled', metadata);
}
