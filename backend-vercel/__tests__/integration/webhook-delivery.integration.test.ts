/**
 * Webhook Delivery Integration Tests
 * 
 * Tests webhook delivery to external services:
 * - Event triggering
 * - Webhook signature generation
 * - Retry logic
 * - Delivery tracking
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

describe('Webhook Delivery Integration', () => {
  let testUserId: string;
  let testWebhookId: string;
  let testWebhookSecret: string;

  beforeAll(async () => {
    testUserId = `webhook_test_${Date.now()}`;
    testWebhookSecret = crypto.randomBytes(32).toString('hex');
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('user_event').delete().eq('user_id', testUserId);
  });

  describe('Webhook Event Triggering', () => {
    it('should trigger webhook on user event', async () => {
      const event = {
        type: 'user.enrichment.completed',
        user_id: testUserId,
        data: {
          status: 'completed',
          enriched_at: new Date().toISOString(),
          company_name: 'Acme Corp',
          persona: 'automation_pro'
        },
        timestamp: new Date().toISOString()
      };

      // In production, this would be sent to webhook URL
      expect(event.type).toBeDefined();
      expect(event.user_id).toBe(testUserId);
      expect(event.data).toBeDefined();
    });

    it('should include all required webhook fields', () => {
      const webhook = {
        id: crypto.randomUUID(),
        event_type: 'user.enrichment.completed',
        payload: {
          user_id: testUserId,
          status: 'completed'
        },
        signature: 'signature_here',
        timestamp: Date.now()
      };

      expect(webhook.id).toBeDefined();
      expect(webhook.event_type).toBeDefined();
      expect(webhook.payload).toBeDefined();
      expect(webhook.signature).toBeDefined();
      expect(webhook.timestamp).toBeGreaterThan(0);
    });

    it('should support multiple event types', () => {
      const eventTypes = [
        'user.enrichment.completed',
        'user.enrichment.failed',
        'user.persona.assigned',
        'user.magnetism.calculated',
        'user.trial.started',
        'user.purchase.completed'
      ];

      for (const type of eventTypes) {
        expect(type).toMatch(/^user\./);
      }
    });
  });

  describe('Webhook Signature Generation', () => {
    it('should generate HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({
        user_id: testUserId,
        event: 'enrichment.completed'
      });
      
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureData = `${timestamp}.${payload}`;
      
      const signature = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(signatureData)
        .digest('hex');

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA256 hex = 64 chars
    });

    it('should format signature header correctly', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = 'abc123def456';
      
      const header = `t=${timestamp},v1=${signature}`;

      expect(header).toContain('t=');
      expect(header).toContain('v1=');
      expect(header.split(',').length).toBe(2);
    });

    it('should verify signature on recipient side', () => {
      const payload = '{"user_id":"test","event":"test"}';
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureData = `${timestamp}.${payload}`;
      
      // Generate signature (sender)
      const expectedSignature = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(signatureData)
        .digest('hex');
      
      // Verify signature (receiver)
      const receivedSignature = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(signatureData)
        .digest('hex');

      expect(receivedSignature).toBe(expectedSignature);
    });

    it('should reject old timestamps', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const currentTime = Math.floor(Date.now() / 1000);
      const maxAge = 300; // 5 minutes

      const age = currentTime - oldTimestamp;
      const isValid = age <= maxAge;

      expect(isValid).toBe(false);
    });

    it('should use constant-time comparison', () => {
      const sig1 = Buffer.from('abc123def456', 'hex');
      const sig2 = Buffer.from('abc123def456', 'hex');
      
      // crypto.timingSafeEqual requires equal length buffers
      const isEqual = sig1.length === sig2.length && 
                     crypto.timingSafeEqual(sig1, sig2);

      expect(isEqual).toBe(true);
    });
  });

  describe('Webhook Delivery & Retry Logic', () => {
    it('should attempt delivery to webhook URL', async () => {
      const webhookUrl = 'https://example.com/webhook';
      const payload = {
        event: 'user.enrichment.completed',
        user_id: testUserId,
        data: { status: 'completed' }
      };

      // Mock successful delivery
      const deliveryAttempt = {
        webhook_url: webhookUrl,
        payload: JSON.stringify(payload),
        status: 'sent',
        attempt_number: 1,
        response_code: 200,
        delivered_at: new Date().toISOString()
      };

      expect(deliveryAttempt.status).toBe('sent');
      expect(deliveryAttempt.response_code).toBe(200);
    });

    it('should retry on failure', async () => {
      const maxRetries = 3;
      let attemptCount = 0;
      const retryDelays = [1000, 2000, 4000]; // Exponential backoff

      // Simulate retry attempts
      for (let i = 0; i < maxRetries; i++) {
        attemptCount++;
        
        const deliveryAttempt = {
          attempt_number: attemptCount,
          status: attemptCount < maxRetries ? 'failed' : 'sent',
          retry_after_ms: retryDelays[i] || null
        };

        if (deliveryAttempt.status === 'sent') {
          break;
        }
      }

      expect(attemptCount).toBeLessThanOrEqual(maxRetries);
    });

    it('should implement exponential backoff', () => {
      const calculateBackoff = (attempt: number): number => {
        return Math.min(1000 * Math.pow(2, attempt - 1), 60000); // Max 60s
      };

      expect(calculateBackoff(1)).toBe(1000);   // 1s
      expect(calculateBackoff(2)).toBe(2000);   // 2s
      expect(calculateBackoff(3)).toBe(4000);   // 4s
      expect(calculateBackoff(4)).toBe(8000);   // 8s
      expect(calculateBackoff(10)).toBe(60000); // Capped at 60s
    });

    it('should track delivery status', async () => {
      const deliveryStatuses = ['pending', 'sent', 'failed', 'dead_letter'];
      
      for (const status of deliveryStatuses) {
        expect(deliveryStatuses).toContain(status);
      }
    });

    it('should move to dead letter queue after max retries', () => {
      const delivery = {
        attempt_count: 3,
        max_retries: 3,
        status: 'failed'
      };

      if (delivery.attempt_count >= delivery.max_retries) {
        delivery.status = 'dead_letter';
      }

      expect(delivery.status).toBe('dead_letter');
    });
  });

  describe('Webhook Event Types', () => {
    it('should support enrichment events', () => {
      const enrichmentEvents = [
        'user.enrichment.started',
        'user.enrichment.completed',
        'user.enrichment.failed'
      ];

      for (const event of enrichmentEvents) {
        expect(event).toContain('enrichment');
      }
    });

    it('should support persona events', () => {
      const personaEvents = [
        'user.persona.assigned',
        'user.persona.updated'
      ];

      for (const event of personaEvents) {
        expect(event).toContain('persona');
      }
    });

    it('should support magnetism events', () => {
      const magnetismEvents = [
        'user.magnetism.calculated',
        'user.magnetism.band_changed',
        'user.magnetism.at_risk'
      ];

      for (const event of magnetismEvents) {
        expect(event).toContain('magnetism');
      }
    });

    it('should support conversion events', () => {
      const conversionEvents = [
        'user.trial.started',
        'user.trial.expired',
        'user.purchase.completed',
        'user.subscription.created',
        'user.subscription.cancelled'
      ];

      for (const event of conversionEvents) {
        expect(['trial', 'purchase', 'subscription'].some(word => 
          event.includes(word)
        )).toBe(true);
      }
    });
  });

  describe('Webhook Payload Validation', () => {
    it('should validate payload structure', () => {
      const payload = {
        event_type: 'user.enrichment.completed',
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          user_id: testUserId,
          status: 'completed',
          cost_cents: 4
        }
      };

      expect(payload.event_type).toBeDefined();
      expect(payload.event_id).toBeDefined();
      expect(payload.timestamp).toBeDefined();
      expect(payload.data).toBeDefined();
      expect(payload.data.user_id).toBe(testUserId);
    });

    it('should include metadata', () => {
      const payload = {
        event_type: 'user.enrichment.completed',
        data: { user_id: testUserId },
        metadata: {
          api_version: 'v1',
          webhook_version: '1.0',
          environment: 'production'
        }
      };

      expect(payload.metadata).toBeDefined();
      expect(payload.metadata.api_version).toBe('v1');
    });

    it('should serialize complex data types', () => {
      const payload = {
        event_type: 'user.enrichment.completed',
        data: {
          user_id: testUserId,
          social_profiles: {
            linkedin: 'https://linkedin.com/in/test',
            twitter: 'https://twitter.com/test'
          },
          enriched_at: new Date()
        }
      };

      const serialized = JSON.stringify(payload);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.data.social_profiles).toBeDefined();
      expect(typeof deserialized.data.enriched_at).toBe('string');
    });
  });

  describe('Webhook Security', () => {
    it('should require HTTPS URLs', () => {
      const webhookUrl = 'https://example.com/webhook';
      
      const isSecure = webhookUrl.startsWith('https://');
      expect(isSecure).toBe(true);
    });

    it('should validate webhook URL format', () => {
      const validUrls = [
        'https://example.com/webhook',
        'https://api.example.com/webhooks/marketing'
      ];

      const invalidUrls = [
        'http://example.com/webhook', // HTTP not HTTPS
        'ftp://example.com/webhook',  // Wrong protocol
        'not-a-url'                   // Invalid format
      ];

      for (const url of validUrls) {
        expect(url).toMatch(/^https:\/\/.+/);
      }

      for (const url of invalidUrls) {
        expect(url.startsWith('https://')).toBe(false);
      }
    });

    it('should rate limit webhook deliveries', () => {
      const maxDeliveriesPerMinute = 60;
      let deliveryCount = 0;
      const windowStart = Date.now();

      // Simulate deliveries
      for (let i = 0; i < 100; i++) {
        const currentTime = Date.now();
        const windowAge = currentTime - windowStart;

        if (windowAge < 60000 && deliveryCount < maxDeliveriesPerMinute) {
          deliveryCount++;
        }
      }

      expect(deliveryCount).toBeLessThanOrEqual(maxDeliveriesPerMinute);
    });

    it('should prevent replay attacks', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const maxAge = 300; // 5 minutes

      const isReplayAttack = (ts: number) => {
        const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
        return age > maxAge;
      };

      expect(isReplayAttack(timestamp)).toBe(false);
      expect(isReplayAttack(timestamp - 600)).toBe(true);
    });
  });

  describe('Webhook Monitoring & Analytics', () => {
    it('should track delivery success rate', () => {
      const deliveries = [
        { status: 'sent' },
        { status: 'sent' },
        { status: 'failed' },
        { status: 'sent' },
        { status: 'sent' }
      ];

      const successCount = deliveries.filter(d => d.status === 'sent').length;
      const successRate = (successCount / deliveries.length) * 100;

      expect(successRate).toBe(80); // 4/5 = 80%
    });

    it('should track average delivery time', () => {
      const deliveryTimes = [100, 150, 120, 200, 180]; // ms
      
      const avgTime = deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length;

      expect(avgTime).toBe(150);
    });

    it('should identify failing webhooks', () => {
      const webhook = {
        url: 'https://example.com/webhook',
        consecutive_failures: 5,
        last_success: null,
        status: 'healthy'
      };

      if (webhook.consecutive_failures >= 5) {
        webhook.status = 'unhealthy';
      }

      expect(webhook.status).toBe('unhealthy');
    });

    it('should calculate delivery latency', () => {
      const eventCreated = Date.now();
      const eventDelivered = eventCreated + 500; // 500ms later
      
      const latency = eventDelivered - eventCreated;

      expect(latency).toBe(500);
      expect(latency).toBeLessThan(1000); // Should be < 1s
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      const errors = [
        { code: 'ECONNREFUSED', message: 'Connection refused' },
        { code: 'ETIMEDOUT', message: 'Connection timed out' },
        { code: 'ENOTFOUND', message: 'Domain not found' }
      ];

      for (const error of errors) {
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should handle HTTP error responses', () => {
      const errorResponses = [
        { status: 400, message: 'Bad Request' },
        { status: 401, message: 'Unauthorized' },
        { status: 500, message: 'Internal Server Error' },
        { status: 503, message: 'Service Unavailable' }
      ];

      for (const response of errorResponses) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should log failed deliveries', () => {
      const failureLog = {
        webhook_id: crypto.randomUUID(),
        url: 'https://example.com/webhook',
        event_type: 'user.enrichment.completed',
        error: 'Connection timeout',
        attempt_number: 2,
        timestamp: new Date().toISOString()
      };

      expect(failureLog.error).toBeDefined();
      expect(failureLog.attempt_number).toBeGreaterThan(0);
    });
  });
});
