import { Event, EventPayload, BatchEventPayload } from '../types/event';
import { EventBatcher, getGlobalBatcher } from '../utils/event-batcher';
import { getUserIdentifier, UserIdentifier } from '../utils/user-identifier';
import { getSessionTracker, SessionTracker } from '../utils/session-tracker';
import { getDeduplicator, EventDeduplicator } from '../utils/event-dedup';
import { validateEvent, sanitizeEvent } from '../utils/event-validator';

export interface EventCaptureConfig {
  batchSize?: number;
  batchWaitMs?: number;
  sessionTimeoutMs?: number;
  dedupWindowMs?: number;
  onBeforeSend?: (event: Event) => Event;
  onError?: (error: Error) => void;
}

export class EventCapture {
  private config: EventCaptureConfig;
  private batcher: EventBatcher;
  private userIdentifier: UserIdentifier;
  private sessionTracker: SessionTracker;
  private deduplicator: EventDeduplicator;
  private initialized = false;
  private eventQueue: Event[] = [];

  constructor(config: EventCaptureConfig = {}) {
    this.config = config;
    this.batcher = getGlobalBatcher({
      maxBatchSize: config.batchSize ?? 50,
      maxWaitMs: config.batchWaitMs ?? 5000,
      onBatchReady: (batch) => this.handleBatchReady(batch),
    });
    this.userIdentifier = getUserIdentifier();
    this.sessionTracker = getSessionTracker({
      sessionTimeoutMs: config.sessionTimeoutMs ?? 30 * 60 * 1000,
    });
    this.deduplicator = getDeduplicator({
      windowSizeMs: config.dedupWindowMs ?? 60 * 1000,
    });
  }

  /**
   * Initialize the event capture system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.userIdentifier.initialize();
      await this.sessionTracker.initialize();
      this.initialized = true;
      console.log('EventCapture initialized successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown initialization error');
      this.handleError(err);
      throw err;
    }
  }

  /**
   * Capture an event
   */
  async captureEvent(event: EventPayload): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Enrich event with user and session data
      const enrichedEvent = await this.enrichEvent(event);

      // Validate event
      const validation = validateEvent(enrichedEvent);
      if (!validation.valid || !validation.event) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      const validatedEvent = validation.event as Event;

      // Check for duplicates
      if (this.deduplicator.isDuplicate(validatedEvent)) {
        return {
          success: true, // Still return success, but event is deduped
        };
      }

      this.deduplicator.markSeen(validatedEvent);

      // Sanitize event
      const sanitized = sanitizeEvent(validatedEvent);

      // Call before-send hook
      let finalEvent = sanitized;
      if (this.config.onBeforeSend) {
        finalEvent = this.config.onBeforeSend(sanitized);
      }

      // Record activity
      await this.sessionTracker.recordActivity();

      // Add to batch queue
      this.batcher.addEvent(finalEvent as EventPayload);
      this.eventQueue.push(finalEvent as Event);

      return { success: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error capturing event');
      this.handleError(err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Capture multiple events
   */
  async captureEvents(events: EventPayload[]): Promise<{ success: boolean; failed: number }> {
    let failed = 0;
    for (const event of events) {
      const result = await this.captureEvent(event);
      if (!result.success) {
        failed++;
      }
    }
    return { success: failed === 0, failed };
  }

  /**
   * Flush any pending events
   */
  async flush(): Promise<void> {
    await this.batcher.flush();
  }

  /**
   * Get current session ID
   */
  async getSessionId(): Promise<string> {
    const session = await this.sessionTracker.getSession();
    return session.sessionId;
  }

  /**
   * Get current user ID
   */
  async getUserId(): Promise<string | undefined> {
    const identity = await this.userIdentifier.getIdentity();
    return identity.userId;
  }

  /**
   * Identify a user
   */
  async identifyUser(userId: string): Promise<void> {
    await this.userIdentifier.identify(userId);
  }

  /**
   * Start a new session (logout scenario)
   */
  async startNewSession(): Promise<void> {
    await this.sessionTracker.startNewSession();
  }

  /**
   * Enrich event with user and session data
   */
  private async enrichEvent(event: EventPayload): Promise<Event> {
    const [identity, session] = await Promise.all([
      this.userIdentifier.getIdentity(),
      this.sessionTracker.getSession(),
    ]);

    return {
      ...event,
      userId: event.userId || identity.userId,
      anonymousId: event.anonymousId || identity.anonymousId,
      sessionId: event.sessionId || session.sessionId,
      timestamp: event.timestamp || Date.now(),
      source: event.source || 'web',
    } as Event;
  }

  /**
   * Handle batch ready for transmission
   */
  private async handleBatchReady(batch: BatchEventPayload): Promise<void> {
    try {
      // This is where you would send to your backend
      // For now, just log it
      console.debug(`Batch ${batch.batchId} ready: ${batch.events.length} events`);
      // Actual sending would happen here
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown batch error');
      this.handleError(err);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('EventCapture error:', error);
    if (this.config.onError) {
      this.config.onError(error);
    }
  }

  /**
   * Destroy the event capture system
   */
  async destroy(): Promise<void> {
    await this.flush();
    await this.batcher.destroy();
  }
}

// Global instance
let globalEventCapture: EventCapture | null = null;

export function getEventCapture(config?: EventCaptureConfig): EventCapture {
  if (!globalEventCapture) {
    globalEventCapture = new EventCapture(config);
  }
  return globalEventCapture;
}

export async function captureEvent(event: EventPayload): Promise<{ success: boolean; error?: string }> {
  const capture = getEventCapture();
  await capture.initialize();
  return capture.captureEvent(event);
}

export async function identifyUser(userId: string): Promise<void> {
  const capture = getEventCapture();
  await capture.initialize();
  return capture.identifyUser(userId);
}

export async function resetEventCapture(): Promise<void> {
  if (globalEventCapture) {
    await globalEventCapture.destroy();
  }
  globalEventCapture = null;
}
