/**
 * Type-Safe Analytics Service
 * Wraps PostHog with type safety and privacy guarantees
 */

import PostHog from 'posthog-react-native';
import * as Crypto from 'expo-crypto';

// =====================================================
// TYPES
// =====================================================

type Channel = 'email' | 'sms' | 'dm' | 'imessage' | 'whatsapp' | 'linkedin';
type Plan = 'free' | 'core' | 'pro';
type Platform = 'ios' | 'android' | 'web';
type RequestType = 'feature' | 'feedback' | 'bug';
type InteractionType = 'call' | 'meeting' | 'dm' | 'email' | 'text' | 'video_call' | 'coffee' | 'event';

// =====================================================
// ANALYTICS SERVICE
// =====================================================

export class AnalyticsService {
  private static initialized = false;

  /**
   * Initialize PostHog (call once at app start)
   */
  static async initialize(apiKey: string) {
    if (this.initialized || !apiKey) return;

    try {
      await PostHog.init(apiKey, {
        host: 'https://app.posthog.com',
        captureApplicationLifecycleEvents: true,
        captureScreenViews: true,
        flushAt: 10,
        flushInterval: 5000,
      });
      this.initialized = true;
      console.log('[Analytics] PostHog initialized');
    } catch (error) {
      console.error('[Analytics] Failed to initialize PostHog:', error);
    }
  }

  /**
   * Identify user (call after login)
   */
  static async identifyUser(
    userId: string,
    traits: {
      plan?: Plan;
      locale?: string;
      platform?: Platform;
    }
  ) {
    try {
      // Hash user ID for privacy
      const anonId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        userId
      );
      PostHog.identify(anonId, traits);
      console.log('[Analytics] User identified');
    } catch (error) {
      console.error('[Analytics] Failed to identify user:', error);
    }
  }

  /**
   * Reset user (call on logout)
   */
  static async resetUser() {
    try {
      await PostHog.reset();
      console.log('[Analytics] User reset');
    } catch (error) {
      console.error('[Analytics] Failed to reset user:', error);
    }
  }

  // =====================================================
  // LIFECYCLE & SESSION
  // =====================================================

  static trackAppOpened(props: {
    isFirstLaunch: boolean;
    previousVersion?: string;
    timeSinceLastOpenHours?: number;
  }) {
    PostHog.capture('App Opened', {
      is_first_launch: props.isFirstLaunch,
      previous_version: props.previousVersion,
      time_since_last_open_hours: props.timeSinceLastOpenHours,
    });
  }

  static trackAppBackgrounded(props: {
    sessionDurationMs: number;
    screensViewedCount: number;
    actionsPerformedCount: number;
  }) {
    PostHog.capture('App Backgrounded', {
      session_duration_ms: props.sessionDurationMs,
      screens_viewed_count: props.screensViewedCount,
      actions_performed_count: props.actionsPerformedCount,
    });
  }

  // =====================================================
  // AUTHENTICATION
  // =====================================================

  static trackSignedUp(props: {
    method: 'email' | 'google' | 'apple' | 'phone';
    source: 'organic' | 'ad' | 'referral' | 'web';
    hasReferralCode: boolean;
  }) {
    PostHog.capture('Signed Up', {
      method: props.method,
      source: props.source,
      has_referral_code: props.hasReferralCode,
    });
  }

  static trackSignedIn(props: {
    method: 'email' | 'google' | 'apple' | 'phone' | 'biometric';
    daysSinceLastLogin?: number;
  }) {
    PostHog.capture('Signed In', {
      method: props.method,
      days_since_last_login: props.daysSinceLastLogin,
    });
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  static trackScreenViewed(props: {
    screenName: string;
    prevScreen?: string;
    timeOnPrevMs?: number;
  }) {
    PostHog.capture('Screen Viewed', {
      screen_name: props.screenName,
      prev_screen: props.prevScreen,
      time_on_prev_ms: props.timeOnPrevMs,
    });
  }

  // =====================================================
  // CONTACTS & CRM
  // =====================================================

  static trackContactCreated(props: {
    source: 'manual' | 'import' | 'scan' | 'voice_note' | 'screenshot';
    hasCompany: boolean;
    hasPhoto: boolean;
    initialPipeline?: string;
  }) {
    PostHog.capture('Contact Created', {
      source: props.source,
      has_company: props.hasCompany,
      has_photo: props.hasPhoto,
      initial_pipeline: props.initialPipeline,
    });
  }

  static trackContactsImported(props: {
    source: 'google' | 'csv' | 'iphone' | 'outlook' | 'vcf';
    totalCount: number;
    importedCount: number;
    dedupedCount: number;
    hadErrors: boolean;
  }) {
    PostHog.capture('Contacts Imported', {
      source: props.source,
      total_count: props.totalCount,
      imported_count: props.importedCount,
      deduped_count: props.dedupedCount,
      had_errors: props.hadErrors,
    });
  }

  static trackWarmthScoreChanged(props: {
    contactId: string;
    fromScore: number;
    toScore: number;
    trigger: 'interaction_logged' | 'time_decay' | 'manual_override';
  }) {
    PostHog.capture('Warmth Score Changed', {
      contact_id: props.contactId,
      from_score: props.fromScore,
      to_score: props.toScore,
      delta: props.toScore - props.fromScore,
      trigger: props.trigger,
    });
  }

  // =====================================================
  // MESSAGES & AI COMPOSER
  // =====================================================

  static trackMessageGenerated(props: {
    contactId: string;
    channel: Channel;
    goal: string;
    templateId?: string;
    tone: 'professional' | 'casual' | 'friendly' | 'formal';
    fromScreenshot: boolean;
    fromVoiceNote: boolean;
    latencyMs: number;
    tokenCount: number;
  }) {
    PostHog.capture('Message Generated', {
      contact_id: props.contactId,
      channel: props.channel,
      goal: props.goal,
      template_id: props.templateId,
      tone: props.tone,
      from_screenshot: props.fromScreenshot,
      from_voice_note: props.fromVoiceNote,
      latency_ms: props.latencyMs,
      token_count: props.tokenCount,
    });
  }

  static trackMessageSent(props: {
    messageId: string;
    contactId: string;
    channel: Channel;
    wasAiGenerated: boolean;
    wasEdited: boolean;
  }) {
    PostHog.capture('Message Sent', {
      message_id: props.messageId,
      contact_id: props.contactId,
      channel: props.channel,
      was_ai_generated: props.wasAiGenerated,
      was_edited: props.wasEdited,
    });
  }

  // =====================================================
  // SCREENSHOTS & AI ANALYSIS
  // =====================================================

  static trackScreenshotAnalyzed(props: {
    ocrCharCount: number;
    latencyMs: number;
    detectedContactsCount: number;
    confidenceScore: number;
  }) {
    PostHog.capture('Screenshot Analyzed', {
      ocr_char_count: props.ocrCharCount,
      latency_ms: props.latencyMs,
      detected_contacts_count: props.detectedContactsCount,
      confidence_score: props.confidenceScore,
    });
  }

  // =====================================================
  // VOICE NOTES
  // =====================================================

  static trackVoiceNoteRecorded(props: {
    durationMs: number;
    fileSizeKb: number;
  }) {
    PostHog.capture('Voice Note Recorded', {
      duration_ms: props.durationMs,
      file_size_kb: props.fileSizeKb,
    });
  }

  static trackVoiceNoteTranscribed(props: {
    wordCount: number;
    latencyMs: number;
    confidenceScore: number;
  }) {
    PostHog.capture('Voice Note Transcribed', {
      word_count: props.wordCount,
      latency_ms: props.latencyMs,
      confidence_score: props.confidenceScore,
    });
  }

  // =====================================================
  // INTERACTIONS
  // =====================================================

  static trackInteractionLogged(props: {
    contactId: string;
    type: InteractionType;
    hasNotes: boolean;
    hasFollowup: boolean;
  }) {
    PostHog.capture('Interaction Logged', {
      contact_id: props.contactId,
      interaction_type: props.type,
      has_notes: props.hasNotes,
      has_followup: props.hasFollowup,
    });
  }

  // =====================================================
  // ONBOARDING
  // =====================================================

  static trackOnboardingStarted() {
    PostHog.capture('Onboarding Started', {
      timestamp: new Date().toISOString(),
    });
  }

  static trackOnboardingStepCompleted(props: {
    step: number;
    stepName: string;
  }) {
    PostHog.capture('Onboarding Step Completed', {
      step: props.step,
      step_name: props.stepName,
    });
  }

  static trackOnboardingCompleted(props: {
    completionTimeMs: number;
  }) {
    PostHog.capture('Onboarding Completed', {
      completion_time_ms: props.completionTimeMs,
    });
  }

  static trackOnboardingSkipped(props: {
    atStep: number;
  }) {
    PostHog.capture('Onboarding Skipped', {
      at_step: props.atStep,
    });
  }

  // =====================================================
  // CONTACT VIEWING
  // =====================================================

  static trackContactViewed(props: {
    contactId: string;
    warmthScore?: number;
    hasInteractions: boolean;
    source?: 'list' | 'search' | 'link';
  }) {
    PostHog.capture('Contact Viewed', {
      contact_id: props.contactId,
      warmth_score: props.warmthScore,
      has_interactions: props.hasInteractions,
      source: props.source || 'list',
    });
  }

  // =====================================================
  // AI MESSAGE ACTIONS
  // =====================================================

  static trackAiMessageEdited(props: {
    messageId: string;
    contactId: string;
    editType: 'text' | 'subject' | 'tone';
    charsDelta: number;
  }) {
    PostHog.capture('AI Message Edited', {
      message_id: props.messageId,
      contact_id: props.contactId,
      edit_type: props.editType,
      chars_delta: props.charsDelta,
    });
  }

  static trackAiMessageAccepted(props: {
    messageId: string;
    contactId: string;
    method: 'copy' | 'send';
  }) {
    PostHog.capture('AI Message Accepted', {
      message_id: props.messageId,
      contact_id: props.contactId,
      method: props.method,
    });
  }

  static trackAiMessageRejected(props: {
    messageId: string;
    contactId: string;
    reason?: string;
  }) {
    PostHog.capture('AI Message Rejected', {
      message_id: props.messageId,
      contact_id: props.contactId,
      reason: props.reason,
    });
  }

  // =====================================================
  // WARMTH TRACKING
  // =====================================================

  static trackWarmthRecomputed(props: {
    contactId: string;
    fromScore?: number;
    toScore: number;
    trigger: 'manual' | 'interaction' | 'scheduled';
  }) {
    PostHog.capture('Warmth Recomputed', {
      contact_id: props.contactId,
      from_score: props.fromScore,
      to_score: props.toScore,
      delta: props.fromScore ? props.toScore - props.fromScore : null,
      trigger: props.trigger,
    });
  }

  // =====================================================
  // TEMPLATE USAGE
  // =====================================================

  static trackTemplateUsed(props: {
    templateId: string;
    contactId: string;
    channel: Channel;
  }) {
    PostHog.capture('Template Used', {
      template_id: props.templateId,
      contact_id: props.contactId,
      channel: props.channel,
    });
  }

  // =====================================================
  // FEATURE REQUESTS & ROADMAP
  // =====================================================

  static trackFeatureRequestSubmitted(props: {
    featureId: string;
    type: RequestType;
    titleLength: number;
    descriptionLength: number;
    hasScreenshot: boolean;
  }) {
    PostHog.capture('Feature Request Submitted', {
      feature_id: props.featureId,
      request_type: props.type,
      title_length: props.titleLength,
      description_length: props.descriptionLength,
      has_screenshot: props.hasScreenshot,
    });
  }

  static trackFeatureRequestVoted(props: {
    featureId: string;
    bucketId?: string;
    bucketTitle?: string;
    currentVotes: number;
    isFirstVote: boolean;
  }) {
    PostHog.capture('Feature Request Voted', {
      feature_id: props.featureId,
      bucket_id: props.bucketId,
      bucket_title: props.bucketTitle,
      current_votes: props.currentVotes,
      is_first_vote: props.isFirstVote,
    });
  }

  static trackFeatureBucketViewed(props: {
    bucketId: string;
    bucketTitle: string;
    status: 'backlog' | 'planned' | 'in_progress' | 'shipped' | 'declined';
    votesCount: number;
    requestCount: number;
    progressPercent: number;
    momentum7d: number;
  }) {
    PostHog.capture('Feature Bucket Viewed', {
      bucket_id: props.bucketId,
      bucket_title: props.bucketTitle,
      status: props.status,
      votes_count: props.votesCount,
      request_count: props.requestCount,
      progress_percent: props.progressPercent,
      momentum_7d: props.momentum7d,
    });
  }

  static trackFeatureLeaderboardViewed(props: {
    sortBy: 'hot' | 'top' | 'new';
    bucketsVisible: number;
  }) {
    PostHog.capture('Feature Leaderboard Viewed', {
      sort_by: props.sortBy,
      buckets_visible: props.bucketsVisible,
    });
  }

  // =====================================================
  // SUBSCRIPTIONS & MONETIZATION
  // =====================================================

  static trackPaywallViewed(props: {
    variant: string;
    trigger: 'feature_limit' | 'trial_ended' | 'upgrade_prompt' | 'settings';
  }) {
    PostHog.capture('Paywall Viewed', {
      variant: props.variant,
      trigger: props.trigger,
    });
  }

  static trackTrialStarted(props: {
    plan: Plan;
    trialDays: number;
    source: 'onboarding' | 'paywall' | 'settings';
  }) {
    PostHog.capture('Trial Started', {
      plan: props.plan,
      trial_days: props.trialDays,
      source: props.source,
    });
  }

  static trackSubscriptionPurchased(props: {
    plan: Plan;
    interval: 'monthly' | 'yearly';
    priceUsd: number;
    hadTrial: boolean;
  }) {
    PostHog.capture('Subscription Purchased', {
      plan: props.plan,
      interval: props.interval,
      price_usd: props.priceUsd,
      had_trial: props.hadTrial,
    });
  }

  // =====================================================
  // SETTINGS & PREFERENCES
  // =====================================================

  static trackThemeChanged(props: {
    fromTheme: 'light' | 'dark' | 'system';
    toTheme: 'light' | 'dark' | 'system';
  }) {
    PostHog.capture('Theme Changed', {
      from_theme: props.fromTheme,
      to_theme: props.toTheme,
    });
  }

  // =====================================================
  // FEATURE FLAGS
  // =====================================================

  static async getFeatureFlag(flagKey: string): Promise<boolean | string | undefined> {
    try {
      return await PostHog.getFeatureFlag(flagKey);
    } catch (error) {
      console.error('[Analytics] Failed to get feature flag:', error);
      return undefined;
    }
  }

  static async isFeatureEnabled(flagKey: string): Promise<boolean> {
    try {
      return await PostHog.isFeatureEnabled(flagKey);
    } catch (error) {
      console.error('[Analytics] Failed to check feature flag:', error);
      return false;
    }
  }

  // =====================================================
  // ERROR TRACKING
  // =====================================================

  static trackError(props: {
    errorType: string;
    screenName: string;
    isFatal: boolean;
  }) {
    PostHog.capture('App Error', {
      error_type: props.errorType,
      screen_name: props.screenName,
      is_fatal: props.isFatal,
    });
  }
}
