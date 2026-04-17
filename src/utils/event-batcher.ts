import { EventPayload, BatchEventPayload } from '../types/event';
import { v4 as uuidv4 } from 'uuid';

export interface BatcherConfig {
  maxBatchSize?: number;
  maxWaitMs?: number;
  onBatchReady?: (batch: BatchEventPayload) => Promise<void>;
}

export class EventBatcher {
  private queue: EventPayload[] = [];
  private batchConfig: Required<BatcherConfig>;
  private flushTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(config: BatcherConfig = {}) {
    this.batchConfig = {
      maxBatchSize: config.maxBatchSize ?? 50,
      maxWaitMs: config.maxWaitMs ?? 5000,
      onBatchReady: config.onBatchReady ?? (async () => {}),
    };
  }

  /**
   * Add an event to the batch queue
   */
  addEvent(event: EventPayload): void {
    this.queue.push(event);

    // Flush if batch is full
    if (this.queue.length >= this.batchConfig.maxBatchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      // Start timeout if not already running
      this.flushTimer = setTimeout(() => this.flush(), this.batchConfig.maxWaitMs);
    }
  }

  /**
   * Add multiple events at once
   */
  addEvents(events: EventPayload[]): void {
    events.forEach((event) => this.addEvent(event));
  }

  /**
   * Force flush current batch
   */
  async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    try {
      this.isProcessing = true;

      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }

      const events = this.queue.splice(0, this.batchConfig.maxBatchSize);
      const batch: BatchEventPayload = {
        events,
        batchId: uuidv4(),
        sentAt: Date.now(),
      };

      await this.batchConfig.onBatchReady(batch);

      // Continue flushing if there are more events
      if (this.queue.length > 0) {
        this.flushTimer = setTimeout(() => this.flush(), this.batchConfig.maxWaitMs);
      }
    } catch (error) {
      console.error('Error flushing batch:', error);
      // Re-queue events on error
      if (this.queue.length > 0) {
        this.flushTimer = setTimeout(() => this.flush(), this.batchConfig.maxWaitMs);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue without processing
   */
  clear(): void {
    this.queue = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Destroy the batcher and ensure any pending events are flushed
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    if (this.queue.length > 0) {
      await this.flush();
    }
  }
}

/**
 * Global batcher instance
 */
let globalBatcher: EventBatcher | null = null;

export function getGlobalBatcher(config?: BatcherConfig): EventBatcher {
  if (!globalBatcher) {
    globalBatcher = new EventBatcher(config);
  }
  return globalBatcher;
}

export function resetGlobalBatcher(): void {
  globalBatcher = null;
}
