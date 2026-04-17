import { EventSchema, EventPayload } from '../types/event';
import { z } from 'zod';

export interface ValidationResult {
  valid: boolean;
  event?: any;
  errors: string[];
}

export function validateEvent(data: unknown): ValidationResult {
  try {
    const startTime = performance.now();

    // Normalize data
    const normalized = normalizeEvent(data as Record<string, unknown>);

    // Validate against schema
    const event = EventSchema.parse(normalized);

    const duration = performance.now() - startTime;
    console.debug(`Event validation completed in ${duration.toFixed(2)}ms`);

    return {
      valid: true,
      event,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return {
        valid: false,
        errors,
      };
    }

    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
    };
  }
}

function normalizeEvent(data: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {
    ...data,
    timestamp: data.timestamp || Date.now(),
  };

  // Ensure required fields
  if (!normalized.event) {
    normalized.event = 'custom';
  }

  // Clean up empty values
  Object.keys(normalized).forEach((key) => {
    if (normalized[key] === undefined || normalized[key] === null) {
      delete normalized[key];
    }
  });

  return normalized;
}

export function validateEventBatch(events: unknown[]): { valid: boolean; events: any[]; errors: Record<number, string[]> } {
  if (!Array.isArray(events)) {
    return {
      valid: false,
      events: [],
      errors: { 0: ['Batch must be an array'] },
    };
  }

  const validEvents = [];
  const errors: Record<number, string[]> = {};

  for (let i = 0; i < events.length; i++) {
    const result = validateEvent(events[i]);
    if (result.valid && result.event) {
      validEvents.push(result.event);
    } else {
      errors[i] = result.errors;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    events: validEvents,
    errors,
  };
}

/**
 * Sanitize event data to prevent injection attacks and remove sensitive data
 */
export function sanitizeEvent(event: any): any {
  const sanitized = { ...event };

  // Remove potentially sensitive fields
  const sensitivePaths = ['password', 'token', 'apiKey', 'secret'];
  sensitivePaths.forEach((path) => {
    if (sanitized[path]) {
      delete sanitized[path];
    }
  });

  // Sanitize custom properties
  if (sanitized.properties && typeof sanitized.properties === 'object') {
    const sanitizedProps: Record<string, unknown> = {};
    Object.entries(sanitized.properties).forEach(([key, value]) => {
      if (!key.toLowerCase().includes('password') && !key.toLowerCase().includes('token')) {
        sanitizedProps[key] = value;
      }
    });
    sanitized.properties = sanitizedProps;
  }

  return sanitized;
}
