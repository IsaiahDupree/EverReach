/**
 * SunTrace Event Capture SDK
 * Main entry point for client-side event tracking
 */

export { EventCapture, getEventCapture, captureEvent, identifyUser, resetEventCapture } from './event-capture';
export type { EventCaptureConfig } from './event-capture';

// Re-export types
export type { Event, EventPayload, BatchEventPayload, EventType, CustomProperties } from '../types/event';
export { EventTypeSchema, EventSchema, CustomPropertiesSchema } from '../types/event';

// Re-export utilities
export { EventBatcher, getGlobalBatcher, resetGlobalBatcher } from '../utils/event-batcher';
export { UserIdentifier, getUserIdentifier, resetUserIdentifier } from '../utils/user-identifier';
export { SessionTracker, getSessionTracker, resetSessionTracker } from '../utils/session-tracker';
export { EventDeduplicator, getDeduplicator, resetDeduplicator } from '../utils/event-dedup';
export { validateEvent, validateEventBatch, sanitizeEvent } from '../utils/event-validator';

export type { UserIdentity } from '../utils/user-identifier';
export type { SessionData, SessionConfig } from '../utils/session-tracker';
export type { ValidationResult } from '../utils/event-validator';
