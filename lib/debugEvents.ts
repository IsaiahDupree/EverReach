// lib/debugEvents.ts
// Lightweight test-mode event capture for E2E assertions across web/iOS/Android

export type DebugEvent = {
  event: string;
  ts: string;
  props?: Record<string, any>;
};

const MAX_EVENTS = 100;
const listeners = new Set<(events: DebugEvent[]) => void>();
const events: DebugEvent[] = [];

export function addDebugEvent(e: DebugEvent) {
  events.push(e);
  if (events.length > MAX_EVENTS) events.shift();
  listeners.forEach((fn) => {
    try { fn([...events]); } catch {}
  });
}

export function getDebugEvents() {
  return [...events];
}

export function subscribeDebugEvents(fn: (events: DebugEvent[]) => void) {
  listeners.add(fn);
  // Emit initial snapshot
  try { fn([...events]); } catch {}
  return () => {
    // Ensure cleanup returns void
    try { listeners.delete(fn); } catch {}
  };
}
