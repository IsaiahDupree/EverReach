import { Event } from '../types/event';

export interface DedupConfig {
  windowSizeMs?: number;
  maxQueueSize?: number;
}

/**
 * Event deduplication using idempotency keys and time-based windows
 */
export class EventDeduplicator {
  private seenKeys: Map<string, number> = new Map();
  private config: Required<DedupConfig>;

  constructor(config: DedupConfig = {}) {
    this.config = {
      windowSizeMs: config.windowSizeMs ?? 60 * 1000, // 1 minute
      maxQueueSize: config.maxQueueSize ?? 10000,
    };
  }

  /**
   * Check if event is a duplicate
   */
  isDuplicate(event: Event): boolean {
    const key = this.getKey(event);
    if (!key) {
      return false; // No key means not dedup-able
    }

    const lastSeen = this.seenKeys.get(key);
    const now = Date.now();

    if (!lastSeen) {
      return false; // Not seen before
    }

    // Within dedup window = duplicate
    return now - lastSeen < this.config.windowSizeMs;
  }

  /**
   * Mark event as seen
   */
  markSeen(event: Event): void {
    const key = this.getKey(event);
    if (!key) return;

    const now = Date.now();
    this.seenKeys.set(key, now);

    // Clean up old entries
    if (this.seenKeys.size > this.config.maxQueueSize) {
      this.cleanup();
    }
  }

  /**
   * Get deduplication key for an event
   */
  private getKey(event: Event): string | null {
    // Explicit idempotency key takes precedence
    if (event.idempotencyKey) {
      return `idem:${event.idempotencyKey}`;
    }

    // For certain event types, create composite key
    const compositeKey = this.createCompositeKey(event);
    return compositeKey ? `composite:${compositeKey}` : null;
  }

  /**
   * Create composite key from event attributes
   */
  private createCompositeKey(event: Event): string | null {
    // Only deduplicate certain event types
    const dedupableTypes = ['page_view', 'user_login', 'user_signup'];

    if (!dedupableTypes.includes(event.event)) {
      return null;
    }

    const parts = [
      event.event,
      event.userId || event.anonymousId,
      event.url || '',
      // Round timestamp to nearest second
      Math.floor((event.timestamp || Date.now()) / 1000).toString(),
    ];

    return parts.join('|');
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    this.seenKeys.forEach((timestamp, key) => {
      if (now - timestamp > this.config.windowSizeMs) {
        entriesToDelete.push(key);
      }
    });

    // Remove oldest entries if still over size
    if (entriesToDelete.length < this.seenKeys.size - this.config.maxQueueSize) {
      const sortedEntries = Array.from(this.seenKeys.entries())
        .sort(([, a], [, b]) => a - b)
        .slice(0, this.seenKeys.size - this.config.maxQueueSize);

      sortedEntries.forEach(([key]) => {
        entriesToDelete.push(key);
      });
    }

    entriesToDelete.forEach((key) => this.seenKeys.delete(key));
  }

  /**
   * Get dedup window size
   */
  getWindowSize(): number {
    return this.config.windowSizeMs;
  }

  /**
   * Get number of tracked keys
   */
  getTrackedKeyCount(): number {
    return this.seenKeys.size;
  }

  /**
   * Reset the deduplicator
   */
  reset(): void {
    this.seenKeys.clear();
  }
}

// Global instance
let globalDeduplicator: EventDeduplicator | null = null;

export function getDeduplicator(config?: DedupConfig): EventDeduplicator {
  if (!globalDeduplicator) {
    globalDeduplicator = new EventDeduplicator(config);
  }
  return globalDeduplicator;
}

export function resetDeduplicator(): void {
  globalDeduplicator = null;
}
