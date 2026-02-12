/**
 * Analytics Emitter Registry
 *
 * Fans out normalized RevenueCat events to all registered emitters.
 * Each emitter runs independently — one failure does not block others.
 */

import type { Emitter, NormalizedRcEvent } from './base';
import { metaCAPIEmitter } from './meta-capi';

// Register all emitters here
const emitters: Emitter[] = [
  metaCAPIEmitter,
  // Add future emitters here (PostHog server-side, Slack alerts, etc.)
];

/**
 * Fan out a normalized RevenueCat event to all registered emitters.
 * Errors are logged and swallowed so one emitter can't break the pipeline.
 */
export async function emitAll(event: NormalizedRcEvent): Promise<void> {
  const results = await Promise.allSettled(
    emitters.map(async (emitter) => {
      try {
        await emitter.emit(event);
      } catch (error: any) {
        console.error(`[Emitters] ${emitter.name} failed:`, error?.message || error);
        throw error; // Re-throw so allSettled captures it as rejected
      }
    })
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn(`[Emitters] ${failures.length}/${emitters.length} emitter(s) failed for event ${event.kind}`);
  }
}

export type { NormalizedRcEvent } from './base';
