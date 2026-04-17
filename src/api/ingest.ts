/**
 * Event ingestion API endpoint
 */

import { EventPayload, BatchEventPayload } from '../types/event';
import { validateEvent, validateEventBatch } from '../utils/event-validator';
import { storeBatch, storeEvent } from './event-storage';

export async function handleEventIngest(body: unknown): Promise<{ success: boolean; message: string; trackingId?: string; errors?: Record<number, string[]> }> {
  try {
    // Handle batch events
    if (Array.isArray(body)) {
      return handleBatchIngest(body);
    }

    // Handle single event
    const event = body as EventPayload;
    const validation = validateEvent(event);

    if (!validation.valid || !validation.event) {
      return {
        success: false,
        message: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    const result = await storeEvent(validation.event);

    return {
      success: result.success,
      message: result.success ? 'Event stored successfully' : `Storage error: ${result.error}`,
      trackingId: `event_${Date.now()}`,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    return {
      success: false,
      message: `Ingestion error: ${err.message}`,
    };
  }
}

async function handleBatchIngest(events: any[]): Promise<{ success: boolean; message: string; trackingId?: string; errors?: Record<number, string[]> }> {
  try {
    const validation = validateEventBatch(events);

    if (!validation.valid) {
      return {
        success: false,
        message: 'Batch validation failed',
        errors: validation.errors,
      };
    }

    if (validation.events.length === 0) {
      return {
        success: false,
        message: 'No valid events in batch',
      };
    }

    const batch: BatchEventPayload = {
      events: validation.events.map((e) => ({
        ...e,
        timestamp: e.timestamp || Date.now(),
      })),
      batchId: `batch_${Date.now()}`,
      sentAt: Date.now(),
    };

    const result = await storeBatch(batch);

    return {
      success: result.success,
      message: result.success ? `Batch stored successfully (${result.count} events)` : `Storage error: ${result.error}`,
      trackingId: batch.batchId,
      errors: validation.valid ? undefined : validation.errors,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    return {
      success: false,
      message: `Batch ingestion error: ${err.message}`,
    };
  }
}

/**
 * Format HTTP response for event ingestion
 */
export function formatIngestResponse(result: { success: boolean; message: string; trackingId?: string; errors?: Record<number, string[]> }) {
  const statusCode = result.success ? 200 : 400;
  return {
    statusCode,
    body: JSON.stringify({
      success: result.success,
      message: result.message,
      trackingId: result.trackingId,
      errors: result.errors,
    }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  };
}
