import { AnalyticsEvent } from '@/types/message';

class Analytics {
  private events: AnalyticsEvent[] = [];

  track(name: string, properties: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        timestamp: Date.now(),
        platform: 'mobile'
      },
      timestamp: Date.now()
    };
    
    this.events.push(event);
    console.log('📊 Analytics:', name, properties);
    
    // In production, send to your analytics service
    // this.sendToService(event);
  }

  trackMessageGenerated(properties: {
    goalId: string;
    contactId: string;
    channelSelected: string;
    variants: number;
    latencyMs?: number;
  }) {
    this.track('message_generated', properties);
  }

  trackMessageEdited(properties: {
    variantIndex: number;
    charsDelta: number;
    messageId: string;
  }) {
    this.track('message_edited', properties);
  }

  trackMessageCopied(properties: {
    variantIndex: number;
    textLength: number;
    edited: boolean;
    messageId: string;
    goalId: string;
    channel: string;
  }) {
    this.track('message_copied', properties);
  }

  trackMessageSendClicked(properties: {
    channel: string;
    intent: 'mailto' | 'sms' | 'share';
    variantIndex: number;
    messageId: string;
  }) {
    this.track('message_send_clicked', properties);
  }

  trackAppBackgroundedAfterCopy(properties: {
    deltaMs: number;
    messageId: string;
  }) {
    this.track('app_backgrounded_after_copy', properties);
  }

  trackMessageOutcome(properties: {
    messageId: string;
    outcome: 'sent_inferred' | 'sent_confirmed';
    goalId: string;
    contactId: string;
  }) {
    this.track('message_outcome_recorded', properties);
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }
}

export const analytics = new Analytics();