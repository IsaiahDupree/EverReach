/**
 * Global Event Envelope
 * 
 * Wraps all analytics events with standard metadata:
 * - Session ID
 * - UTM parameters (marketing attribution)
 * - Experiment assignments (A/B testing)
 * - Device & app metadata
 * - Privacy consent flags
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ============================================================================
// Types
// ============================================================================

export interface EventEnvelope {
  event_id: string;
  event_name: string;
  event_time: string;
  user_id: string | null;
  anon_id: string;
  session_id: string | null;
  properties: Record<string, any>;
  app: AppMetadata;
  device: DeviceMetadata;
  privacy: PrivacyMetadata;
  exp: ExperimentMetadata;
  source: SourceMetadata;
}

export interface AppMetadata {
  platform: 'ios' | 'android' | 'web';
  version: string;
  build: number;
  name: string;
}

export interface DeviceMetadata {
  locale: string;
  tz: string;
  os_version?: string;
  device_model?: string;
}

export interface PrivacyMetadata {
  consent_analytics: boolean;
  consent_marketing: boolean;
  att_status?: 'authorized' | 'denied' | 'not_determined' | 'restricted';
}

export interface ExperimentMetadata {
  [experimentName: string]: string; // experiment -> variant
}

export interface SourceMetadata {
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
  install_source?: string;
  referrer?: string;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  ANON_ID: '@anon_id',
  SESSION_ID: '@session_id',
  UTM_PARAMS: '@utm_params',
  INSTALL_SOURCE: '@install_source',
  EXPERIMENTS: '@active_experiments',
  CONSENT_ANALYTICS: '@consent_analytics',
  CONSENT_MARKETING: '@consent_marketing',
} as const;

// ============================================================================
// Singleton State
// ============================================================================

class EnvelopeManager {
  private anonId: string | null = null;
  private sessionId: string | null = null;
  private utmParams: SourceMetadata = {};
  private experiments: ExperimentMetadata = {};
  private consentAnalytics: boolean = true;
  private consentMarketing: boolean = false;
  private initialized: boolean = false;

  /**
   * Initialize envelope manager (call once at app start)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load anonymous ID
      let anonId = await AsyncStorage.getItem(STORAGE_KEYS.ANON_ID);
      if (!anonId) {
        anonId = this.generateId('anon');
        await AsyncStorage.setItem(STORAGE_KEYS.ANON_ID, anonId);
      }
      this.anonId = anonId;

      // Load session ID (will be set by useAppLifecycle)
      this.sessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);

      // Load UTM params
      const utmStr = await AsyncStorage.getItem(STORAGE_KEYS.UTM_PARAMS);
      if (utmStr) {
        this.utmParams = JSON.parse(utmStr);
      }

      // Load install source
      const installSource = await AsyncStorage.getItem(STORAGE_KEYS.INSTALL_SOURCE);
      if (installSource) {
        this.utmParams.install_source = installSource;
      }

      // Load experiments
      const expStr = await AsyncStorage.getItem(STORAGE_KEYS.EXPERIMENTS);
      if (expStr) {
        this.experiments = JSON.parse(expStr);
      }

      // Load consent
      const analyticsConsent = await AsyncStorage.getItem(STORAGE_KEYS.CONSENT_ANALYTICS);
      const marketingConsent = await AsyncStorage.getItem(STORAGE_KEYS.CONSENT_MARKETING);
      this.consentAnalytics = analyticsConsent !== 'false'; // default true
      this.consentMarketing = marketingConsent === 'true'; // default false

      this.initialized = true;
      console.log('[EventEnvelope] Initialized', {
        anonId: this.anonId?.substring(0, 12) + '...',
        sessionId: this.sessionId?.substring(0, 12) + '...',
        hasUtm: Object.keys(this.utmParams).length > 0,
        experiments: Object.keys(this.experiments).length,
      });
    } catch (error) {
      console.error('[EventEnvelope] Initialization error:', error);
      this.initialized = true; // Continue anyway
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Set session ID (called by useAppLifecycle)
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Set UTM parameters (for marketing attribution)
   */
  async setUTMParams(params: SourceMetadata): Promise<void> {
    this.utmParams = { ...this.utmParams, ...params };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UTM_PARAMS, JSON.stringify(this.utmParams));
    } catch (error) {
      console.error('[EventEnvelope] Error saving UTM params:', error);
    }
  }

  /**
   * Set install source (called once at first launch)
   */
  async setInstallSource(source: string): Promise<void> {
    this.utmParams.install_source = source;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.INSTALL_SOURCE, source);
    } catch (error) {
      console.error('[EventEnvelope] Error saving install source:', error);
    }
  }

  /**
   * Assign user to experiment variant
   */
  async assignExperiment(experimentName: string, variant: string): Promise<void> {
    this.experiments[experimentName] = variant;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EXPERIMENTS, JSON.stringify(this.experiments));
    } catch (error) {
      console.error('[EventEnvelope] Error saving experiment:', error);
    }
  }

  /**
   * Remove experiment assignment
   */
  async removeExperiment(experimentName: string): Promise<void> {
    delete this.experiments[experimentName];
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EXPERIMENTS, JSON.stringify(this.experiments));
    } catch (error) {
      console.error('[EventEnvelope] Error removing experiment:', error);
    }
  }

  /**
   * Set analytics consent
   */
  async setAnalyticsConsent(enabled: boolean): Promise<void> {
    this.consentAnalytics = enabled;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONSENT_ANALYTICS, enabled.toString());
    } catch (error) {
      console.error('[EventEnvelope] Error saving analytics consent:', error);
    }
  }

  /**
   * Set marketing consent
   */
  async setMarketingConsent(enabled: boolean): Promise<void> {
    this.consentMarketing = enabled;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONSENT_MARKETING, enabled.toString());
    } catch (error) {
      console.error('[EventEnvelope] Error saving marketing consent:', error);
    }
  }

  /**
   * Get app metadata
   */
  private getAppMetadata(): AppMetadata {
    return {
      platform: Platform.OS as 'ios' | 'android' | 'web',
      version: Constants.expoConfig?.version || '1.0.0',
      build: parseInt(String(Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1'), 10),
      name: Constants.expoConfig?.name || 'EverReach',
    };
  }

  /**
   * Get device metadata
   */
  private getDeviceMetadata(): DeviceMetadata {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

    return {
      locale,
      tz,
      os_version: Platform.Version ? String(Platform.Version) : undefined,
      device_model: Constants.deviceName || undefined,
    };
  }

  /**
   * Get privacy metadata
   */
  private getPrivacyMetadata(): PrivacyMetadata {
    return {
      consent_analytics: this.consentAnalytics,
      consent_marketing: this.consentMarketing,
      // ATT status would be set via separate iOS-specific API
    };
  }

  /**
   * Wrap event with envelope
   */
  wrap(
    eventName: string,
    properties: Record<string, any> = {},
    userId?: string | null
  ): EventEnvelope {
    return {
      event_id: this.generateId('evt'),
      event_name: eventName,
      event_time: new Date().toISOString(),
      user_id: userId || null,
      anon_id: this.anonId || 'unknown',
      session_id: this.sessionId,
      properties,
      app: this.getAppMetadata(),
      device: this.getDeviceMetadata(),
      privacy: this.getPrivacyMetadata(),
      exp: { ...this.experiments },
      source: { ...this.utmParams },
    };
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get anonymous ID
   */
  getAnonId(): string | null {
    return this.anonId;
  }

  /**
   * Get current experiments
   */
  getExperiments(): ExperimentMetadata {
    return { ...this.experiments };
  }

  /**
   * Get UTM params
   */
  getUTMParams(): SourceMetadata {
    return { ...this.utmParams };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const envelopeManager = new EnvelopeManager();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Initialize envelope manager (call at app start)
 */
export async function initializeEnvelope(): Promise<void> {
  await envelopeManager.initialize();
}

/**
 * Wrap event with envelope
 */
export function wrapEvent(
  eventName: string,
  properties?: Record<string, any>,
  userId?: string | null
): EventEnvelope {
  return envelopeManager.wrap(eventName, properties, userId);
}

/**
 * Set UTM parameters (for marketing attribution)
 */
export async function setUTMParams(params: SourceMetadata): Promise<void> {
  await envelopeManager.setUTMParams(params);
}

/**
 * Assign user to experiment
 */
export async function assignExperiment(experimentName: string, variant: string): Promise<void> {
  await envelopeManager.assignExperiment(experimentName, variant);
}

/**
 * Set consent preferences
 */
export async function setConsent(analytics: boolean, marketing: boolean): Promise<void> {
  await envelopeManager.setAnalyticsConsent(analytics);
  await envelopeManager.setMarketingConsent(marketing);
}

export default envelopeManager;
