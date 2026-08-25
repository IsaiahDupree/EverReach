import type { SupabaseClient } from '@supabase/supabase-js';

export type OwnedOutcomeEventType = 'install' | 'trial' | 'purchase';

export interface OwnedOutcomeEnqueueInput {
  userId: string;
  eventType: OwnedOutcomeEventType;
  providerEventId: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface OwnedOutcomeEnqueueResult {
  status: string;
  inserted: boolean;
  eventId: string | null;
  missingDimensions: string[];
  rejectionReason: string | null;
  journeyCapturedAt: string | null;
  submittedOccurredAt: string | null;
}

export interface OwnedProviderFactInput {
  provider: 'stripe' | 'revenuecat';
  subjectId: string;
  resolvedUserId?: string | null;
  eventType: 'trial' | 'purchase';
  providerEventId: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface RevenueCatOutcomeSource {
  id?: string;
  type: string;
  period_type?: string;
  transaction_id?: string;
  purchased_at_ms?: number;
  event_timestamp_ms?: number;
  product_id?: string;
  store?: string;
  environment?: string;
  price_in_purchased_currency?: number;
  currency?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RFC3339_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isAttributableUserId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value.trim());
}

function requiredText(value: unknown, field: string, maximum: number): string {
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const text = value.trim();
  if (!text || text.length > maximum) {
    throw new Error(`${field} must be 1 to ${maximum} characters`);
  }
  return text;
}

function timestamp(value: unknown): string {
  const text = requiredText(value, 'occurredAt', 64);
  if (!RFC3339_WITH_ZONE.test(text) || Number.isNaN(Date.parse(text))) {
    throw new Error('occurredAt must be an RFC3339 timestamp with a timezone');
  }
  return text;
}

export async function enqueueOwnedOutcomeForUser(
  supabase: SupabaseClient,
  input: OwnedOutcomeEnqueueInput,
): Promise<OwnedOutcomeEnqueueResult> {
  if (!isAttributableUserId(input.userId)) {
    throw new Error('userId must be a UUID linked to EverReach attribution');
  }
  const providerEventId = requiredText(
    input.providerEventId,
    'providerEventId',
    256,
  );
  const occurredAt = timestamp(input.occurredAt);
  if (!input.metadata || Array.isArray(input.metadata)
    || typeof input.metadata !== 'object') {
    throw new Error('metadata must be an object');
  }

  const { data, error } = await supabase.rpc('enqueue_owned_outcome_event', {
    p_user_id: input.userId,
    p_event_type: input.eventType,
    p_provider_event_id: providerEventId,
    p_occurred_at: occurredAt,
    p_metadata: input.metadata,
  });
  if (error) {
    throw new Error(`owned outcome enqueue failed: ${error.code || 'database_error'}`);
  }
  const result = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  return {
    status: typeof result.outbox_status === 'string'
      ? result.outbox_status
      : 'not_reported',
    inserted: result.outbox_inserted === true,
    eventId: typeof result.outbox_event_id === 'string'
      ? result.outbox_event_id
      : null,
    missingDimensions: Array.isArray(result.missing_dimensions)
      ? result.missing_dimensions.filter(
        (field): field is string => typeof field === 'string',
      )
      : [],
    rejectionReason: typeof result.rejection_reason === 'string'
      ? result.rejection_reason
      : null,
    journeyCapturedAt: typeof result.journey_captured_at === 'string'
      ? result.journey_captured_at
      : null,
    submittedOccurredAt: typeof result.submitted_occurred_at === 'string'
      ? result.submitted_occurred_at
      : null,
  };
}

export async function recordOwnedProviderFact(
  supabase: SupabaseClient,
  input: OwnedProviderFactInput,
): Promise<Record<string, unknown>> {
  const subjectId = requiredText(input.subjectId, 'subjectId', 512);
  const providerEventId = requiredText(
    input.providerEventId,
    'providerEventId',
    256,
  );
  const occurredAt = timestamp(input.occurredAt);
  if (!input.metadata || Array.isArray(input.metadata)
    || typeof input.metadata !== 'object') {
    throw new Error('metadata must be an object');
  }
  const resolvedUserId = input.resolvedUserId
    && isAttributableUserId(input.resolvedUserId)
    ? input.resolvedUserId
    : null;
  const { data, error } = await supabase.rpc('record_owned_provider_fact', {
    p_provider: input.provider,
    p_subject_id: subjectId,
    p_resolved_user_id: resolvedUserId,
    p_event_type: input.eventType,
    p_provider_event_id: providerEventId,
    p_occurred_at: occurredAt,
    p_metadata: input.metadata,
  });
  if (error) {
    throw new Error(`owned provider fact persistence failed: ${error.code || 'database_error'}`);
  }
  return data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : { status: 'not_reported' };
}

export function revenueCatOwnedOutcome(
  event: RevenueCatOutcomeSource,
): Omit<OwnedProviderFactInput, 'provider' | 'subjectId' | 'resolvedUserId'> | null {
  let eventType: 'trial' | 'purchase' | null = null;
  if (event.type === 'INITIAL_PURCHASE') {
    eventType = event.period_type === 'TRIAL' ? 'trial' : 'purchase';
  } else if (event.type === 'NON_RENEWING_PURCHASE' || event.type === 'RENEWAL') {
    eventType = 'purchase';
  }
  if (!eventType) return null;
  const providerEventId = event.transaction_id || event.id;
  const purchasedAtMs = Number(event.purchased_at_ms || event.event_timestamp_ms);
  if (!providerEventId || !Number.isFinite(purchasedAtMs) || purchasedAtMs <= 0) {
    throw new Error('applicable RevenueCat outcome is missing a stable event id or timestamp');
  }
  const occurredAt = new Date(purchasedAtMs).toISOString();
  if (Number.isNaN(Date.parse(occurredAt))) return null;
  return {
    eventType,
    providerEventId,
    occurredAt,
    metadata: {
      producer: 'revenuecat_webhook',
      provider_event_type: event.type,
      period_type: event.period_type || null,
      product_id: event.product_id || null,
      store: event.store || null,
      environment: event.environment || null,
      amount: event.price_in_purchased_currency ?? null,
      currency: event.currency || null,
    },
  };
}
