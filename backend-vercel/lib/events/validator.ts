/**
 * Event validation logic
 */

import { IngestEvent, ValidationError, EventSource, EventCategory } from './types';

const VALID_SOURCES: EventSource[] = [
  'app', 'superwall', 'revenuecat', 'stripe', 'apple', 'google', 'facebook_ads', 'system'
];

const VALID_CATEGORIES: EventCategory[] = [
  'ui', 'paywall', 'billing', 'lifecycle', 'ads', 'error', 'internal'
];

/**
 * Validate a single event
 */
export function validateEvent(event: IngestEvent): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!event.source) {
    errors.push({ field: 'source', message: 'source is required' });
  } else if (!VALID_SOURCES.includes(event.source)) {
    errors.push({ field: 'source', message: `source must be one of: ${VALID_SOURCES.join(', ')}` });
  }

  if (!event.category) {
    errors.push({ field: 'category', message: 'category is required' });
  } else if (!VALID_CATEGORIES.includes(event.category)) {
    errors.push({ field: 'category', message: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }

  if (!event.name) {
    errors.push({ field: 'name', message: 'name is required' });
  } else if (typeof event.name !== 'string' || event.name.length === 0) {
    errors.push({ field: 'name', message: 'name must be a non-empty string' });
  }

  // Optional timestamp validation
  if (event.occurredAt && !isValidISO8601(event.occurredAt)) {
    errors.push({ field: 'occurredAt', message: 'occurredAt must be a valid ISO 8601 timestamp' });
  }

  // Billing validation
  if (event.billing) {
    if (event.billing.amountCents !== undefined && typeof event.billing.amountCents !== 'number') {
      errors.push({ field: 'billing.amountCents', message: 'amountCents must be a number' });
    }
    if (event.billing.amountCents !== undefined && event.billing.amountCents < 0) {
      errors.push({ field: 'billing.amountCents', message: 'amountCents must be non-negative' });
    }
  }

  // UUID validation for user IDs
  if (event.userId && !isValidUUID(event.userId)) {
    errors.push({ field: 'userId', message: 'userId must be a valid UUID' });
  }

  if (event.anonId && !isValidUUID(event.anonId)) {
    errors.push({ field: 'anonId', message: 'anonId must be a valid UUID' });
  }

  return errors;
}

/**
 * Validate batch of events
 */
export function validateBatch(events: IngestEvent[]): {
  valid: boolean;
  errors: Array<{ index: number; errors: ValidationError[] }>;
} {
  if (!Array.isArray(events)) {
    return {
      valid: false,
      errors: [{ index: -1, errors: [{ field: 'events', message: 'events must be an array' }] }]
    };
  }

  if (events.length === 0) {
    return {
      valid: false,
      errors: [{ index: -1, errors: [{ field: 'events', message: 'events array cannot be empty' }] }]
    };
  }

  if (events.length > 100) {
    return {
      valid: false,
      errors: [{ index: -1, errors: [{ field: 'events', message: 'events array cannot exceed 100 items' }] }]
    };
  }

  const batchErrors: Array<{ index: number; errors: ValidationError[] }> = [];

  events.forEach((event, index) => {
    const eventErrors = validateEvent(event);
    if (eventErrors.length > 0) {
      batchErrors.push({ index, errors: eventErrors });
    }
  });

  return {
    valid: batchErrors.length === 0,
    errors: batchErrors
  };
}

/**
 * Check if string is valid ISO 8601 timestamp
 */
function isValidISO8601(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if string is valid UUID
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize event name (lowercase, alphanumeric + underscores only)
 */
export function sanitizeEventName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

/**
 * Validate idempotency key format
 */
export function validateIdempotencyKey(key: string): boolean {
  // Allow alphanumeric, hyphens, underscores, colons
  // Max 255 characters
  return /^[a-zA-Z0-9_:.-]{1,255}$/.test(key);
}
