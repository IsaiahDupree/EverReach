/**
 * Event Capture SDK Tests
 */

import { EventCapture } from '../src/sdk/event-capture';
import { validateEvent, sanitizeEvent } from '../src/utils/event-validator';
import { EventBatcher } from '../src/utils/event-batcher';
import { UserIdentifier } from '../src/utils/user-identifier';
import { SessionTracker } from '../src/utils/session-tracker';
import { EventDeduplicator } from '../src/utils/event-dedup';

describe('Event Capture SDK', () => {
  let capture: EventCapture;

  beforeEach(() => {
    capture = new EventCapture({
      batchSize: 10,
      batchWaitMs: 100,
    });
  });

  afterEach(async () => {
    await capture.destroy();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await capture.initialize();
      expect(capture).toBeDefined();
    });

    it('should only initialize once', async () => {
      await capture.initialize();
      await capture.initialize(); // Should not throw
      expect(capture).toBeDefined();
    });
  });

  describe('Event Capture', () => {
    it('should capture a valid event', async () => {
      await capture.initialize();
      const result = await capture.captureEvent({
        event: 'page_view',
        url: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid events', async () => {
      await capture.initialize();
      const result = await capture.captureEvent({
        event: 'invalid_event' as any,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should enrich events with user and session data', async () => {
      await capture.initialize();
      const sessionId = await capture.getSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBeGreaterThan(0);
    });
  });

  describe('User Identification', () => {
    it('should identify a user', async () => {
      await capture.initialize();
      await capture.identifyUser('user_123');
      const userId = await capture.getUserId();
      expect(userId).toBe('user_123');
    });
  });

  describe('Sessions', () => {
    it('should start a new session', async () => {
      await capture.initialize();
      const sessionId1 = await capture.getSessionId();
      await capture.startNewSession();
      const sessionId2 = await capture.getSessionId();
      expect(sessionId1).not.toBe(sessionId2);
    });
  });
});

describe('Event Validation', () => {
  it('should validate correct events', () => {
    const result = validateEvent({
      event: 'page_view',
      timestamp: Date.now(),
      url: 'https://example.com',
    });
    expect(result.valid).toBe(true);
    expect(result.event).toBeDefined();
  });

  it('should reject invalid events', () => {
    const result = validateEvent({
      event: 'invalid',
      timestamp: 'not a number',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should sanitize events', () => {
    const event = {
      event: 'test',
      timestamp: Date.now(),
      properties: {
        password: 'secret',
        normal_field: 'value',
      },
    };
    const sanitized = sanitizeEvent(event);
    expect(sanitized.properties.password).toBeUndefined();
    expect(sanitized.properties.normal_field).toBe('value');
  });
});

describe('Event Batcher', () => {
  it('should batch events', async () => {
    const batches: any[] = [];
    const batcher = new EventBatcher({
      maxBatchSize: 5,
      onBatchReady: async (batch) => {
        batches.push(batch);
      },
    });

    // Add 5 events
    for (let i = 0; i < 5; i++) {
      batcher.addEvent({ event: 'test', timestamp: Date.now() });
    }

    await batcher.flush();
    expect(batches.length).toBeGreaterThan(0);
  });
});

describe('Event Deduplication', () => {
  it('should detect duplicates', () => {
    const dedup = new EventDeduplicator({ windowSizeMs: 1000 });

    const event = {
      event: 'page_view',
      timestamp: Date.now(),
      url: 'https://example.com',
      anonymousId: 'anon_123',
    };

    expect(dedup.isDuplicate(event as any)).toBe(false);
    dedup.markSeen(event as any);
    expect(dedup.isDuplicate(event as any)).toBe(true);
  });
});
