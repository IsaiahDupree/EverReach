import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'page_view',
  'click',
  'form_submit',
  'user_login',
  'user_signup',
  'purchase',
  'cart_add',
  'cart_remove',
  'video_play',
  'video_pause',
  'scroll',
  'custom',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

export const EventSchema = z.object({
  // Required fields
  event: EventTypeSchema,
  timestamp: z.number().describe('Unix timestamp in milliseconds'),

  // User/Session identification
  userId: z.string().optional().describe('Unique user identifier'),
  sessionId: z.string().optional().describe('Session identifier'),
  anonymousId: z.string().optional().describe('Anonymous user token'),

  // Page/Source context
  url: z.string().url().optional().describe('Current page URL'),
  pageTitle: z.string().optional().describe('Page title'),
  referrer: z.string().optional().describe('HTTP referrer'),

  // Device information
  userAgent: z.string().optional().describe('User agent string'),
  screenWidth: z.number().optional().describe('Viewport width'),
  screenHeight: z.number().optional().describe('Viewport height'),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),

  // Attribution
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  clickId: z.string().optional().describe('Facebook/Google click ID for attribution'),

  // Custom properties - flexible key-value pairs
  properties: z.record(z.unknown()).optional().describe('Custom event properties'),

  // Metadata
  idempotencyKey: z.string().optional().describe('Unique key for deduplication'),
  source: z.enum(['web', 'mobile', 'api', 'webhook']).default('web'),
});

export type Event = z.infer<typeof EventSchema>;

export interface EventPayload extends Omit<Event, 'timestamp'> {
  timestamp?: number;
}

export interface BatchEventPayload {
  events: EventPayload[];
  batchId: string;
  sentAt: number;
}

export const CustomPropertiesSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.unknown()),
    z.record(z.unknown()),
  ])
);

export type CustomProperties = z.infer<typeof CustomPropertiesSchema>;
