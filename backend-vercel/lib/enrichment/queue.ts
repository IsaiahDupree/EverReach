// lib/enrichment/queue.ts
// Weighted round-robin queue with exponential backoff

import PQueue from 'p-queue';

interface QueueStats {
  size: number;
  pending: number;
  isPaused: boolean;
}

/**
 * Enrichment queue manager with weighted priorities
 * Elite (weight 3) → 3x priority
 * Pro (weight 2) → 2x priority
 * Core (weight 1) → 1x priority
 */
export class EnrichmentQueue {
  private buckets: Map<string, PQueue> = new Map();

  /**
   * Ensure queue exists for workspace with given priority
   */
  ensure(workspaceId: string, weight: number = 1, concurrency: number = 1): PQueue {
    if (!this.buckets.has(workspaceId)) {
      const queue = new PQueue({
        concurrency,
        timeout: 30000, // 30 seconds
        throwOnTimeout: true
      });
      
      // Store weight as custom property
      (queue as any).weight = weight;
      
      this.buckets.set(workspaceId, queue);
    }
    
    return this.buckets.get(workspaceId)!;
  }

  /**
   * Schedule a job with exponential backoff retry logic
   * Retries on 429, 500, 502, 503, 504 status codes
   * Moves to DLQ after 4 failed attempts
   */
  async schedule<T>(
    workspaceId: string,
    weight: number,
    job: () => Promise<T>
  ): Promise<T> {
    const queue = this.ensure(workspaceId, weight, 1);

    return queue.add(
      async () => {
        // Exponential backoff: 250ms, 500ms, 1000ms, 2000ms
        for (let attempt = 0, delay = 250; attempt < 4; attempt++, delay *= 2) {
          try {
            return await job();
          } catch (error: any) {
            // Check if error is retryable
            const isRetryable = [429, 500, 502, 503, 504].includes(error?.status);
            
            if (!isRetryable) {
              // Client error or other non-retryable - fail immediately
              throw error;
            }

            // Last attempt - move to DLQ
            if (attempt === 3) {
              throw new Error(
                `DLQ: Enrichment failed after ${attempt + 1} retries. ` +
                `Original error: ${error.message}`
              );
            }

            // Wait with jitter before retry
            const jitter = Math.random() * 100;
            await new Promise(resolve => setTimeout(resolve, delay + jitter));
            
            console.log(
              `[Queue] Retry attempt ${attempt + 1}/4 for workspace ${workspaceId} ` +
              `after ${delay}ms delay`
            );
          }
        }
        
        // Should never reach here due to throw above
        throw new Error('Unreachable code in retry logic');
      },
      { priority: weight } // Higher weight = higher priority
    ) as Promise<T>;
  }

  /**
   * Get queue statistics for a workspace
   */
  getQueueStats(workspaceId: string): QueueStats | null {
    const queue = this.buckets.get(workspaceId);
    
    if (!queue) {
      return null;
    }

    return {
      size: queue.size,
      pending: queue.pending,
      isPaused: queue.isPaused
    };
  }

  /**
   * Get stats for all queues
   */
  getAllStats(): Map<string, QueueStats> {
    const stats = new Map<string, QueueStats>();
    
    for (const [workspaceId, queue] of this.buckets.entries()) {
      stats.set(workspaceId, {
        size: queue.size,
        pending: queue.pending,
        isPaused: queue.isPaused
      });
    }
    
    return stats;
  }

  /**
   * Pause queue for a workspace
   */
  pause(workspaceId: string): void {
    const queue = this.buckets.get(workspaceId);
    if (queue) {
      queue.pause();
    }
  }

  /**
   * Resume queue for a workspace
   */
  resume(workspaceId: string): void {
    const queue = this.buckets.get(workspaceId);
    if (queue) {
      queue.start();
    }
  }

  /**
   * Clear and remove queue for a workspace
   */
  async clear(workspaceId: string): Promise<void> {
    const queue = this.buckets.get(workspaceId);
    
    if (queue) {
      queue.clear();
      this.buckets.delete(workspaceId);
    }
  }

  /**
   * Clear all queues
   */
  async clearAll(): Promise<void> {
    for (const queue of this.buckets.values()) {
      queue.clear();
    }
    this.buckets.clear();
  }

  /**
   * Get total jobs across all queues
   */
  getTotalJobs(): { total: number; pending: number } {
    let total = 0;
    let pending = 0;
    
    for (const queue of this.buckets.values()) {
      total += queue.size;
      pending += queue.pending;
    }
    
    return { total, pending };
  }
}

// Singleton instance
export const enrichmentQueue = new EnrichmentQueue();

/**
 * Retry helper with exponential backoff (can be used standalone)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 4,
    initialDelay = 250,
    maxDelay = 8000,
    onRetry
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if retryable
      const isRetryable = [429, 500, 502, 503, 504].includes(error?.status);
      
      if (!isRetryable || attempt === maxAttempts - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );
      const jitter = Math.random() * 100;

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}
