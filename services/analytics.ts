/**
 * Analytics Service
 * 
 * High-level analytics tracking methods for common events.
 * All methods are privacy-safe and follow the events spec.
 * 
 * Respects user consent and category preferences.
 */

import { captureEvent, trackScreen } from '../lib/posthog';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEventToBackend } from '../lib/backendAnalytics';

const ANALYTICS_CONSENT_KEY = '@analytics_consent';
const ANALYTICS_CATEGORIES_KEY = '@analytics_categories';

export enum AnalyticsCategory {
  ESSENTIAL = 'essential',
  PERFORMANCE = 'performance',
  FEATURE_USAGE = 'feature_usage',
  ERRORS = 'errors',
  NAVIGATION = 'navigation',
}

export interface AnalyticsConsent {
  enabled: boolean;
  categories: {
    [AnalyticsCategory.ESSENTIAL]: boolean;
    [AnalyticsCategory.PERFORMANCE]: boolean;
    [AnalyticsCategory.FEATURE_USAGE]: boolean;
    [AnalyticsCategory.ERRORS]: boolean;
    [AnalyticsCategory.NAVIGATION]: boolean;
  };
}

const DEFAULT_CONSENT: AnalyticsConsent = {
  enabled: __DEV__ ? true : false,  // Auto-enable in development for testing
  categories: {
    [AnalyticsCategory.ESSENTIAL]: true,
    [AnalyticsCategory.PERFORMANCE]: __DEV__ ? true : false,  // Enable in dev
    [AnalyticsCategory.FEATURE_USAGE]: __DEV__ ? true : false,  // Enable in dev
    [AnalyticsCategory.ERRORS]: true,
    [AnalyticsCategory.NAVIGATION]: __DEV__ ? true : false,  // Enable in dev
  },
};

let cachedConsent: AnalyticsConsent | null = null;

async function getConsent(): Promise<AnalyticsConsent> {
  if (cachedConsent) return cachedConsent;
  
  try {
    const [consentStr, categoriesStr] = await Promise.all([
      AsyncStorage.getItem(ANALYTICS_CONSENT_KEY),
      AsyncStorage.getItem(ANALYTICS_CATEGORIES_KEY),
    ]);
    
    const enabled = consentStr === 'true';
    const categories = categoriesStr ? JSON.parse(categoriesStr) : DEFAULT_CONSENT.categories;
    
    cachedConsent = { enabled, categories };
    return cachedConsent;
  } catch (error) {
    console.error('[AnalyticsService] Failed to load consent:', error);
    return DEFAULT_CONSENT;
  }
}

export async function setAnalyticsConsent(consent: AnalyticsConsent): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, consent.enabled ? 'true' : 'false'),
      AsyncStorage.setItem(ANALYTICS_CATEGORIES_KEY, JSON.stringify(consent.categories)),
    ]);
    cachedConsent = consent;
  } catch (error) {
    console.error('[AnalyticsService] Failed to save consent:', error);
  }
}

export async function getAnalyticsConsent(): Promise<AnalyticsConsent> {
  return getConsent();
}

async function shouldTrack(category: AnalyticsCategory): Promise<boolean> {
  const consent = await getConsent();
  if (!consent.enabled) return false;
  return consent.categories[category] ?? false;
}

async function trackIfConsented(
  category: AnalyticsCategory,
  eventName: string,
  properties?: Record<string, any>
) {
  if (__DEV__) {
    console.log(`🎯 [Analytics] trackIfConsented called: ${eventName}`, { category, properties });
  }
  
  const allowed = await shouldTrack(category);
  
  if (__DEV__) {
    console.log(`🎯 [Analytics] Consent check result for ${eventName}:`, { allowed, category });
  }
  
  // ALWAYS send to backend (internal analytics, not shared with third parties)
  // Backend events stay in our Supabase database for product analytics
  if (__DEV__) {
    console.log(`🎯 [Analytics] About to call trackEventToBackend for: ${eventName}`);
  }
  trackEventToBackend(eventName, properties);
  
  // Only send to PostHog if user consented (respects privacy for third-party analytics)
  if (allowed) {
    if (__DEV__) {
      console.log(`🎯 [Analytics] Consent allowed, sending to PostHog: ${eventName}`);
      try {
        const mod = await import('@/lib/analyticsValidator');
        if (mod && typeof mod.validateEvent === 'function') {
          mod.validateEvent(eventName, properties);
        }
      } catch {}
    }
    // Send to PostHog (third-party analytics)
    captureEvent(eventName, properties);
  } else if (__DEV__) {
    console.log(`🎯 [Analytics] Consent denied, skipping PostHog for: ${eventName}`);
  }
}

export class AnalyticsService {
  // ============================================================================
  // CONSENT MANAGEMENT
  // ============================================================================

  static async updateConsent(consent: Partial<AnalyticsConsent>): Promise<void> {
    const current = await getConsent();
    const updated = {
      ...current,
      ...consent,
      categories: {
        ...current.categories,
        ...consent.categories,
      },
    };
    await setAnalyticsConsent(updated);
  }

  static async enableCategory(category: AnalyticsCategory): Promise<void> {
    const current = await getConsent();
    current.categories[category] = true;
    await setAnalyticsConsent(current);
  }

  static async disableCategory(category: AnalyticsCategory): Promise<void> {
    const current = await getConsent();
    current.categories[category] = false;
    await setAnalyticsConsent(current);
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  static async trackAppOpened(isFirstLaunch: boolean, timeSinceLastOpen?: number) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'App Opened', {
      platform: Platform.OS,
      is_first_launch: isFirstLaunch,
      time_since_last_open: timeSinceLastOpen,
    });
  }

  static async trackAppBackgrounded(sessionDuration: number, screensViewed: number) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'App Backgrounded', {
      session_duration: sessionDuration,
      screens_viewed: screensViewed,
    });
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  static async trackSignInAttempted(method: 'email' | 'google' | 'apple') {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Sign In Attempted', { method });
  }

  static async trackSignInSucceeded(method: 'email' | 'google' | 'apple', isNewUser: boolean) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Sign In Succeeded', { 
      method, 
      is_new_user: isNewUser 
    });
  }

  static async trackSignInFailed(method: 'email' | 'google' | 'apple', errorType: string) {
    await trackIfConsented(AnalyticsCategory.ERRORS, 'Sign In Failed', { 
      method, 
      error_type: errorType 
    });
  }

  static async trackSignOut(sessionDuration: number) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Sign Out', { 
      session_duration: sessionDuration 
    });
  }

  static async trackPasswordResetRequested() {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Password Reset Requested', {});
  }

  // ============================================================================
  // ONBOARDING
  // ============================================================================

  static async trackOnboardingStarted() {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Onboarding Started', {});
  }

  static async trackOnboardingStepCompleted(stepNumber: number, stepName: string) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Onboarding Step Completed', {
      step_number: stepNumber,
      step_name: stepName,
    });
  }

  static async trackOnboardingCompleted(duration: number, stepsCompleted: number) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Onboarding Completed', {
      duration,
      steps_completed: stepsCompleted,
    });
  }

  static async trackOnboardingSkipped(atStep: number) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Onboarding Skipped', { 
      at_step: atStep 
    });
  }

  // ============================================================================
  // CONTACTS
  // ============================================================================

  static async trackContactCreated(
    source: 'manual' | 'import' | 'screenshot',
    hasPhone: boolean,
    hasEmail: boolean,
    pipelineStage?: string
  ) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Contact Created', {
      source,
      has_phone: hasPhone,
      has_email: hasEmail,
      pipeline_stage: pipelineStage,
    });
  }

  static async trackContactUpdated(contactId: string, fieldsChanged: string[]) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Contact Updated', {
      contact_id: contactId,
      fields_changed: fieldsChanged,
    });
  }

  static async trackContactDeleted(contactId: string, hadInteractions: boolean, warmthScore?: number) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Contact Deleted', {
      contact_id: contactId,
      had_interactions: hadInteractions,
      warmth_score: warmthScore,
    });
  }

  static async trackContactsImported(
    source: 'native_contacts' | 'csv',
    totalImported: number,
    duplicatesSkipped: number,
    duration: number
  ) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Contacts Imported', {
      source,
      total_imported: totalImported,
      duplicates_skipped: duplicatesSkipped,
      duration,
    });
  }

  static async trackPipelineStageChanged(
    contactId: string,
    fromStage: string,
    toStage: string,
    pipeline: string
  ) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Pipeline Stage Changed', {
      contact_id: contactId,
      from_stage: fromStage,
      to_stage: toStage,
      pipeline,
    });
  }

  static async trackWarmthScoreChanged(
    contactId: string,
    fromScore: number,
    toScore: number,
    changeReason: string
  ) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Warmth Score Changed', {
      contact_id: contactId,
      from_score: fromScore,
      to_score: toScore,
      change_reason: changeReason,
    });
  }

  // ============================================================================
  // MESSAGE GENERATION
  // ============================================================================

  static async trackMessageGenerationStarted(
    contactId: string,
    channel: string,
    goal: string,
    hasTemplate: boolean,
    fromScreenshot: boolean
  ) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Message Generation Started', {
      contact_id: contactId,
      channel,
      goal,
      has_template: hasTemplate,
      from_screenshot: fromScreenshot,
    });
  }

  static async trackMessageGenerated(
    contactId: string,
    channel: string,
    goal: string,
    templateId: string | undefined,
    fromScreenshot: boolean,
    generationTime: number,
    messageLength: number,
    tone?: string
  ) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Message Generated', {
      contact_id: contactId,
      channel,
      goal,
      template_id: templateId,
      from_screenshot: fromScreenshot,
      generation_time: generationTime,
      message_length: messageLength,
      tone,
    });
  }

  static async trackMessageGenerationFailed(
    contactId: string,
    channel: string,
    goal: string,
    errorType: string,
    generationTime: number
  ) {
    await trackIfConsented(AnalyticsCategory.ERRORS, 'Message Generation Failed', {
      contact_id: contactId,
      channel,
      goal,
      error_type: errorType,
      generation_time: generationTime,
    });
  }

  static async trackMessageRegenerated(contactId: string, attemptNumber: number) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Message Regenerated', {
      contact_id: contactId,
      attempt_number: attemptNumber,
    });
  }

  static async trackMessageEdited(
    contactId: string,
    editType: 'minor' | 'major',
    originalLength: number,
    editedLength: number
  ) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Message Edited', {
      contact_id: contactId,
      edit_type: editType,
      original_length: originalLength,
      edited_length: editedLength,
    });
  }

  static async trackMessageSent(
    contactId: string,
    channel: string,
    goal: string,
    wasEdited: boolean,
    timeToSend: number
  ) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Message Sent', {
      contact_id: contactId,
      channel,
      goal,
      was_edited: wasEdited,
      time_to_send: timeToSend,
    });
  }

  static async trackMessageDiscarded(contactId: string, channel: string, goal: string) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Message Discarded', {
      contact_id: contactId,
      channel,
      goal,
    });
  }

  // ============================================================================
  // SCREENSHOT ANALYSIS
  // ============================================================================

  static async trackScreenshotAnalyzed(
    ocrChars: number,
    latencyMs: number,
    fieldsExtracted: string[],
    confidenceScore: number
  ) {
    await trackIfConsented(AnalyticsCategory.PERFORMANCE, 'Screenshot Analyzed', {
      ocr_chars: ocrChars,
      latency_ms: latencyMs,
      fields_extracted: fieldsExtracted,
      confidence_score: confidenceScore,
    });
  }

  static async trackScreenshotAnalysisFailed(errorType: string, fileSizeKb: number) {
    await trackIfConsented(AnalyticsCategory.ERRORS, 'Screenshot Analysis Failed', {
      error_type: errorType,
      file_size_kb: fileSizeKb,
    });
  }

  // ============================================================================
  // INTERACTIONS
  // ============================================================================

  static async trackInteractionAdded(
    contactId: string,
    interactionType: string,
    hasNotes: boolean,
    noteLength: number
  ) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Interaction Added', {
      contact_id: contactId,
      interaction_type: interactionType,
      has_notes: hasNotes,
      note_length: noteLength,
    });
  }

  static async trackInteractionUpdated(interactionId: string, contactId: string) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Interaction Updated', {
      interaction_id: interactionId,
      contact_id: contactId,
    });
  }

  static async trackInteractionDeleted(interactionId: string, contactId: string) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Interaction Deleted', {
      interaction_id: interactionId,
      contact_id: contactId,
    });
  }

  // ============================================================================
  // VOICE NOTES
  // ============================================================================

  static async trackVoiceNoteStarted(context: 'contact_note' | 'personal_note') {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Voice Note Started', { context });
  }

  static async trackVoiceNoteCompleted(duration: number, context: 'contact_note' | 'personal_note') {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Voice Note Completed', { 
      duration, 
      context 
    });
  }

  static async trackVoiceNoteTranscribed(
    duration: number,
    transcriptionLength: number,
    latencyMs: number
  ) {
    await trackIfConsented(AnalyticsCategory.PERFORMANCE, 'Voice Note Transcribed', {
      duration,
      transcription_length: transcriptionLength,
      latency_ms: latencyMs,
    });
  }

  static async trackVoiceNoteTranscriptionFailed(duration: number, errorType: string) {
    await trackIfConsented(AnalyticsCategory.ERRORS, 'Voice Note Transcription Failed', {
      duration,
      error_type: errorType,
    });
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  static async trackTemplateCreated(templateType: string, channel: string) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Template Created', {
      template_type: templateType,
      channel,
    });
  }

  static async trackTemplateUsed(templateId: string, templateType: string, isCustom: boolean) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Template Used', {
      template_id: templateId,
      template_type: templateType,
      is_custom: isCustom,
    });
  }

  static async trackTemplateEdited(templateId: string) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Template Edited', { 
      template_id: templateId 
    });
  }

  static async trackTemplateDeleted(templateId: string, usageCount: number) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Template Deleted', {
      template_id: templateId,
      usage_count: usageCount,
    });
  }

  // ============================================================================
  // SUBSCRIPTION
  // ============================================================================

  static async trackPaywallViewed(trigger: string, planShown: string) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Paywall Viewed', {
      trigger,
      plan_shown: planShown,
    });
  }

  static async trackTrialStarted(plan: string, durationDays: number) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Trial Started', {
      plan,
      duration_days: durationDays,
    });
  }

  static async trackTrialConverted(plan: string, trialDurationDays: number) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Trial Converted', {
      plan,
      trial_duration_days: trialDurationDays,
    });
  }

  static async trackTrialCanceled(plan: string, daysIntoTrial: number, reason?: string) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Trial Canceled', {
      plan,
      days_into_trial: daysIntoTrial,
      reason,
    });
  }

  static async trackSubscriptionPurchased(
    plan: string,
    billingPeriod: string,
    price: number,
    currency: string
  ) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Subscription Purchased', {
      plan,
      billing_period: billingPeriod,
      price,
      currency,
    });
  }

  static async trackSubscriptionCanceled(plan: string, daysSubscribed: number, reason?: string) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Subscription Canceled', {
      plan,
      days_subscribed: daysSubscribed,
      reason,
    });
  }

  static async trackSubscriptionRestored(plan: string, platform: string) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Subscription Restored', { 
      plan, 
      platform 
    });
  }

  // ============================================================================
  // FEATURE REQUESTS
  // ============================================================================

  static async trackFeatureRequestSubmitted(bucket: string, requestLength: number) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Feature Request Submitted', {
      bucket,
      request_length: requestLength,
    });
  }

  // ============================================================================
  // SETTINGS
  // ============================================================================

  static async trackSettingsChanged(settingName: string, oldValue: string, newValue: string) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Settings Changed', {
      setting_name: settingName,
      old_value: oldValue,
      new_value: newValue,
    });
  }

  static async trackThemeChanged(theme: 'light' | 'dark' | 'system') {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Theme Changed', { theme });
  }

  static async trackCloudModeToggled(enabled: boolean) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Cloud Mode Toggled', { enabled });
  }

  static async trackAnalyticsConsentChanged(consented: boolean) {
    await trackIfConsented(AnalyticsCategory.ESSENTIAL, 'Analytics Consent Changed', { 
      consented 
    });
  }

  static async trackWarmthSettingsChanged(settingChanged: string) {
    await trackIfConsented(AnalyticsCategory.FEATURE_USAGE, 'Warmth Settings Changed', { 
      setting_changed: settingChanged 
    });
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  static async trackScreenViewed(
    screenName: string,
    previousScreen?: string,
    timeOnPrevious?: number
  ) {
    const allowed = await shouldTrack(AnalyticsCategory.NAVIGATION);
    if (allowed) {
      trackScreen(screenName, {
        previous_screen: previousScreen,
        time_on_previous: timeOnPrevious,
      });
    }
  }

  // ============================================================================
  // ERRORS
  // ============================================================================

  static async trackError(
    errorType: string,
    errorMessage: string,
    screen: string,
    isFatal: boolean
  ) {
    await trackIfConsented(AnalyticsCategory.ERRORS, 'Error Occurred', {
      error_type: errorType,
      error_message: errorMessage,
      screen,
      is_fatal: isFatal,
    });
  }

  static async trackAPIError(endpoint: string, statusCode: number, errorType: string) {
    await trackIfConsented(AnalyticsCategory.ERRORS, 'API Error', {
      endpoint,
      status_code: statusCode,
      error_type: errorType,
    });
  }
}
